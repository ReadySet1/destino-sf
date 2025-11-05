// src/lib/square/orders.ts

import { randomUUID } from 'crypto';
import { getSquareService } from './service';
import { logger } from '../../utils/logger';
import { withTimeout, TimeoutError } from '@/lib/utils/http-timeout';

/**
 * Timeout configuration for Square Orders API
 * DES-60 Phase 3: Network & Timeout Resilience
 */
const SQUARE_ORDER_TIMEOUT = 30000; // 30 seconds for order creation
const SQUARE_PAYMENT_TIMEOUT = 30000; // 30 seconds for payment processing

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
    logger.info('Creating Square order', {
      locationId: orderData.locationId,
      itemCount: orderData.lineItems.length,
    });

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

    // DES-60 Phase 3: Wrap Square SDK call with timeout protection
    const result = await withTimeout(
      squareService.createOrder(orderRequest),
      SQUARE_ORDER_TIMEOUT,
      `Square order creation timed out after ${SQUARE_ORDER_TIMEOUT}ms`,
      'squareCreateOrder'
    );

    if (!result.order) {
      throw new Error('Failed to create order or order data is missing in the response.');
    }

    logger.info('Successfully created Square order', { orderId: result.order.id });
    return result.order;
  } catch (error) {
    // DES-60 Phase 3: Enhanced error handling for timeout errors
    if (error instanceof TimeoutError) {
      logger.error('Square order creation timed out:', {
        operation: error.operationName,
        timeout: error.timeoutMs,
        locationId: orderData.locationId,
        itemCount: orderData.lineItems.length,
      });
      throw new Error(`Order creation timed out after ${error.timeoutMs}ms. Please try again.`);
    }

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
    // CRITICAL FIX: Add autocomplete to finalize the order
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      // CRITICAL: These fields link payment to order AND trigger auto-completion
      orderId: orderId,
      autocomplete: true, // This automatically transitions order from DRAFT to OPEN/COMPLETED
    };

    // DES-60 Phase 3: Wrap Square SDK call with timeout protection
    const result = await withTimeout(
      squareService.createPayment(paymentRequest),
      SQUARE_PAYMENT_TIMEOUT,
      `Square payment processing timed out after ${SQUARE_PAYMENT_TIMEOUT}ms`,
      'squareCreatePayment'
    );

    if (!result.payment) {
      throw new Error('Failed to create payment or payment data is missing in the response.');
    }

    logger.info('Successfully created Square payment and finalized order', {
      paymentId: result.payment.id,
      orderStatus: result.payment.order?.state, // Should now be OPEN/COMPLETED
    });

    return result.payment;
  } catch (error) {
    // DES-60 Phase 3: Enhanced error handling for timeout errors
    if (error instanceof TimeoutError) {
      logger.error('Square payment processing timed out:', {
        operation: error.operationName,
        timeout: error.timeoutMs,
        orderId,
        amountCents,
      });
      throw new Error(`Payment processing timed out after ${error.timeoutMs}ms. Please try again.`);
    }

    logger.error('Error processing payment:', error);
    if (error instanceof Error && 'body' in error) {
      logger.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw error;
  }
}
