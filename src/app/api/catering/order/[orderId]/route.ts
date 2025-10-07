import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

/**
 * GET /api/catering/order/[orderId]
 * Fetches catering order details with optimized query and timeout handling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      logger.warn(`[CATERING-API] Invalid UUID format: ${orderId}`);
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    logger.info(`[CATERING-API] Fetching catering order: ${orderId}`);

    // Execute query with unified retry mechanism
    const orderData = await withRetry(
      () => prisma.cateringOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          name: true,
          email: true,
          phone: true,
          eventDate: true,
          numberOfPeople: true,
          specialRequests: true,
          deliveryZone: true,
          deliveryAddress: true,
          deliveryAddressJson: true,
          createdAt: true,
          paymentStatus: true,
          paymentMethod: true,
          squareOrderId: true,
          retryCount: true,
          lastRetryAt: true,
          paymentUrl: true,
          paymentUrlExpiresAt: true,
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              pricePerUnit: true,
              totalPrice: true,
              itemType: true,
              notes: true,
            },
          },
        },
      }),
      3,
      'catering-order-fetch'
    );

    if (!orderData) {
      logger.warn(`[CATERING-API] Order not found: ${orderId}`);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    logger.info(`[CATERING-API] Successfully fetched order with ${orderData.items.length} items`);

    // Convert Decimal fields to numbers for JSON serialization
    const serializedOrder = {
      ...orderData,
      totalAmount: orderData.totalAmount.toNumber(),
      items: orderData.items.map(item => ({
        ...item,
        pricePerUnit: item.pricePerUnit.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
      })),
    };

    // Determine status based on database state
    let determinedStatus = 'processing';

    if (orderData.paymentStatus === 'PAID') {
      determinedStatus = 'success';
    } else if (orderData.paymentStatus === 'FAILED' || orderData.status === 'CANCELLED') {
      determinedStatus = 'failed';
    } else if (orderData.paymentStatus === 'PENDING') {
      // For CASH payments, treat as confirmed even if payment status is pending
      // (payment will be collected at pickup)
      if (orderData.paymentMethod === 'CASH') {
        determinedStatus = 'confirmed';
      } else {
        // Check if order was recently created (within 5 minutes)
        const orderAge = Date.now() - new Date(orderData.createdAt).getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (orderAge < fiveMinutes) {
          determinedStatus = 'processing';
        } else {
          determinedStatus = 'pending';
        }
      }
    }

    logger.debug(`[CATERING-API] Determined status: ${determinedStatus}`);

    return NextResponse.json({
      order: serializedOrder,
      status: determinedStatus,
    });

  } catch (error) {
    logger.error('[CATERING-API] Error fetching catering order:', error);
    
    // Check if it's a timeout error
    if (error instanceof Error && error.message === 'Database query timeout') {
      return NextResponse.json(
        { 
          error: 'Request timed out. Please try again.',
          code: 'TIMEOUT' 
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
