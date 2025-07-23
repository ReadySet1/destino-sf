import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus, Prisma } from '@prisma/client';
import { sendOrderConfirmationEmail } from '@/lib/email';

// Define the valid payment methods
type ManualPaymentMethod = 'CASH';

export async function POST(request: Request) {
  try {
    const { orderId, paymentMethod } = await request.json();

    // Validate inputs
    if (!orderId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate payment method
    if (paymentMethod !== 'CASH') {
      return NextResponse.json(
        { error: 'Invalid payment method. Only CASH is supported for manual payments.' },
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

    // Create update data object with the correct typing
    const updateData: Prisma.OrderUpdateInput = {
      status: paymentMethod === 'CASH' ? OrderStatus.PENDING : OrderStatus.PROCESSING,
      paymentStatus: 'PENDING' as const,
    };

    // Update order payment method and status using raw query
    // First update the standard fields
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Then update the payment method with raw SQL
    await prisma.$executeRaw`
      UPDATE "orders" 
      SET "paymentMethod" = ${paymentMethod}::"PaymentMethod"
      WHERE "id" = ${orderId}::uuid
    `;

    // Try to send confirmation email
    try {
      await sendOrderConfirmationEmail({
        ...updatedOrder,
        paymentMethod: paymentMethod as ManualPaymentMethod,
      });
      console.log(`Order confirmation email sent for order ${orderId}`);
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Continue processing even if email fails - don't let email errors fail the checkout
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
      },
    });
  } catch (error: Error | unknown) {
    console.error('Manual checkout processing error:', error);

    return NextResponse.json(
      {
        error: 'Checkout processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
