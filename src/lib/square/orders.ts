// src/lib/square/orders.ts

import { randomUUID } from 'crypto';
import { getSquareService } from './service';
import { logger } from '../../utils/logger';

export interface CreateOrderRequest {
  locationId: string;
  lineItems: Array<{
    quantity: string;
    catalogObjectId: string;
    modifiers?: Array<{ catalogObjectId: string; quantity?: string }>;
  }>;
}

export interface CreatePaymentRequest {
  sourceId: string;
  orderId: string;
  amountCents: number;
}

/**
 * Creates a Square order
 * @param orderData Order data including location and line items
 * @returns The created order
 */
export async function createOrder(orderData: CreateOrderRequest) {
  try {
    logger.info('Creating Square order', { locationId: orderData.locationId, itemCount: orderData.lineItems.length });
    
    // Get Square service instance
    const squareService = getSquareService();

    // Create order request object for Square
    const orderRequest = {
      order: {
        locationId: orderData.locationId,
        lineItems: orderData.lineItems,
      },
      idempotencyKey: randomUUID(),
    };

    const result = await squareService.createOrder(orderRequest);

    if (!result.order) {
      throw new Error('Failed to create order or order data is missing in the response.');
    }
    
    logger.info('Successfully created Square order', { orderId: result.order.id });
    return result.order;
  } catch (error) {
    logger.error('Error creating Square order:', error);
    if (error instanceof Error && 'body' in error) {
      logger.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw error;
  }
}

/**
 * Creates a payment for an order
 * @param sourceId Payment source ID
 * @param orderId Order ID to associate with payment
 * @param amountCents Amount in cents
 * @returns The created payment
 */
export async function createPayment(sourceId: string, orderId: string, amountCents: number) {
  try {
    logger.info('Creating Square payment', { orderId, amountCents });
    
    // Get Square service instance
    const squareService = getSquareService();

    // Create payment request object for Square
    const paymentRequest = {
      sourceId: sourceId,
      orderId: orderId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
    };

    const result = await squareService.createPayment(paymentRequest);

    if (!result.payment) {
      throw new Error('Failed to create payment or payment data is missing in the response.');
    }
    
    logger.info('Successfully created Square payment', { paymentId: result.payment.id });
    return result.payment;
  } catch (error) {
    logger.error('Error processing payment:', error);
    if (error instanceof Error && 'body' in error) {
      logger.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw error;
  }
}
