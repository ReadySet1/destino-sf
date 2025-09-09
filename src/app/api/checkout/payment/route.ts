import { NextResponse } from 'next/server';
import { createPayment } from '@/lib/square/orders';
import { prisma } from '@/lib/db';
import { applyStrictRateLimit } from '@/middleware/rate-limit';
import { getSquareService } from '@/lib/square/service';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
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

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.squareOrderId) {
      return NextResponse.json({ error: 'Order not linked to Square' }, { status: 400 });
    }

    // Validate payment amount against order total (prevent overpayment)
    const orderTotal = Number(order.total);
    if (amount > orderTotal * 1.1) {
      // Allow 10% buffer for tips/fees
      return NextResponse.json(
        {
          error: 'Payment amount exceeds order total',
        },
        { status: 400 }
      );
    }

    // Process payment with Square
    const payment = await createPayment(sourceId, order.squareOrderId, amount);

    // NEW: Ensure order is finalized in Square (fallback if autocomplete doesn't work)
    if (payment.status === 'COMPLETED' || payment.status === 'APPROVED') {
      // Update order state in Square to OPEN (makes it visible)
      await finalizeSquareOrder(order.squareOrderId);
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING',
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
    });
  } catch (error: Error | unknown) {
    console.error('Payment processing error:', error);

    return NextResponse.json(
      {
        error: 'Payment processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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
    console.log(`✅ Square order ${squareOrderId} finalized and visible`);
  } catch (error) {
    console.error(`Failed to finalize Square order ${squareOrderId}:`, error);
    // Don't throw - payment succeeded, this is a secondary operation
  }
}
