'use server';

import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import { getShippingRates } from '@/lib/shipping';
import { ShippoClientManager } from '@/lib/shippo/client';
import {
  ShippingLabelResponse,
  ShippoError,
  isRateExpiredError,
  createShippoError,
  DEFAULT_RETRY_CONFIG,
} from '@/types/shippo';
import {
  acquireLabelLease,
  releaseLabelLease,
  forceReleaseLabelLease,
} from '@/lib/concurrency/label-lease';

/**
 * Enhanced label purchase with automatic retry and rate refresh
 */
export async function purchaseShippingLabel(
  orderId: string,
  shippoRateId: string,
  options?: { forceMode?: boolean }
): Promise<ShippingLabelResponse> {
  const forceMode = options?.forceMode ?? false;
  console.log(`🚀 Starting label purchase for Order ID: ${orderId} with Rate ID: ${shippoRateId}${forceMode ? ' (FORCE MODE)' : ''}`);

  try {
    // Get current order and check retry count
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Check if we've exceeded retry limit
    if (order.retryCount >= DEFAULT_RETRY_CONFIG.maxAttempts) {
      const error: ShippoError = {
        type: 'RETRY_EXHAUSTED',
        attempts: order.retryCount,
        lastError: 'Maximum retry attempts exceeded',
      };

      return {
        success: false,
        error: `Maximum retry attempts (${DEFAULT_RETRY_CONFIG.maxAttempts}) exceeded for order ${orderId}`,
        errorCode: 'RETRY_EXHAUSTED',
        retryAttempt: order.retryCount,
      };
    }

    return await attemptLabelPurchase(order, shippoRateId, order.retryCount, forceMode);
  } catch (error) {
    console.error(`❌ Error in purchaseShippingLabel for Order ID: ${orderId}:`, error);
    const shippoError = createShippoError(error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: shippoError.type,
    };
  }
}

/**
 * Attempt label purchase with lease-based locking to prevent race conditions.
 *
 * Uses application-level leases that auto-expire, avoiding "ghost locks" when
 * serverless functions timeout but database connections don't close.
 *
 * Flow:
 * 1. Acquire lease (atomic UPDATE, no blocking transaction)
 * 2. Call Shippo API (with timeout)
 * 3. Save result and release lease
 */
