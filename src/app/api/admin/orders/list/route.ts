import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Types for orders with count
type OrderWithCount = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: Decimal;
  createdAt: Date;
  pickupTime: Date | null;
  deliveryDate: string | null;
  deliveryTime: string | null;
  trackingNumber: string | null;
  fulfillmentType: string;
  isArchived: boolean;
  _count: {
    items: number;
  };
};

type CateringOrderWithCount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CateringStatus;
  paymentStatus: PaymentStatus;
  totalAmount: Decimal;
  createdAt: Date;
  eventDate: Date | null;
  isArchived: boolean;
  paymentMethod: string | null;
  _count: {
    items: number;
  };
};

// Unified order type for frontend
interface UnifiedOrder {
  id: string;
  type: 'regular' | 'catering';
  customerName: string;
  email: string;
  phone: string;
  status: OrderStatus | CateringStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
  pickupTime: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  eventDate?: string | null;
  trackingNumber: string | null;
  fulfillmentType?: string;
  isArchived: boolean;
  itemCount: number;
  paymentMethod: string | null;
  shippingCarrier: string | null;
}

// Safe conversion of Decimal to number
function decimalToNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    try {
      return value.toNumber();
    } catch (e) {
      logger.error('Error converting Decimal to number:', e);
    }
  }
  return 0;
}

// Helper function to get the correct orderBy clause for database queries
function getOrderByClause(
  sortField: string,
  sortDirection: 'asc' | 'desc',
  orderType: 'regular' | 'catering'
) {
  const direction = sortDirection;

  switch (sortField) {
    case 'customerName':
      return orderType === 'regular' ? { customerName: direction } : { name: direction };
    case 'total':
      return orderType === 'regular' ? { total: direction } : { totalAmount: direction };
    case 'status':
      return { status: direction };
    case 'paymentStatus':
      return { paymentStatus: direction };
    case 'createdAt':
      return { createdAt: direction };
    case 'date':
      return orderType === 'regular' ? { pickupTime: direction } : { eventDate: direction };
    default:
      return { createdAt: 'desc' as const };
  }
}

