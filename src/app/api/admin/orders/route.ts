import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role using centralized guard
    const authResult = await verifyAdminAccess();
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const fulfillmentMethod = url.searchParams.get('fulfillmentMethod');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const email = url.searchParams.get('email');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (fulfillmentMethod) {
      where.fulfillmentMethod = fulfillmentMethod;
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
            variant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status, notes } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Check authentication and admin role using centralized guard
    const authResult = await verifyAdminAccess();
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Find existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate status if provided
    if (status && !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(status && { status }),
        ...(notes && { notes }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Failed to update order:', error);

    // Handle Prisma known errors
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'Order update conflict' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, orderIds, status } = body;

    if (action === 'bulk-update') {
      if (!orderIds || !Array.isArray(orderIds)) {
        return NextResponse.json({ error: 'Order IDs array is required' }, { status: 400 });
      }

      if (orderIds.length > 100) {
        return NextResponse.json(
          { error: 'Too many orders for bulk update (max 100)' },
          { status: 400 }
        );
      }

      // Check authentication and admin role using centralized guard
      const authResult = await verifyAdminAccess();
      
      if (!authResult.authorized) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.statusCode }
        );
      }

      // Bulk update orders
      const result = await prisma.order.updateMany({
        where: {
          id: { in: orderIds },
        },
        data: {
          ...(status && { status }),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        updatedCount: result.count,
      });
    }

    if (action === 'stats') {
      // Return order statistics
      const [statusCounts, totalOrders, totalRevenue] = await Promise.all([
        prisma.order.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        prisma.order.count(),
        prisma.order.aggregate({
          _sum: { total: true },
        }),
      ]);

      const statusCountsObj = statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = item._count._all;
          return acc;
        },
        {} as Record<string, number>
      );

      const revenue = totalRevenue._sum.total?.toNumber() || 0;
      const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

      return NextResponse.json({
        success: true,
        stats: {
          statusCounts: statusCountsObj,
          totalOrders,
          totalRevenue: revenue,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