async function attemptLabelPurchase(
  order: any,
  shippoRateId: string,
  retryAttempt: number = 0,
  forceMode: boolean = false
): Promise<ShippingLabelResponse> {
  const orderId = order.id;
  let lockId: string | null = null;

  try {
    console.log(`🔄 Attempt ${retryAttempt + 1} for Order ID: ${orderId}${forceMode ? ' (FORCE MODE)' : ''}`);

    // Validate rate ID before attempting any operations
    if (!shippoRateId || shippoRateId === 'undefined' || shippoRateId === 'NO_ID_FOUND') {
      throw new Error(
        `Invalid rate ID: ${shippoRateId}. Cannot create transaction with undefined rate.`
      );
    }

    // ========================================
    // STEP 1: Acquire lease (non-blocking)
    // ========================================
    const lease = await acquireLabelLease(orderId, 60); // 60 second lease

    if (!lease.acquired) {
      if (lease.reason === 'already_has_label') {
        // Order already has a label - fetch and return it
        const existingOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: { trackingNumber: true, labelUrl: true },
        });

        console.log(`⏭️ [LABEL-LEASE] Order ${orderId} already has tracking: ${existingOrder?.trackingNumber}`);
        return {
          success: true,
          labelUrl: existingOrder?.labelUrl || undefined,
          trackingNumber: existingOrder?.trackingNumber || undefined,
          retryAttempt,
        };
      }

      if (lease.reason === 'already_locked') {
        console.log(
          `⏸️ [LABEL-LEASE] Order ${orderId} is locked by process ${lease.holder}, expires at ${lease.expiresAt}`
        );
        return {
          success: false,
          blockedByConcurrent: true,
          error: `Label creation in progress by another process. Lease expires at ${lease.expiresAt?.toISOString() || 'unknown'}.`,
          errorCode: 'CONCURRENT_PROCESSING',
          retryAttempt,
        };
      }

      // order_not_found or other error
      return {
        success: false,
        error: `Cannot acquire lease: ${lease.reason}`,
        errorCode: 'LEASE_ERROR',
        retryAttempt,
      };
    }

    lockId = lease.lockId;
    console.log(`✅ [LABEL-LEASE] Acquired lease ${lockId} for order ${orderId}`);

    // ========================================
    // STEP 2: Call Shippo API
    // ========================================
    const shippo = ShippoClientManager.getInstance();

    console.log(`📦 Creating Shippo transaction for Order ID: ${orderId}`);

    // Add timeout to prevent indefinite hanging on Shippo API calls
    const SHIPPO_API_TIMEOUT = 30000; // 30 seconds

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Shippo API call timed out after 30 seconds')),
        SHIPPO_API_TIMEOUT
      )
    );

    const transaction = await Promise.race([
      shippo.transactions.create({
        rate: shippoRateId,
        labelFileType: 'PDF_4x6',
        async: false,
        metadata: `order_id=${orderId}_attempt_${retryAttempt + 1}`,
      }),
      timeoutPromise,
    ]);

    // Log comprehensive Shippo response for debugging
    console.log(`📋 Transaction FULL response for Order ID ${orderId}:`, JSON.stringify({
      status: transaction.status,
      objectState: transaction.objectState,
      labelUrl: transaction.labelUrl,
      trackingNumber: transaction.trackingNumber,
      messages: transaction.messages,
      eta: transaction.eta,
      test: transaction.test,
      rate: transaction.rate,
      trackingStatus: transaction.trackingStatus,
    }, null, 2));

    // ========================================
    // STEP 3: Save result and release lease
    // ========================================
    if (transaction.status === 'SUCCESS' && transaction.labelUrl && transaction.trackingNumber) {
      console.log(`✅ Label purchased successfully for Order ID: ${orderId}`);

      // Save the label data
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber: transaction.trackingNumber,
          labelUrl: transaction.labelUrl,
          labelCreatedAt: new Date(),
          status: OrderStatus.SHIPPING,
          retryCount: retryAttempt + 1,
          lastRetryAt: new Date(),
          // Clear the lease
          labelLockHolder: null,
          labelLockExpiresAt: null,
        },
      });

      // Log the label URL prominently so it can be accessed
      console.log(`🏷️ LABEL CREATED FOR ORDER ${orderId}:`);
      console.log(`📄 PDF URL: ${transaction.labelUrl}`);
      console.log(`📦 TRACKING: ${transaction.trackingNumber}`);

      return {
        success: true,
        labelUrl: transaction.labelUrl,
        trackingNumber: transaction.trackingNumber,
        retryAttempt: retryAttempt + 1,
      };
    } else {
      // Handle transaction failure - extract detailed error messages
      const errorMessages = transaction.messages?.map((m: any) =>
        `[${m.source || 'unknown'}] ${m.text || m.code || 'No message'}`
      ).join('; ') || 'No error details';

      const errorMessage = `Transaction status: ${transaction.status}. ${errorMessages}`;

      console.error(`❌ Label creation failed for Order ID: ${orderId}: ${errorMessage}`);
      console.error(`❌ Full transaction object:`, JSON.stringify(transaction, null, 2));

      // Release lease before attempting rate refresh
      if (lockId) {
        await releaseLabelLease(orderId, lockId);
        lockId = null;
      }

      // Check if this is a rate expiration issue
      const isRateIssue = errorMessages.toLowerCase().includes('rate') ||
                          errorMessages.toLowerCase().includes('expired') ||
                          errorMessages.toLowerCase().includes('invalid') ||
                          transaction.status === 'ERROR';

      if (isRateIssue) {
        console.log(`🔄 Detected possible rate issue for Order ${orderId}, attempting rate refresh...`);
        return await handleRateExpiration(order, retryAttempt);
      }

      // Update retry tracking safely
      try {
        await updateRetryTracking(orderId, retryAttempt, errorMessage);
      } catch (updateError) {
        console.error(`Failed to update retry tracking for order ${orderId}:`, updateError);
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: 'SHIPPO_TRANSACTION_FAILED',
        retryAttempt: retryAttempt + 1,
      };
    }
  } catch (error: any) {
    console.log(`⚠️ Attempt ${retryAttempt + 1} failed for Order ID: ${orderId}:`, error.message);

    // Release lease on error
    if (lockId) {
      await releaseLabelLease(orderId, lockId);
      lockId = null;
    }

    // Check if this is a rate expiration error or invalid input (undefined rate)
    if (isRateExpiredError(error) || error.message.includes('Input validation failed')) {
      console.log(`🔄 Rate expired/invalid for Order ID: ${orderId}, attempting refresh...`);
      return await handleRateExpiration(order, retryAttempt);
    }

    // Check if we should retry for other errors
    if (retryAttempt < DEFAULT_RETRY_CONFIG.maxAttempts - 1) {
      const delay = calculateRetryDelay(retryAttempt);
      console.log(`⏳ Retrying Order ID: ${orderId} in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return await attemptLabelPurchase(order, shippoRateId, retryAttempt + 1);
    }

    // Final failure
    const shippoError = createShippoError(error);
    await updateRetryTracking(orderId, retryAttempt + 1, error.message);

    return {
      success: false,
      error: error.message,
      errorCode: shippoError.type,
      retryAttempt: retryAttempt + 1,
    };
  } finally {
    // Ensure lease is released if still held
    if (lockId) {
      await releaseLabelLease(orderId, lockId);
    }
  }
}

/**
 * Handle rate expiration by refreshing rates and retrying
 */
async function handleRateExpiration(
  order: any,
  retryAttempt: number
): Promise<ShippingLabelResponse> {
  const orderId = order.id;

  // Check if we've exceeded rate refresh attempts to prevent infinite loops
  if (retryAttempt >= DEFAULT_RETRY_CONFIG.maxAttempts) {
    console.error(
      `❌ Rate refresh limit exceeded for Order ID: ${orderId} after ${retryAttempt} attempts`
    );
    return {
      success: false,
      error: `Maximum rate refresh attempts (${DEFAULT_RETRY_CONFIG.maxAttempts}) exceeded for order ${orderId}`,
      errorCode: 'RATE_REFRESH_EXHAUSTED',
      retryAttempt: retryAttempt,
    };
  }

  try {
    console.log(
      `🔄 Refreshing rates for Order ID: ${orderId} (attempt ${retryAttempt + 1}/${DEFAULT_RETRY_CONFIG.maxAttempts})...`
    );

    // Extract shipping information from order
    const { cartItems, shippingAddress } = extractOrderShippingInfo(order);

    // Get fresh shipping rates
    const ratesResponse = await getShippingRates({
      cartItems,
      shippingAddress,
    });

    if (!ratesResponse.success || !ratesResponse.rates || ratesResponse.rates.length === 0) {
      throw new Error('Failed to refresh shipping rates');
    }

    console.log(`✅ Retrieved ${ratesResponse.rates.length} fresh rates for Order ID: ${orderId}`);

    // Find best matching rate
    const bestRate = findBestMatchingRate(ratesResponse.rates, order.shippingCarrier);

    console.log(`🔍 [DEBUG] Rate structure:`, JSON.stringify(bestRate, null, 2));
    console.log(`🔍 [DEBUG] Available rate properties:`, Object.keys(bestRate || {}));
    console.log(
      `🎯 Selected rate: ${bestRate?.id || bestRate?.object_id || 'NO_ID_FOUND'} (${bestRate?.carrier} - ${bestRate?.name || bestRate?.servicename})`
    );

    // Get the correct rate ID
    const rateId = bestRate?.id || bestRate?.object_id;
    if (!rateId) {
      console.error(`❌ [ERROR] No valid rate ID found in bestRate:`, bestRate);
      throw new Error(
        `Selected rate has no valid ID. Available properties: ${Object.keys(bestRate || {}).join(', ')}`
      );
    }

    // Update order with new rate ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingRateId: rateId,
      },
    });

    // Retry with new rate
    return await attemptLabelPurchase(order, rateId, retryAttempt + 1);
  } catch (error) {
    console.error(`❌ Rate refresh failed for Order ID: ${orderId}:`, error);
    const shippoError = createShippoError(error);

    return {
      success: false,
      error: `Rate refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: shippoError.type,
      retryAttempt: retryAttempt + 1,
    };
  }
}

