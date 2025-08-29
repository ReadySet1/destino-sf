import { prisma, withConnectionManagement } from '@/lib/db';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatPrice, formatDateTime, formatCurrency } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Decimal } from '@prisma/client/runtime/library';
import Pagination from '@/components/ui/pagination';
import OrderFilters from './components/OrderFilters';
import OrdersTableWrapper from './components/OrdersTableWrapper';

import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { FormContainer } from '@/components/ui/form/FormContainer';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Define the shape of the resolved params
type ResolvedParams = {
  [key: string]: string | string[] | undefined;
};

// Define page props type
type OrderPageProps = {
  params: Promise<ResolvedParams>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    status?: string;
    payment?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }>;
};

// Define our unified order type
interface UnifiedOrder {
  id: string;
  status: OrderStatus | CateringStatus;
  customerName: string | null;
  total: number;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
  }>;
  pickupTime: string | null;
  eventDate?: string | null;
  createdAt: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  type: 'regular' | 'catering';
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
}

// Safe conversion of Decimal to number
function decimalToNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;

  // If it's already a number
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  // If it's a Decimal
  if (typeof value === 'object') {
    try {
      if (typeof value.toNumber === 'function') {
        return value.toNumber();
      }
    } catch (e) {
      console.error('Error converting Decimal to number:', e);
    }
  }

  // Fallback
  return 0;
}

// Manual serialization for regular orders
function serializeRegularOrders(orders: any[]): UnifiedOrder[] {
  if (!Array.isArray(orders)) {
    return [];
  }
  
  return orders.map(order => {
    if (!order) {
      throw new Error('Received null/undefined order in serializeRegularOrders');
    }

    const itemsCount = order.items?.length || 0;
    const totalItems =
      order.items?.reduce((total: number, item: any) => total + (item?.quantity || 0), 0) || 0;

    return {
      id: order.id || '',
      status: order.status || 'PENDING',
      customerName: order.customerName || null,
      total: Number(order.total || 0),
      items:
        order.items?.map((item: any) => ({
          id: item?.id || '',
          quantity: item?.quantity || 0,
          price: Number(item?.price || 0),
        })) || [],
      pickupTime: order.pickupTime ? order.pickupTime.toISOString() : null,
      createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
      trackingNumber: order.trackingNumber || null,
      shippingCarrier: order.shippingCarrier || null,
      type: order.isCateringOrder ? 'catering' : 'regular',
      paymentStatus: order.paymentStatus || 'PENDING',
      paymentMethod: order.paymentMethod || null,
    };
  });
}

// Manual serialization for catering orders
function serializeCateringOrders(orders: any[]): UnifiedOrder[] {
  if (!Array.isArray(orders)) {
    return [];
  }
  
  return orders.map(order => {
    if (!order) {
      throw new Error('Received null/undefined order in serializeCateringOrders');
    }

    // Serialize items
    const serializedItems =
      order.items?.map((item: any) => ({
        id: item?.id || '',
        quantity: item?.quantity || 0,
        price: decimalToNumber(item?.totalPrice),
      })) || [];

    return {
      id: order.id || '',
      status: order.status || 'PENDING',
      customerName: order.name || null,
      total: decimalToNumber(order.totalAmount),
      items: serializedItems,
      pickupTime: null,
      eventDate: order.eventDate ? new Date(order.eventDate).toISOString() : null,
      createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
      trackingNumber: null,
      shippingCarrier: null,
      type: 'catering',
      paymentStatus: order.paymentStatus || 'PENDING',
      paymentMethod: order.paymentMethod || null,
    };
  });
}

// Helper function to get the correct orderBy clause for database queries
function getOrderByClause(
  sortField: string,
  sortDirection: 'asc' | 'desc',
  orderType: 'regular' | 'catering'
) {
  const direction = sortDirection;

  // Map sort fields to actual database fields
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
      // For 'date', use pickupTime for regular orders and eventDate for catering
      return orderType === 'regular' ? { pickupTime: direction } : { eventDate: direction };
    default:
      return { createdAt: 'desc' as const };
  }
}

