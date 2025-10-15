import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get recent orders with payment info
    const orders = await withRetry(
      async () => {
        return await prisma.order.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          select: {
            id: true,
            squareOrderId: true,
            paymentStatus: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            payments: {
              select: {
                id: true,
                squarePaymentId: true,
                status: true,
                amount: true,
                createdAt: true,
                updatedAt: true,
                rawData: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        });
      },
      3,
      'getRecentOrders'
    );

    // Get recent catering orders
    const cateringOrders = await withRetry(
      async () => {
        return await prisma.cateringOrder.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          select: {
            id: true,
            squareOrderId: true,
            paymentStatus: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        });
      },
      3,
      'getRecentCateringOrders'
    );

    // Get recent webhook queue entries
    const webhookQueue = await withRetry(
      async () => {
        return await prisma.webhookQueue.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          select: {
            eventId: true,
            eventType: true,
            status: true,
            attempts: true,
            createdAt: true,
            processedAt: true,
            errorMessage: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        });
      },
      3,
      'getWebhookQueue'
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        regularOrders: orders,
        cateringOrders: cateringOrders,
        webhookQueue: webhookQueue,
        summary: {
          totalRegularOrders: orders.length,
          totalCateringOrders: cateringOrders.length,
          totalWebhooks: webhookQueue.length,
          pendingWebhooks: webhookQueue.filter(w => w.status === 'PENDING').length,
          failedWebhooks: webhookQueue.filter(w => w.status === 'FAILED').length,
          completedWebhooks: webhookQueue.filter(w => w.status === 'COMPLETED').length,
          paymentRelatedWebhooks: webhookQueue.filter(w => w.eventType.includes('payment')).length,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching payment status debug info:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { orderId, action } = await request.json();

    if (action === 'check_order') {
      const order = await withRetry(
        async () => {
          return await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              payments: true,
            },
          });
        },
        3,
        'checkOrder'
      );

      return NextResponse.json({
        success: true,
        order: order,
      });
    }

    if (action === 'simulate_payment_update' && orderId) {
      // Simulate a payment update
      const updated = await withRetry(
        async () => {
          return await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'PAID',
              status: 'PROCESSING',
              updatedAt: new Date(),
            },
          });
        },
        3,
        'simulatePaymentUpdate'
      );

      return NextResponse.json({
        success: true,
        message: 'Payment status updated to PAID',
        order: updated,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Error in payment status debug POST:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