/**
 * Update retry tracking in database
 */
async function updateRetryTracking(
  orderId: string,
  retryCount: number,
  errorMessage?: string
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      retryCount,
      lastRetryAt: new Date(),
      ...(errorMessage && { shippingLabelError: errorMessage }),
    },
  });
}

/**
 * Calculate exponential backoff delay
 */
function calculateRetryDelay(retryAttempt: number): number {
  const delay = Math.min(
    DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, retryAttempt),
    DEFAULT_RETRY_CONFIG.maxDelay
  );
  return delay;
}

/**
 * Extract shipping information from order
 */
function extractOrderShippingInfo(order: any): { cartItems: any[]; shippingAddress: any } {
  // Extract cart items
  const cartItems = order.items.map((item: any) => ({
    id: item.product.squareId,
    name: item.product.name,
    price: Number(item.product.price),
    quantity: item.quantity,
    weight: 1.0, // Default weight
  }));

  console.log(`🔍 [DEBUG] Extracting shipping info for order ${order.id}`);
  console.log(`🔍 [DEBUG] Order fulfillmentType: ${order.fulfillmentType}`);
  console.log(`🔍 [DEBUG] Order notes: ${order.notes}`);
  console.log(`🔍 [DEBUG] RawData structure:`, JSON.stringify(order.rawData, null, 2));

  const rawData = order.rawData as any;
  let shippingAddress: any;

  // Method 1: Extract from Square fulfillment data (newest pattern)
  if (rawData?.fulfillment?.shipment_details?.recipient) {
    console.log(`✅ [DEBUG] Found shipping address in fulfillment.shipment_details.recipient`);
    const recipient = rawData.fulfillment.shipment_details.recipient;
    shippingAddress = {
      name: recipient.display_name || order.customerName,
      street1: recipient.address?.address_line_1 || '',
      street2: recipient.address?.address_line_2 || '',
      city: recipient.address?.locality || '',
      state: recipient.address?.administrative_district_level_1 || '',
      postalCode: recipient.address?.postal_code || '',
      country: recipient.address?.country || 'US',
      phone: recipient.phone_number || order.phone,
      email: order.email,
    };
  }
  // Method 2: Extract from Square fulfillment delivery_details (alternative pattern)
  else if (rawData?.fulfillment?.delivery_details?.recipient) {
    console.log(`✅ [DEBUG] Found shipping address in fulfillment.delivery_details.recipient`);
    const recipient = rawData.fulfillment.delivery_details.recipient;
    shippingAddress = {
      name: recipient.display_name || order.customerName,
      street1: recipient.address?.address_line_1 || '',
      street2: recipient.address?.address_line_2 || '',
      city: recipient.address?.locality || '',
      state: recipient.address?.administrative_district_level_1 || '',
      postalCode: recipient.address?.postal_code || '',
      country: recipient.address?.country || 'US',
      phone: recipient.phone_number || order.phone,
      email: order.email,
    };
  }
  // Method 3: Extract from order notes (legacy pattern)
  else if (order.notes) {
    console.log(`🔍 [DEBUG] Attempting to extract shipping address from notes`);
    try {
      const parsedNotes = JSON.parse(order.notes);
      if (parsedNotes.deliveryAddress) {
        console.log(`✅ [DEBUG] Found shipping address in notes.deliveryAddress`);
        const address = parsedNotes.deliveryAddress;
        shippingAddress = {
          name: address.recipientName || order.customerName,
          street1: address.street || address.street1 || '',
          street2: address.street2 || '',
          city: address.city || '',
          state: address.state || '',
          postalCode: address.postalCode || address.zip || '',
          country: address.country || 'US',
          phone: order.phone,
          email: order.email,
        };
      } else if (parsedNotes.shippingAddress) {
        console.log(`✅ [DEBUG] Found shipping address in notes.shippingAddress`);
        const address = parsedNotes.shippingAddress;
        shippingAddress = {
          name: address.recipientName || address.name || order.customerName,
          street1: address.street || address.street1 || '',
          street2: address.street2 || '',
          city: address.city || '',
          state: address.state || '',
          postalCode: address.postalCode || address.zip || '',
          country: address.country || 'US',
          phone: address.phone || order.phone,
          email: address.email || order.email,
        };
      }
    } catch (parseError) {
      console.log(`⚠️ [DEBUG] Failed to parse notes as JSON:`, parseError);
    }
  }

  // Method 4: Try to extract from other rawData patterns
  if (!shippingAddress && rawData) {
    console.log(`🔍 [DEBUG] Searching for alternative patterns in rawData`);

    // Check for direct address in rawData
    if (rawData.address) {
      console.log(`✅ [DEBUG] Found address in rawData.address`);
      shippingAddress = {
        name: rawData.recipientName || order.customerName,
        street1: rawData.address.street || rawData.address.address_line_1 || '',
        street2: rawData.address.street2 || rawData.address.address_line_2 || '',
        city: rawData.address.city || rawData.address.locality || '',
        state: rawData.address.state || rawData.address.administrative_district_level_1 || '',
        postalCode: rawData.address.postalCode || rawData.address.postal_code || '',
        country: rawData.address.country || 'US',
        phone: rawData.phone || order.phone,
        email: order.email,
      };
    }
    // Check for recipient in rawData
    else if (rawData.recipient) {
      console.log(`✅ [DEBUG] Found recipient in rawData.recipient`);
      const recipient = rawData.recipient;
      shippingAddress = {
        name: recipient.display_name || recipient.name || order.customerName,
        street1: recipient.address?.address_line_1 || recipient.address?.street || '',
        street2: recipient.address?.address_line_2 || recipient.address?.street2 || '',
        city: recipient.address?.locality || recipient.address?.city || '',
        state: recipient.address?.administrative_district_level_1 || recipient.address?.state || '',
        postalCode: recipient.address?.postal_code || recipient.address?.postalCode || '',
        country: recipient.address?.country || 'US',
        phone: recipient.phone_number || recipient.phone || order.phone,
        email: order.email,
      };
    }
  }

  if (!shippingAddress) {
    console.error(`❌ [ERROR] Unable to extract shipping address from order ${order.id}`);
    console.error(`❌ [ERROR] Available order data keys:`, Object.keys(order));
    console.error(`❌ [ERROR] RawData keys:`, order.rawData ? Object.keys(order.rawData) : 'null');
    throw new Error(
      `Unable to extract shipping address from order ${order.id}. Please check order data structure.`
    );
  }

  console.log(`✅ [DEBUG] Successfully extracted shipping address:`, shippingAddress);
  return { cartItems, shippingAddress };
}

