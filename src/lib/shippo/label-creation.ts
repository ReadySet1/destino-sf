import { prisma } from '@/lib/db';
import { ShippoClientManager } from '@/lib/shippo/client';
import { getShippingRates } from '@/lib/shipping';
import { OrderStatus } from '@prisma/client';
import { 
  ShippingLabelResponse, 
  ShippoError, 
  isRateExpiredError, 
  createShippoError, 
  DEFAULT_RETRY_CONFIG 
} from '@/types/shippo';

export interface LabelCreationJob {
  orderId: string;
  rateId: string;
  attempt: number;
  lastError?: string;
  createdAt: Date;
}

/**
 * Centralized label creation queue for handling retry jobs
 */
class LabelCreationQueue {
  private static instance: LabelCreationQueue;
  private pendingJobs = new Map<string, LabelCreationJob>();
  
  public static getInstance(): LabelCreationQueue {
    if (!LabelCreationQueue.instance) {
      LabelCreationQueue.instance = new LabelCreationQueue();
    }
    return LabelCreationQueue.instance;
  }

  /**
   * Add a job to the retry queue
   */
  addJob(orderId: string, rateId: string, attempt: number = 0, lastError?: string): void {
    const job: LabelCreationJob = {
      orderId,
      rateId,
      attempt,
      lastError,
      createdAt: new Date(),
    };
    
    this.pendingJobs.set(orderId, job);
    console.log(`📋 Added label creation job for order ${orderId} (attempt ${attempt + 1})`);
  }

  /**
   * Remove a job from the queue (on success or final failure)
   */
  removeJob(orderId: string): void {
    this.pendingJobs.delete(orderId);
    console.log(`🗑️ Removed label creation job for order ${orderId}`);
  }

  /**
   * Get a pending job
   */
  getJob(orderId: string): LabelCreationJob | undefined {
    return this.pendingJobs.get(orderId);
  }

  /**
   * Get all pending jobs
   */
  getAllJobs(): LabelCreationJob[] {
    return Array.from(this.pendingJobs.values());
  }

  /**
   * Process all pending jobs with exponential backoff
   */
  async processJobs(): Promise<void> {
    const jobs = this.getAllJobs();
    console.log(`🔄 Processing ${jobs.length} pending label creation jobs`);

    for (const job of jobs) {
      try {
        const result = await this.processJob(job);
        if (result.success) {
          this.removeJob(job.orderId);
        } else if (job.attempt >= DEFAULT_RETRY_CONFIG.maxAttempts - 1) {
          console.error(`❌ Job for order ${job.orderId} failed after ${job.attempt + 1} attempts`);
          this.removeJob(job.orderId);
        } else {
          // Update job with incremented attempt
          this.addJob(job.orderId, job.rateId, job.attempt + 1, result.error);
        }
      } catch (error) {
        console.error(`❌ Error processing job for order ${job.orderId}:`, error);
      }

      // Add delay between jobs to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: LabelCreationJob): Promise<ShippingLabelResponse> {
    console.log(`🚀 Processing label creation job for order ${job.orderId}, attempt ${job.attempt + 1}`);
    
    // Check if enough time has passed for retry (exponential backoff)
    const timeSinceCreated = Date.now() - job.createdAt.getTime();
    const requiredDelay = Math.min(
      DEFAULT_RETRY_CONFIG.baseDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, job.attempt),
      DEFAULT_RETRY_CONFIG.maxDelay
    );

    if (timeSinceCreated < requiredDelay) {
      console.log(`⏳ Job for order ${job.orderId} needs to wait ${requiredDelay - timeSinceCreated}ms more`);
      return {
        success: false,
        error: 'Waiting for retry delay',
        errorCode: 'RETRY_DELAY',
      };
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: job.orderId },
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
        throw new Error(`Order not found: ${job.orderId}`);
      }

      return await attemptLabelCreation(order, job.rateId, job.attempt);
    } catch (error) {
      const shippoError = createShippoError(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: shippoError.type,
        retryAttempt: job.attempt + 1,
      };
    }
  }
}

/**
 * Attempt to create a label with the given rate
 */
async function attemptLabelCreation(
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
          labelUrl: transaction.labelUrl,
          labelCreatedAt: new Date(),
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
    
    // Re-throw error for queue processing
    throw error;
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
    return await attemptLabelCreation(order, rateId, retryAttempt + 1);
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
 * Queue a label creation job for later processing
 */
export function queueLabelCreation(orderId: string, rateId: string): void {
  const queue = LabelCreationQueue.getInstance();
  queue.addJob(orderId, rateId, 0);
}

/**
 * Process all pending label creation jobs
 */
export async function processLabelCreationQueue(): Promise<void> {
  const queue = LabelCreationQueue.getInstance();
  await queue.processJobs();
}

/**
 * Get statistics about the label creation queue
 */
export function getLabelCreationQueueStats(): { 
  pendingJobs: number; 
  jobs: LabelCreationJob[] 
} {
  const queue = LabelCreationQueue.getInstance();
  const jobs = queue.getAllJobs();
  
  return {
    pendingJobs: jobs.length,
    jobs,
  };
}

// Export the queue instance for direct access if needed
export const labelCreationQueue = LabelCreationQueue.getInstance();
