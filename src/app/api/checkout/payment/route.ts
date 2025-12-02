import { NextResponse } from 'next/server';
import { createPayment } from '@/lib/square/orders';
import { prisma, withRetry } from '@/lib/db-unified';
import { applyStrictRateLimit } from '@/middleware/rate-limit';
import { getSquareService } from '@/lib/square/service';
import { randomUUID } from 'crypto';
import { withValidation } from '@/middleware/api-validator';
import {
  CreatePaymentRequestSchema,
  CreatePaymentResponseSchema,
} from '@/lib/api/schemas/checkout';
import { ApiErrorSchema } from '@/lib/api/schemas/common';
// DES-60 Phase 4: Pessimistic locking for payment processing
import { withRowLock, LockAcquisitionError } from '@/lib/concurrency/pessimistic-lock';
import { Order } from '@prisma/client';

// DES-81: Increase function timeout for database connection resilience
export const maxDuration = 60;

async function postPaymentHandler(request: Request) {
  // Apply strict rate limiting for payment endpoint (5 requests per minute per IP)
  const rateLimitResponse = await applyStrictRateLimit(request as any, 5);
  if (rateLimitResponse) {
    console.warn('Payment rate limit exceeded');
    return rateLimitResponse;
  }

  try {
    const { sourceId, orderId, amount } = await request.json();

    // Validate inputs
    if (!sourceId || !orderId || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          error: 'Invalid amount: must be a positive number',
        },
        { status: 400 }
      );
    }

    // Additional input sanitization
    if (typeof sourceId !== 'string' || sourceId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid payment source ID',
        },
        { status: 400 }
      );
    }

    if (typeof orderId !== 'string' || orderId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid order ID',
        },
        { status: 400 }
      );
    }

    // DES-60 Phase 4: Lock the order row to prevent concurrent payment processing
    const result = await withRowLock<Order, { success: boolean; paymentId: string }>(
      'orders',
      orderId,
      async lockedOrder => {
        // Validate order exists and has Square order ID
        if (!lockedOrder.squareOrderId) {
          throw new Error('Order not linked to Square');
        }

        // DES-60 Phase 4: Prevent double payment - check if order already processed
        if (lockedOrder.status !== 'PENDING') {
          throw new Error(
            `Order cannot be processed: current status is ${lockedOrder.status}. ` +
              'Payment may have already been processed.'
          );
        }

        if (lockedOrder.paymentStatus === 'PAID' || lockedOrder.paymentStatus === 'COMPLETED') {
          throw new Error('Payment has already been completed for this order');
        }

        // Validate payment amount against order total (prevent overpayment)
        const orderTotal = Number(lockedOrder.total);
        if (amount > orderTotal * 1.1) {
          // Allow 10% buffer for tips/fees
          throw new Error('Payment amount exceeds order total');
        }

        // Process payment with Square (this is idempotent via Square's idempotency key)
        const payment = await createPayment(sourceId, lockedOrder.squareOrderId, amount);

        // Ensure order is finalized in Square (fallback if autocomplete doesn't work)
        if (payment.status === 'COMPLETED' || payment.status === 'APPROVED') {
          await finalizeSquareOrder(lockedOrder.squareOrderId);
        }

        // Update order status within the transaction
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'PROCESSING',
            paymentStatus: 'PAID',
          },
        });

        return {
          success: true,
          paymentId: payment.id,
        };
      },
      {
        timeout: 30000, // 30 second timeout for payment processing
        noWait: true, // Fail immediately if another payment is in progress
      }
    );

    return NextResponse.json(result);
  } catch (error: Error | unknown) {
    console.error('Payment processing error:', error);

    // DES-60 Phase 4: Handle lock acquisition errors
    if (error instanceof LockAcquisitionError) {
      if (error.reason === 'timeout') {
        return NextResponse.json(
          {
            error: 'Payment is already being processed',
            message:
              'Another payment request is currently being processed for this order. Please wait a moment and try again.',
          },
          { status: 409 } // 409 Conflict
        );
      }

      if (error.reason === 'not_found') {
        return NextResponse.json(
          {
            error: 'Order not found',
            message: 'The order could not be found.',
          },
          { status: 404 }
        );
      }
    }

    // Handle specific error messages from business logic
    if (error instanceof Error) {
      if (error.message.includes('Order not linked to Square')) {
        return NextResponse.json(
          {
            error: 'Order not linked to Square',
            message: 'The order is not properly linked to Square. Please contact support.',
          },
          { status: 400 }
        );
      }

      if (error.message.includes('already been completed')) {
        return NextResponse.json(
          {
            error: 'Payment already completed',
            message: 'This order has already been paid.',
          },
          { status: 409 }
        );
      }

      if (error.message.includes('Order cannot be processed')) {
        return NextResponse.json(
          {
            error: 'Invalid order status',
            message: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Payment processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Export POST handler with validation middleware
export const POST = withValidation(
  postPaymentHandler,
  {
    request: {
      body: CreatePaymentRequestSchema,
    },
    response: {
      200: CreatePaymentResponseSchema,
      400: ApiErrorSchema,
      404: ApiErrorSchema,
      500: ApiErrorSchema,
    },
  },
  { mode: 'warn' } // Start with warn mode
);

/**
 * Fallback function to finalize Square order if autocomplete doesn't work
 */
async function finalizeSquareOrder(squareOrderId: string): Promise<void> {
  try {
    const squareService = getSquareService();

    // Update order to OPEN state
    const updateRequest = {
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        state: 'OPEN',
        version: undefined, // Let Square handle versioning
      },
      fieldsToClear: [],
      idempotencyKey: randomUUID(),
    };

    await squareService.updateOrder(squareOrderId, updateRequest);
  } catch (error) {
    console.error(`Failed to finalize Square order ${squareOrderId}:`, error);
    // Don't throw - payment succeeded, this is a secondary operation
  }
}
