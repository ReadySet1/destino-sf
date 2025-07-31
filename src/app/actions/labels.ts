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
 * Attempt label purchase with retry logic
 */
async function attemptLabelPurchase(
  order: any,
  shippoRateId: string,
  retryAttempt: number = 0
): Promise<ShippingLabelResponse> {
  const orderId = order.id;
  
  try {
    console.log(`🔄 Attempt ${retryAttempt + 1} for Order ID: ${orderId}`);
    
    // Get Shippo client
    const shippo = ShippoClientManager.getInstance();
    
    // Update retry tracking
    await updateRetryTracking(orderId, retryAttempt);

    // Attempt transaction creation
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

      // Update order with success
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber: transaction.trackingNumber,
          status: OrderStatus.SHIPPING,
          retryCount: retryAttempt + 1,
          lastRetryAt: new Date(),
        },
      });

      return {
        success: true,
        labelUrl: transaction.labelUrl,
        trackingNumber: transaction.trackingNumber,
        retryAttempt: retryAttempt + 1,
      };
    } else {
      // Handle transaction failure
      const errorMessage = transaction.messages?.map((m: any) => m.text).join(', ') || 
                          `Transaction failed with status: ${transaction.status}`;
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.log(`⚠️ Attempt ${retryAttempt + 1} failed for Order ID: ${orderId}:`, error.message);
    
    // Check if this is a rate expiration error
    if (isRateExpiredError(error)) {
      console.log(`🔄 Rate expired for Order ID: ${orderId}, attempting refresh...`);
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
  
  try {
    console.log(`🔄 Refreshing rates for Order ID: ${orderId}...`);
    
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
    
    console.log(`🎯 Selected rate: ${bestRate.id} (${bestRate.carrier} - ${bestRate.name})`);

    // Update order with new rate ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingRateId: bestRate.id,
      },
    });

    // Retry with new rate
    return await attemptLabelPurchase(order, bestRate.id, retryAttempt + 1);
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

  // Extract shipping address from order's rawData
  const rawData = order.rawData as any;
  let shippingAddress: any;

  if (rawData?.fulfillment?.shipment_details?.recipient) {
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
  } else {
    throw new Error(`Unable to extract shipping address from order ${order.id}`);
  }

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