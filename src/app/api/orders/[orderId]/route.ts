import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/app/actions';
import { logger } from '@/utils/logger';

/**
 * Retrieves order details by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    logger.info(`Fetching order details for order: ${orderId}`);

    const result = await getOrderById(orderId);

    // Handle the different return types from getOrderById
    if (!result) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Check if it's an error object
    if (typeof result === 'object' && 'success' in result && !result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    logger.error('Error retrieving order details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve order details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
