import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { updateOrderPayment } from '@/app/actions';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get the webhook payload
    const body = await request.json();
    logger.info('Received Square webhook', { eventType: body.type });
    
    // Verify this is a payment-related event
    if (body.type === 'payment.updated') {
      const data = body.data.object;
      
      // Verify status is COMPLETED
      if (data.payment.status === 'COMPLETED') {
        const squareOrderId = data.payment.order_id;
        logger.info('Payment completed for order', { squareOrderId });
        
        if (squareOrderId) {
          // Find order in our database by Square order ID
          const order = await prisma.order.findFirst({
            where: { squareOrderId }
          });
          
          if (order) {
            // Update payment status to PAID
            await updateOrderPayment(order.id, squareOrderId);
            logger.info('Order payment status updated', { orderId: order.id });
          } else {
            logger.warn('Order not found for Square order ID', { squareOrderId });
          }
        }
      }
    }
    
    // Always return success to Square
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing Square webhook', { error });
    // Still return 200 to prevent Square from retrying
    return NextResponse.json({ success: false });
  }
} 