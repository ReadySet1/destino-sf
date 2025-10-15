import { NextResponse } from 'next/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db-unified';
import { getSquareService } from '@/lib/square/service';
import { logger } from '@/utils/logger';
import { randomUUID } from 'crypto';

/**
 * PRODUCTION SQUARE ORDER FIX API
 *
 * Safely fixes stuck Square orders in production environment.
 * Requires admin authentication and includes safety checks.
 */

interface FixResult {
  orderId: string;
  squareOrderId: string;
  success: boolean;
  action: 'finalized' | 'already_finalized' | 'error';
  error?: string;
  squareState?: string;
}

export async function POST(request: Request) {
  try {
    // Authentication and admin check
    const { user, profile } = await requireAdmin();

    const { action, dryRun = true } = await request.json();

    if (action !== 'fix-stuck-orders') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    logger.info(`🔧 Production Square fix initiated by ${user.email}`, {
      dryRun,
      userEmail: user.email,
    });

    // Safety check: Ensure we're in the right environment
    const environment = process.env.NODE_ENV;
    const squareEnv = process.env.SQUARE_ENVIRONMENT;

    if (environment !== 'production') {
      return NextResponse.json(
        {
          error: 'This endpoint is only available in production environment',
        },
        { status: 400 }
      );
    }

    // Find stuck orders (same logic as the script)
    const stuckOrders = await findStuckOrders();

    if (stuckOrders.length === 0) {
      return NextResponse.json({
        message: 'No stuck orders found',
        results: [],
        summary: {
          total: 0,
          fixed: 0,
          errors: 0,
        },
      });
    }

    // If dry run, just return what would be fixed
    if (dryRun) {
      return NextResponse.json({
        message: `DRY RUN: Found ${stuckOrders.length} stuck orders`,
        wouldFix: stuckOrders.map(order => ({
          orderId: order.id,
          squareOrderId: order.squareOrderId,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          customerName: order.customerName,
          createdAt: order.createdAt,
        })),
        summary: {
          total: stuckOrders.length,
          wouldFix: stuckOrders.length,
        },
      });
    }

    // Execute fixes
    const results: FixResult[] = [];
    for (const order of stuckOrders) {
      const result = await fixStuckOrder(order);
      results.push(result);
    }

    const summary = {
      total: results.length,
      fixed: results.filter(r => r.success).length,
      errors: results.filter(r => !r.success).length,
    };

    logger.info('✅ Production Square fix completed', {
      summary,
      userEmail: user.email,
    });

    return NextResponse.json({
      message: `Fixed ${summary.fixed} out of ${summary.total} stuck orders`,
      results,
      summary,
    });
  } catch (error: any) {
    logger.error('💥 Error in production Square fix:', error);

    // Handle authentication/authorization errors
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Find orders that are stuck in DRAFT state
 */
async function findStuckOrders() {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last1Hour = new Date(Date.now() - 60 * 60 * 1000);

  return prisma.order.findMany({
    where: {
      AND: [
        { squareOrderId: { not: null } },
        { createdAt: { gte: last24Hours } },
        {
          OR: [
            // Orders pending for more than 1 hour
            {
              status: 'PENDING',
              createdAt: { lt: last1Hour },
            },
            // Orders with completed payments but stuck status
            {
              paymentStatus: 'COMPLETED',
              status: { in: ['PENDING', 'PROCESSING'] },
            },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit for safety
  });
}

/**
 * Fix a single stuck order
 */
async function fixStuckOrder(order: any): Promise<FixResult> {
  try {
    const squareService = getSquareService();

    // First, check current order state in Square
    const response = await squareService.retrieveOrder(order.squareOrderId);
    const squareOrder = response.order;

    if (squareOrder.state === 'OPEN' || squareOrder.state === 'COMPLETED') {
      // Order is already finalized in Square, just update our database
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      });

      return {
        orderId: order.id,
        squareOrderId: order.squareOrderId,
        success: true,
        action: 'already_finalized',
        squareState: squareOrder.state,
      };
    }

    // Order is stuck in DRAFT, need to finalize it
    const updateRequest = {
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        state: 'OPEN',
        version: squareOrder.version,
      },
      fieldsToClear: [],
      idempotencyKey: randomUUID(),
    };

    await squareService.updateOrder(order.squareOrderId, updateRequest);

    // Update our database
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    return {
      orderId: order.id,
      squareOrderId: order.squareOrderId,
      success: true,
      action: 'finalized',
      squareState: 'OPEN',
    };
  } catch (error: any) {
    logger.error(`Failed to fix order ${order.id}:`, error);

    return {
      orderId: order.id,
      squareOrderId: order.squareOrderId,
      success: false,
      action: 'error',
      error: error.message || 'Unknown error',
    };
  }
}

// GET endpoint for checking status
export async function GET() {
  try {
    const { user, profile } = await requireAdmin();

    const stuckOrders = await findStuckOrders();

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      squareEnvironment: process.env.SQUARE_ENVIRONMENT,
      stuckOrdersCount: stuckOrders.length,
      lastCheck: new Date(),
      status: stuckOrders.length > 0 ? 'ATTENTION_NEEDED' : 'HEALTHY',
    });
  } catch (error: any) {
    logger.error('Error checking stuck orders:', error);

    // Handle authentication/authorization errors
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