/**
 * GET /api/admin/orders/list
 * Fetches orders with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse search params with validation
    const currentPage = Math.max(1, Number(searchParams.get('page') || 1) || 1);
    const searchQuery = (searchParams.get('search') || '').trim();
    const typeFilter = searchParams.get('type') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const paymentFilter = searchParams.get('payment') || 'all';
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortDirection = (searchParams.get('direction') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const itemsPerPage = 10;
    const skip = Math.max(0, (currentPage - 1) * itemsPerPage);

    logger.info('[ORDERS-API] Fetching orders', {
      currentPage,
      searchQuery,
      typeFilter,
      statusFilter,
      paymentFilter,
      sortField,
      sortDirection,
      skip,
      itemsPerPage
    });

    // Create timeout promises for each query
    const createTimeoutPromise = (ms: number) => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), ms);
    });

    // Build where conditions for regular orders
    const regularOrdersWhere: any = {
      isArchived: false,
    };

    if (searchQuery) {
      regularOrdersWhere.OR = [
        { customerName: { contains: searchQuery, mode: 'insensitive' } },
        { id: { contains: searchQuery, mode: 'insensitive' } },
        { trackingNumber: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    if (statusFilter && statusFilter !== 'all') {
      regularOrdersWhere.status = statusFilter;
    }

    if (paymentFilter && paymentFilter !== 'all') {
      regularOrdersWhere.paymentStatus = paymentFilter;
    }

    // Build where conditions for catering orders
    const cateringOrdersWhere: any = {
      isArchived: false,
    };

    if (searchQuery) {
      cateringOrdersWhere.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { id: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    if (statusFilter && statusFilter !== 'all') {
      cateringOrdersWhere.status = statusFilter;
    }

    if (paymentFilter && paymentFilter !== 'all') {
      cateringOrdersWhere.paymentStatus = paymentFilter;
    }

    let allOrders: UnifiedOrder[] = [];
    let totalCount = 0;

    // Fetch regular orders if needed
    if (typeFilter === 'all' || typeFilter === 'regular') {
      try {
        const regularOrdersQuery: any = {
          where: regularOrdersWhere,
          orderBy: getOrderByClause(sortField, sortDirection, 'regular'),
          select: {
            id: true,
            customerName: true,
            email: true,
            phone: true,
            status: true,
            paymentStatus: true,
            total: true,
            createdAt: true,
            pickupTime: true,
            deliveryDate: true,
            deliveryTime: true,
            trackingNumber: true,
            fulfillmentType: true,
            isArchived: true,
            _count: {
              select: { items: true }
            }
          },
        };

        // Apply pagination
        if (typeFilter === 'regular') {
          regularOrdersQuery.skip = skip;
          regularOrdersQuery.take = itemsPerPage;
        } else {
          // For 'all' filter, get limited data
          regularOrdersQuery.skip = 0;
          regularOrdersQuery.take = Math.min(25, itemsPerPage * 2);
        }

        // Execute query with timeout
        const regularOrdersPromise = prisma.order.findMany(regularOrdersQuery);
        const regularOrders = await Promise.race([
          regularOrdersPromise,
          createTimeoutPromise(8000)
        ]) as OrderWithCount[];

        logger.info(`[ORDERS-API] Found ${regularOrders?.length || 0} regular orders`);

        // Convert to unified format
        const serializedRegularOrders = regularOrders?.map(order => ({
          id: order.id,
          type: 'regular' as const,
          customerName: order.customerName,
          email: order.email,
          phone: order.phone,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: decimalToNumber(order.total),
          createdAt: order.createdAt.toISOString(),
          pickupTime: order.pickupTime ? order.pickupTime.toISOString() : null,
          deliveryDate: order.deliveryDate,
          deliveryTime: order.deliveryTime,
          eventDate: null,
          trackingNumber: order.trackingNumber,
          fulfillmentType: order.fulfillmentType,
          isArchived: order.isArchived,
          itemCount: order._count.items,
          paymentMethod: null,
          shippingCarrier: null,
        })) || [];

        allOrders.push(...serializedRegularOrders);

        // Get count for regular orders if filtering by regular only
        if (typeFilter === 'regular') {
          const countPromise = prisma.order.count({ where: regularOrdersWhere });
          totalCount = await Promise.race([
            countPromise,
            createTimeoutPromise(3000)
          ]) as number;
        }
      } catch (error) {
        logger.error('[ORDERS-API] Error fetching regular orders:', error);
        if (error instanceof Error && error.message === 'Database query timeout') {
          return NextResponse.json(
            { error: 'Request timed out. Please try again.', code: 'TIMEOUT' },
            { status: 504 }
          );
        }
        throw error;
      }
    }

    // Fetch catering orders if needed
    if (typeFilter === 'all' || typeFilter === 'catering') {
      try {
        const cateringOrdersQuery: any = {
          where: cateringOrdersWhere,
          orderBy: getOrderByClause(sortField, sortDirection, 'catering'),
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            createdAt: true,
            eventDate: true,
            isArchived: true,
            paymentMethod: true,
            _count: {
              select: { items: true }
            }
          },
        };

        // Apply pagination
        if (typeFilter === 'catering') {
          cateringOrdersQuery.skip = skip;
          cateringOrdersQuery.take = itemsPerPage;
        } else {
          // For 'all' filter, get limited data
          cateringOrdersQuery.skip = 0;
          cateringOrdersQuery.take = Math.min(25, itemsPerPage * 2);
        }

        // Execute query with timeout
        const cateringOrdersPromise = prisma.cateringOrder.findMany(cateringOrdersQuery);
        const cateringOrders = await Promise.race([
          cateringOrdersPromise,
          createTimeoutPromise(8000)
        ]) as CateringOrderWithCount[];

        logger.info(`[ORDERS-API] Found ${cateringOrders?.length || 0} catering orders`);

        // Convert to unified format
        const serializedCateringOrders = cateringOrders?.map(order => ({
          id: order.id,
          type: 'catering' as const,
          customerName: order.name,
          email: order.email,
          phone: order.phone,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: decimalToNumber(order.totalAmount),
          createdAt: order.createdAt.toISOString(),
          pickupTime: null,
          deliveryDate: null,
          deliveryTime: null,
          eventDate: order.eventDate ? order.eventDate.toISOString() : null,
          trackingNumber: null,
          fulfillmentType: 'pickup',
          isArchived: order.isArchived,
          itemCount: order._count.items,
          paymentMethod: order.paymentMethod,
          shippingCarrier: null,
        })) || [];

        allOrders.push(...serializedCateringOrders);

        // Get count for catering orders if filtering by catering only
        if (typeFilter === 'catering') {
          const countPromise = prisma.cateringOrder.count({ where: cateringOrdersWhere });
          totalCount = await Promise.race([
            countPromise,
            createTimeoutPromise(3000)
          ]) as number;
        }
      } catch (error) {
        logger.error('[ORDERS-API] Error fetching catering orders:', error);
        if (error instanceof Error && error.message === 'Database query timeout') {
          return NextResponse.json(
            { error: 'Request timed out. Please try again.', code: 'TIMEOUT' },
            { status: 504 }
          );
        }
        throw error;
      }
    }

    // Handle 'all' filter sorting and counting
    if (typeFilter === 'all') {
      // Sort combined results
      allOrders.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case 'customerName':
            aValue = a.customerName || '';
            bValue = b.customerName || '';
            break;
          case 'total':
            aValue = a.total;
            bValue = b.total;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'paymentStatus':
            aValue = a.paymentStatus;
            bValue = b.paymentStatus;
            break;
          case 'date':
            aValue = a.type === 'catering' ? a.eventDate || '' : a.pickupTime || '';
            bValue = b.type === 'catering' ? b.eventDate || '' : b.pickupTime || '';
            break;
          case 'createdAt':
          default:
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const result = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? result : -result;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      // Get total count with timeout
      try {
        const [regularCount, cateringCount] = await Promise.all([
          Promise.race([
            prisma.order.count({ where: regularOrdersWhere }),
            createTimeoutPromise(3000)
          ]),
          Promise.race([
            prisma.cateringOrder.count({ where: cateringOrdersWhere }),
            createTimeoutPromise(3000)
          ])
        ]);
        
        totalCount = (regularCount as number) + (cateringCount as number);
      } catch (countError) {
        logger.error('[ORDERS-API] Error counting orders:', countError);
        totalCount = allOrders.length; // Fallback
      }
      
      // Apply pagination to sorted results
      allOrders = allOrders.slice(skip, skip + itemsPerPage);
    }

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    logger.info(`[ORDERS-API] Returning ${allOrders.length} orders (page ${currentPage}/${totalPages})`);

    return NextResponse.json({
      orders: allOrders,
      pagination: {
        currentPage,
        totalPages,
        totalCount,
        itemsPerPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    });

  } catch (error) {
    logger.error('[ORDERS-API] Error fetching orders:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
