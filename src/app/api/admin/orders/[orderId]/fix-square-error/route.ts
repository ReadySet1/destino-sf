// src/app/api/admin/orders/[orderId]/fix-square-error/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import { PaymentStatus, OrderStatus } from '@prisma/client';

/**
 * POST endpoint to fix Square order errors by clearing corrupted data and allowing retry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Check authentication and admin role
    const authResult = await verifyAdminAccess();
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    console.log(`🔧 Admin ${authResult.user?.id} attempting to fix Square error for order ${orderId}`);

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        squareOrderId: true,
        paymentUrl: true,
        paymentUrlExpiresAt: true,
        total: true,
        customerName: true,
        email: true,
        notes: true,
        rawData: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if this order has issues that need fixing
    const hasPaymentIssue = order.paymentStatus === PaymentStatus.PENDING || order.paymentStatus === 'FAILED';
    const hasStatusIssue = order.status === 'PROCESSING' && order.paymentStatus === 'PENDING'; // Wrong status for unpaid orders
    
    if (!hasPaymentIssue && !hasStatusIssue) {
      return NextResponse.json(
        { error: 'Order does not have payment or status issues that need fixing' },
        { status: 400 }
      );
    }

    // Clear potentially corrupted Square data
    const updateData = {
      squareOrderId: null, // Clear the problematic Square order ID
      paymentUrl: null, // Clear the old payment URL
      paymentUrlExpiresAt: null, // Clear expiration
      paymentStatus: PaymentStatus.PENDING, // Reset to pending
      status: OrderStatus.PENDING, // Reset order status
      notes: order.notes 
        ? `${order.notes}\n\n[${new Date().toISOString()}] Admin fixed Square error - cleared corrupted order data and corrected status for payment retry`
        : `[${new Date().toISOString()}] Admin fixed Square error - cleared corrupted order data and corrected status for payment retry`,
      // Clear potentially problematic rawData
      rawData: {
        ...(order.rawData && typeof order.rawData === 'object' ? order.rawData : {}),
        squareErrorFixed: true,
        squareErrorFixedAt: new Date().toISOString(),
        squareErrorFixedBy: authResult.user?.id,
        originalSquareOrderId: order.squareOrderId,
      },
      updatedAt: new Date(),
    };

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    console.log(`✅ Successfully fixed Square error for order ${orderId}. Cleared Square order ID: ${order.squareOrderId}`);

    return NextResponse.json({
      success: true,
      message: 'Square error fixed successfully. Customer can now retry payment.',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        squareOrderId: updatedOrder.squareOrderId,
        canRetryPayment: true,
      },
      actions: [
        'The corrupted Square order data has been cleared',
        'Order status corrected from PROCESSING to PENDING (awaiting payment)',
        'Customer can now retry payment through the checkout process',
        'A new Square order will be created on retry',
        'All order items and customer information have been preserved',
      ],
    });

  } catch (error) {
    console.error('Failed to fix Square error for order:', error);

    // Handle specific Prisma errors
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while fixing Square error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if an order needs Square error fixing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Check authentication and admin role
    const authResult = await verifyAdminAccess();
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        squareOrderId: true,
        paymentUrl: true,
        paymentUrlExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Determine if this order needs fixing
    const needsFixing = 
      order.paymentStatus === PaymentStatus.PENDING &&
      order.squareOrderId &&
      (!order.paymentUrl || (order.paymentUrlExpiresAt && order.paymentUrlExpiresAt < new Date()));

    const squareErrorDetected = 
      order.notes?.includes('Square API Error') ||
      order.notes?.includes('payment provider error') ||
      order.notes?.includes('INVALID_VALUE');

    const statusIssueDetected = 
      order.status === 'PROCESSING' && order.paymentStatus === 'PENDING'; // Wrong status for unpaid orders

    return NextResponse.json({
      orderId: order.id,
      needsFixing: needsFixing || squareErrorDetected || statusIssueDetected,
      squareErrorDetected,
      statusIssueDetected,
      currentStatus: {
        order: order.status,
        payment: order.paymentStatus,
        hasSquareOrderId: !!order.squareOrderId,
        hasValidPaymentUrl: !!(order.paymentUrl && order.paymentUrlExpiresAt && order.paymentUrlExpiresAt > new Date()),
      },
      recommendations: (needsFixing || squareErrorDetected || statusIssueDetected) ? [
        ...(statusIssueDetected ? ['Order status is PROCESSING but payment is still PENDING (incorrect status mapping)'] : []),
        ...(squareErrorDetected ? ['This order appears to have a Square payment error'] : []),
        ...(needsFixing ? ['Order has corrupted payment data'] : []),
        'Use the POST endpoint to clear corrupted data and fix status',
        'Customer will then be able to retry payment',
      ] : [
        'Order does not appear to need Square error fixing',
      ],
    });

  } catch (error) {
    console.error('Failed to check Square error status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