/**
 * Find the best matching rate based on original carrier preference
 */
function findBestMatchingRate(rates: any[], originalCarrier?: string): any {
  if (!rates || rates.length === 0) {
    throw new Error('No rates available');
  }

  // If we have an original carrier preference, try to match it
  if (originalCarrier) {
    const matchingRate = rates.find(
      rate => rate.carrier.toLowerCase() === originalCarrier.toLowerCase()
    );
    if (matchingRate) {
      return matchingRate;
    }
  }

  // Default to first rate (usually the cheapest)
  return rates[0];
}

/**
 * Server action to refresh and retry label creation
 */
export async function refreshAndRetryLabel(orderId: string): Promise<ShippingLabelResponse> {
  console.log(`🔄 Manual refresh and retry for Order ID: ${orderId}`);

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Reset retry count for manual retry
    await prisma.order.update({
      where: { id: orderId },
      data: {
        retryCount: 0,
        lastRetryAt: new Date(),
      },
    });

    // Start fresh attempt
    return await handleRateExpiration(order, 0);
  } catch (error) {
    console.error(`❌ Error in refreshAndRetryLabel for Order ID: ${orderId}:`, error);
    const shippoError = createShippoError(error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: shippoError.type,
    };
  }
}

/**
 * Validate Shippo connection
 */
