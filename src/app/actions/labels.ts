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
  DEFAULT_RETRY_CONFIG 
} from '@/types/shippo';

/**
 * Enhanced label purchase with automatic retry and rate refresh
 */
export async function purchaseShippingLabel(
  orderId: string,
  shippoRateId: string
): Promise<ShippingLabelResponse> {
  console.log(
    `🚀 Starting label purchase for Order ID: ${orderId} with Rate ID: ${shippoRateId}`
  );

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

    return await attemptLabelPurchase(order, shippoRateId, order.retryCount);
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
 * Attempt label purchase with optimized transaction handling
 */
async function attemptLabelPurchase(
  order: any,
  shippoRateId: string,
  retryAttempt: number = 0
): Promise<ShippingLabelResponse> {
  const orderId = order.id;
  
  try {
    console.log(`🔄 Attempt ${retryAttempt + 1} for Order ID: ${orderId}`);
    
    // Check if label creation is already in progress or completed
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        trackingNumber: true, 
        labelUrl: true,
        updatedAt: true,
        status: true 
      }
    });

    if (!currentOrder) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Prevent concurrent operations - if already has label
    if (currentOrder.trackingNumber) {
      return {
        success: true,
        labelUrl: currentOrder.labelUrl || undefined,
        trackingNumber: currentOrder.trackingNumber,
        retryAttempt: retryAttempt,
      };
    }

    // Prevent concurrent operations - if updated very recently (within 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (currentOrder.updatedAt > twoMinutesAgo && currentOrder.status === 'PROCESSING') {
      console.log(`⏳ Order ${orderId} was recently updated, skipping to prevent concurrent processing`);
      return {
        success: false,
        error: 'Label creation already in progress. Please wait before retrying.',
        errorCode: 'CONCURRENT_PROCESSING',
        retryAttempt: retryAttempt,
      };
    }
    
    // Get Shippo client
    const shippo = ShippoClientManager.getInstance();
    
    // Validate rate ID before attempting transaction
    if (!shippoRateId || shippoRateId === 'undefined' || shippoRateId === 'NO_ID_FOUND') {
      throw new Error(`Invalid rate ID: ${shippoRateId}. Cannot create transaction with undefined rate.`);
    }

    // Call Shippo API FIRST (no database lock held during external API call)
    console.log(`📦 Creating Shippo transaction for Order ID: ${orderId}`);
    const transaction = await shippo.transactions.create({
      rate: shippoRateId,
      labelFileType: 'PDF_4x6',
      async: false,
      metadata: `order_id=${orderId}_attempt_${retryAttempt + 1}`,
    });

    console.log(`📋 Transaction result for Order ID ${orderId}:`, {
      status: transaction.status,
      hasLabel: !!transaction.labelUrl,
      hasTracking: !!transaction.trackingNumber,
    });

    // Check for success
    if (transaction.status === 'SUCCESS' && transaction.labelUrl && transaction.trackingNumber) {
      console.log(`✅ Label purchased successfully for Order ID: ${orderId}`);

      // QUICK database update (minimal lock time - external API call already completed)
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber: transaction.trackingNumber,
          labelUrl: transaction.labelUrl,
          labelCreatedAt: new Date(),
          status: OrderStatus.SHIPPING,
          retryCount: retryAttempt + 1,
          lastRetryAt: new Date(),
        },
      });

      // Log the label URL prominently so it can be accessed
      console.log(`🏷️ LABEL CREATED FOR ORDER ${orderId}:`);
      console.log(`📄 PDF URL: ${transaction.labelUrl}`);
      console.log(`📦 TRACKING: ${transaction.trackingNumber}`);
      console.log(`🔗 Direct Link: ${transaction.labelUrl}`);

      return {
        success: true,
        labelUrl: transaction.labelUrl,
        trackingNumber: transaction.trackingNumber,
        retryAttempt: retryAttempt + 1,
      };
    } else {
      // Handle transaction failure - update retry count without throwing
      const errorMessage = transaction.messages?.map((m: any) => m.text).join(', ') || 
                          `Transaction failed with status: ${transaction.status}`;
      
      // Update retry tracking safely
      try {
        await updateRetryTracking(orderId, retryAttempt);
      } catch (updateError) {
        console.error(`Failed to update retry tracking for order ${orderId}:`, updateError);
      }
      
      console.error(`❌ Label creation failed for Order ID: ${orderId}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        errorCode: 'SHIPPO_TRANSACTION_FAILED',
        retryAttempt: retryAttempt + 1,
      };
    }
  } catch (error: any) {
    console.log(`⚠️ Attempt ${retryAttempt + 1} failed for Order ID: ${orderId}:`, error.message);
    
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
  }
}

/**
 * Handle rate expiration by refreshing rates and retrying
 */
async function handleRateExpiration(order: any, retryAttempt: number): Promise<ShippingLabelResponse> {
  const orderId = order.id;
  
  // Check if we've exceeded rate refresh attempts to prevent infinite loops
  if (retryAttempt >= DEFAULT_RETRY_CONFIG.maxAttempts) {
    console.error(`❌ Rate refresh limit exceeded for Order ID: ${orderId} after ${retryAttempt} attempts`);
    return {
      success: false,
      error: `Maximum rate refresh attempts (${DEFAULT_RETRY_CONFIG.maxAttempts}) exceeded for order ${orderId}`,
      errorCode: 'RATE_REFRESH_EXHAUSTED',
      retryAttempt: retryAttempt,
    };
  }
  
  try {
    console.log(`🔄 Refreshing rates for Order ID: ${orderId} (attempt ${retryAttempt + 1}/${DEFAULT_RETRY_CONFIG.maxAttempts})...`);
    
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
    console.log(`🎯 Selected rate: ${bestRate?.id || bestRate?.object_id || 'NO_ID_FOUND'} (${bestRate?.carrier} - ${bestRate?.name || bestRate?.servicename})`);

    // Get the correct rate ID
    const rateId = bestRate?.id || bestRate?.object_id;
    if (!rateId) {
      console.error(`❌ [ERROR] No valid rate ID found in bestRate:`, bestRate);
      throw new Error(`Selected rate has no valid ID. Available properties: ${Object.keys(bestRate || {}).join(', ')}`);
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
async function updateRetryTracking(orderId: string, retryCount: number, errorMessage?: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      retryCount,
      lastRetryAt: new Date(),
      ...(errorMessage && { notes: `Last error: ${errorMessage}` }),
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
function extractOrderShippingInfo(order: any): { cartItems: any[], shippingAddress: any } {
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
    throw new Error(`Unable to extract shipping address from order ${order.id}. Please check order data structure.`);
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
export async function validateShippoConnection(): Promise<{ connected: boolean; version: string; error?: string }> {
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