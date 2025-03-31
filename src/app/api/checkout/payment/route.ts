import { NextResponse } from 'next/server';
import { createPayment } from '@/lib/square/orders';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { sourceId, orderId, amount } = await request.json();
    
    // Validate inputs
    if (!sourceId || !orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    if (!order.squareOrderId) {
      return NextResponse.json(
        { error: 'Order not linked to Square' },
        { status: 400 }
      );
    }
    
    // Process payment with Square
    const payment = await createPayment(sourceId, order.squareOrderId, amount);
    
    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING'
      }
    });
    
    return NextResponse.json({
      success: true,
      paymentId: payment.id
    });
  } catch (error: Error | unknown) {
    console.error('Payment processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Payment processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