export async function validateShippoConnection(): Promise<{
  connected: boolean;
  version: string;
  error?: string;
}> {
  try {
    return await ShippoClientManager.validateConnection();
  } catch (error) {
    return {
      connected: false,
      version: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown connection error',
    };
  }
}

/**
 * Reset shipping rate for an order (useful when carrier issues occur)
 */
export async function resetOrderShippingRate(
  orderId: string,
  preferredCarrier: string = 'USPS'
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingRateId: null,
        shippingCarrier: preferredCarrier,
        retryCount: 0,
        lastRetryAt: null,
      },
    });

    return {
      success: true,
      message: `Order ${orderId} shipping rate reset successfully. Carrier set to ${preferredCarrier}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Force retry label purchase - force releases any existing lease and attempts label creation
 * Use this when the label creation is stuck due to a timeout or failed attempt
 *
 * This force-releases any existing lease (even if not expired) before attempting,
 * ensuring we can bypass a stuck process.
 */
export async function forceRetryLabelPurchase(
  orderId: string,
  shippoRateId: string
): Promise<ShippingLabelResponse> {
  console.log(`🔄 Force retry initiated for order ${orderId} - releasing any existing lease`);

  try {
    // Force release any existing lease
    await forceReleaseLabelLease(orderId);
    console.log(`✅ Force released lease for order ${orderId}`);
  } catch (error) {
    console.error(`⚠️ Error force releasing lease (continuing anyway):`, error);
  }

  // Now attempt label purchase - the lease should be clear
  return await purchaseShippingLabel(orderId, shippoRateId, { forceMode: true });
}

/**
 * Admin action to release a stuck label lock without attempting purchase
 * Use this to clear a lock when you don't want to immediately retry
 */
export async function releaseLabelLock(orderId: string): Promise<{ success: boolean; message: string }> {
  console.log(`🔓 Admin releasing label lock for order ${orderId}`);

  try {
    await forceReleaseLabelLease(orderId);
    return {
      success: true,
      message: `Successfully released label lock for order ${orderId}`,
    };
  } catch (error) {
    console.error(`❌ Error releasing label lock:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
