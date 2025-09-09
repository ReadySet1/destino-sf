import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { updateOrderPayment } from '@/app/actions/orders';
import { revalidatePath } from 'next/cache';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * PUT /api/admin/orders/[orderId]/payment-status
 * 
 * Manually update payment status for a specific order.
 * This is useful when webhooks fail to sync payment status.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { paymentStatus, squareOrderId, notes } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      return NextResponse.json({ 
        error: 'Valid payment status is required (PENDING, PAID, FAILED, REFUNDED)' 
      }, { status: 400 });
    }

    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        total: true,
        customerName: true,
        email: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Log the current state
    console.log(`📋 Manual payment status update requested for order ${orderId}:`, {
      currentStatus: order.paymentStatus,
      requestedStatus: paymentStatus,
      currentSquareOrderId: order.squareOrderId,
      requestedSquareOrderId: squareOrderId,
      requestedBy: user.id,
    });

    let updatedOrder;

    try {
      // Use the existing updateOrderPayment function if we have a Square order ID and setting to PAID
      if (paymentStatus === 'PAID' && (squareOrderId || order.squareOrderId)) {
        const orderIdToUse = squareOrderId || order.squareOrderId;
        const updateNotes = notes || `Payment status manually updated to ${paymentStatus} by admin (${user.id})`;
        
        updatedOrder = await updateOrderPayment(
          orderId,
          orderIdToUse,
          paymentStatus,
          updateNotes
        );
      } else {
        // Direct database update for other statuses or when no Square order ID
        const updateData: {
          paymentStatus: PaymentStatus;
          squareOrderId?: string;
          notes?: string;
          status?: OrderStatus;
          updatedAt: Date;
        } = {
          paymentStatus: paymentStatus as PaymentStatus,
          updatedAt: new Date(),
        };

        // Update Square order ID if provided
        if (squareOrderId) {
          updateData.squareOrderId = squareOrderId;
        }

        // Add notes
        if (notes) {
          updateData.notes = notes;
        } else {
          updateData.notes = `Payment status manually updated to ${paymentStatus} by admin (${user.id})`;
        }

        // Update order status based on payment status
        if (paymentStatus === 'PAID' && order.status === 'PENDING') {
          updateData.status = OrderStatus.PROCESSING;
        } else if (paymentStatus === 'FAILED') {
          updateData.status = OrderStatus.CANCELLED;
        }

        updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: updateData,
        });
      }

      // Revalidate relevant paths
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath('/orders');
      revalidatePath(`/orders/${orderId}`);

      console.log(`✅ Successfully updated payment status for order ${orderId}:`, {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        squareOrderId: updatedOrder.squareOrderId,
        updatedAt: updatedOrder.updatedAt,
      });

      return NextResponse.json({
        success: true,
        message: `Payment status updated to ${paymentStatus}`,
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          squareOrderId: updatedOrder.squareOrderId,
          updatedAt: updatedOrder.updatedAt,
        },
      });

    } catch (updateError: any) {
      console.error(`❌ Error updating payment status for order ${orderId}:`, updateError);
      return NextResponse.json({ 
        error: updateError.message || 'Failed to update payment status' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Error in payment status update endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/orders/[orderId]/payment-status
 * 
 * Get current payment status for debugging
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        total: true,
        customerName: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        payments: {
          select: {
            id: true,
            squarePaymentId: true,
            amount: true,
            status: true,
            createdAt: true,
          }
        }
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        total: order.total.toNumber(),
        payments: order.payments.map(payment => ({
          ...payment,
          amount: payment.amount.toNumber(),
        }))
      },
    });

  } catch (error: any) {
    console.error('❌ Error getting payment status:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