export default async function OrdersPage({ params, searchParams }: OrderPageProps) {
  await params; // We're not using the params, but we need to await the promise

  // Await the searchParams promise
  const searchParamsResolved = await searchParams;

  // Parse search params with proper validation
  const currentPage = Math.max(1, Number(searchParamsResolved?.page || 1) || 1);
  const searchQuery = (searchParamsResolved?.search || '').trim();
  const typeFilter = searchParamsResolved?.type || 'all';
  const statusFilter = searchParamsResolved?.status || 'all';
  const paymentFilter = searchParamsResolved?.payment || 'all';
  const sortField = searchParamsResolved?.sort || 'createdAt';
  const sortDirection = (searchParamsResolved?.direction === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  const itemsPerPage = 10;
  const skip = Math.max(0, (currentPage - 1) * itemsPerPage);

  try {
    // Log debug information
    logger.info('OrdersPage: Starting to fetch orders', {
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

    // Quick database connectivity check using robust connection management
    await withConnectionManagement(
      async () => {
        await prisma.$queryRaw`SELECT 1 as test`;
        logger.info('OrdersPage: Database connectivity confirmed');
      },
      'Database connectivity check',
      5000 // 5 second timeout
    );

    // Build where conditions for regular orders
    const regularOrdersWhere: any = {
      isArchived: false, // Exclude archived orders by default
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
      isArchived: false, // Exclude archived orders by default
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

    if (typeFilter === 'all' || typeFilter === 'regular') {
      try {
        logger.info('OrdersPage: Fetching regular orders');
        
        // Fetch regular orders with safe pagination
        const regularOrdersQuery: any = {
          where: regularOrdersWhere,
          orderBy: getOrderByClause(sortField, sortDirection, 'regular'),
          include: { items: true },
        };
        
        // Only add pagination for single type filter
        if (typeFilter === 'regular') {
          regularOrdersQuery.skip = skip;
          regularOrdersQuery.take = itemsPerPage;
        }

        logger.info('OrdersPage: Regular orders query', regularOrdersQuery);
        
        const regularOrders = await withConnectionManagement(
          () => prisma.order.findMany(regularOrdersQuery),
          'Fetch regular orders',
          15000 // 15 second timeout
        );
        
        logger.info(`OrdersPage: Found ${regularOrders?.length || 0} regular orders`);

        const serializedRegularOrders = serializeRegularOrders(regularOrders || []);
        allOrders.push(...serializedRegularOrders);

        if (typeFilter === 'regular') {
          totalCount = await withConnectionManagement(
            () => prisma.order.count({ where: regularOrdersWhere }),
            'Count regular orders',
            10000 // 10 second timeout
          );
          logger.info(`OrdersPage: Regular orders total count: ${totalCount}`);
        }
      } catch (regularOrdersError) {
        logger.error('OrdersPage: Error fetching regular orders:', regularOrdersError);
        throw regularOrdersError;
      }
    }

    if (typeFilter === 'all' || typeFilter === 'catering') {
      try {
        logger.info('OrdersPage: Fetching catering orders');
        
        // Fetch catering orders with safe pagination
        const cateringOrdersQuery: any = {
          where: cateringOrdersWhere,
          orderBy: getOrderByClause(sortField, sortDirection, 'catering'),
          include: { items: true },
        };
        
        // Only add pagination for single type filter
        if (typeFilter === 'catering') {
          cateringOrdersQuery.skip = skip;
          cateringOrdersQuery.take = itemsPerPage;
        }

        logger.info('OrdersPage: Catering orders query', cateringOrdersQuery);
        
        const cateringOrders = await withConnectionManagement(
          () => prisma.cateringOrder.findMany(cateringOrdersQuery),
          'Fetch catering orders',
          15000 // 15 second timeout
        );
        
        logger.info(`OrdersPage: Found ${cateringOrders?.length || 0} catering orders`);

        const serializedCateringOrders = serializeCateringOrders(cateringOrders || []);
        allOrders.push(...serializedCateringOrders);

        if (typeFilter === 'catering') {
          totalCount = await withConnectionManagement(
            () => prisma.cateringOrder.count({ where: cateringOrdersWhere }),
            'Count catering orders',
            10000 // 10 second timeout
          );
          logger.info(`OrdersPage: Catering orders total count: ${totalCount}`);
        }
      } catch (cateringOrdersError) {
        logger.error('OrdersPage: Error fetching catering orders:', cateringOrdersError);
        throw cateringOrdersError;
      }
    }

    // If showing all orders, sort and paginate manually
    if (typeFilter === 'all') {
      // Sort based on the selected field and direction
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
            // Use eventDate for catering orders, pickupTime for regular orders
            aValue = a.type === 'catering' ? a.eventDate || '' : a.pickupTime || '';
            bValue = b.type === 'catering' ? b.eventDate || '' : b.pickupTime || '';
            break;
          case 'createdAt':
          default:
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const result = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? result : -result;
        }

        // Handle number/date comparison
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      // Store total count before slicing for pagination
      totalCount = allOrders.length;
      
      // Apply pagination by slicing the sorted array
      allOrders = allOrders.slice(skip, skip + itemsPerPage);
      
      logger.info(`After sorting and pagination: totalCount=${totalCount}, showing ${allOrders.length} orders for page ${currentPage}`);
    }

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    logger.info(`Found ${allOrders.length} orders for display (page ${currentPage}/${totalPages})`);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FormHeader
          title="Order Management"
          description="Manage and track customer orders"
          backUrl="/admin"
          backLabel="Back to Dashboard"
        />

        <div className="space-y-10 mt-8">
          {/* Action Buttons */}
          <FormActions>
            <FormButton
              variant="secondary"
              href="/admin/orders/archived"
              leftIcon={FormIcons.archive}
            >
              View Archived Orders
            </FormButton>
            <FormButton
              href="/admin/orders/manual"
              leftIcon={FormIcons.plus}
            >
              Add Manual Order
            </FormButton>
          </FormActions>

          {/* Filters Section */}
          <OrderFilters
            currentSearch={searchQuery}
            currentType={typeFilter}
            currentStatus={statusFilter}
            currentPayment={paymentFilter}
          />

          {allOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No orders found{searchQuery && ` matching "${searchQuery}"`}.
            </div>
          ) : (
            <>
              <OrdersTableWrapper 
                orders={allOrders}
                sortKey={sortField}
                sortDirection={sortDirection}
              />

              {/* Pagination - matching products page design */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    searchParams={searchParamsResolved || {}}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  } catch (error) {
    // Enhanced error handling with more detailed information
    let errorInfo: any = {
      timestamp: new Date().toISOString(),
      searchParams: {
        page: currentPage,
        search: searchQuery,
        type: typeFilter,
        status: statusFilter,
        payment: paymentFilter,
        sort: sortField,
        direction: sortDirection
      }
    };

    if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.name = error.name;
      errorInfo.stack = error.stack;
    } else if (error && typeof error === 'object') {
      errorInfo.errorObject = JSON.stringify(error, null, 2);
    } else {
      errorInfo.message = String(error) || 'Unknown error with no details';
    }

    // Log both the original error and our formatted info
    console.error('[ORDERS_PAGE_ERROR]', error);
    logger.error('Error fetching orders:', errorInfo);
    
    return (
      <FormContainer>
        <FormHeader
          title="Order Management"
          description="Manage and track customer orders"
          backUrl="/admin"
          backLabel="Back to Dashboard"
        />
        <ErrorDisplay
          title="Failed to Load Orders"
          message="There was an error loading the orders. Please try again later."
          returnLink={{ href: '/admin', label: 'Return to dashboard' }}
        />
      </FormContainer>
    );
  }
}
