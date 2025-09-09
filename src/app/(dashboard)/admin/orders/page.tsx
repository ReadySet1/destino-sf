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

// Define types for orders with count
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
  deliveryDate: Date | null;
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
  customerName: string;
  email: string;
  phone: string;
  status: CateringStatus;
  paymentStatus: PaymentStatus;
  total: Decimal;
  createdAt: Date;
  eventDate: Date | null;
  isArchived: boolean;
  paymentMethod: string | null;
  _count: {
    items: number;
  };
};

// Define our unified order type
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

    // Quick database connectivity check - removed for better performance
    // The actual queries below will handle connection issues gracefully

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
        
        // Optimized query: Always use pagination to prevent loading all data
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
            // Only include items count for performance
            _count: {
              select: { items: true }
            }
          },
        };
        
        // Apply pagination for all filters (including 'all')
        if (typeFilter === 'regular') {
          regularOrdersQuery.skip = skip;
          regularOrdersQuery.take = itemsPerPage;
        } else if (typeFilter === 'all') {
          // For 'all' filter, fetch limited data for both order types
          regularOrdersQuery.skip = 0;
          regularOrdersQuery.take = Math.max(itemsPerPage * 2, 50); // Get more for mixed sorting
        }

        logger.info('OrdersPage: Regular orders query', { ...regularOrdersQuery, where: 'filtered for logging' });
        
        const regularOrders = await withConnectionManagement(
          () => prisma.order.findMany(regularOrdersQuery),
          'Fetch regular orders',
          10000 // Reduced timeout since less data
        ) as unknown as OrderWithCount[];
        
        logger.info(`OrdersPage: Found ${regularOrders?.length || 0} regular orders`);

        // Convert to unified format with lightweight data
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
          deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : null,
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

        if (typeFilter === 'regular') {
          totalCount = await withConnectionManagement(
            () => prisma.order.count({ where: regularOrdersWhere }),
            'Count regular orders',
            5000 // Reduced timeout for count queries
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
        
        // Optimized query: Always use pagination to prevent loading all data
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
            numberOfPeople: true,
            deliveryZone: true,
            deliveryAddress: true,
            isArchived: true,
            paymentMethod: true,
            // Only include items count for performance
            _count: {
              select: { items: true }
            }
          },
        };
        
        // Apply pagination for all filters (including 'all')
        if (typeFilter === 'catering') {
          cateringOrdersQuery.skip = skip;
          cateringOrdersQuery.take = itemsPerPage;
        } else if (typeFilter === 'all') {
          // For 'all' filter, fetch limited data for both order types
          cateringOrdersQuery.skip = 0;
          cateringOrdersQuery.take = Math.max(itemsPerPage * 2, 50); // Get more for mixed sorting
        }

        logger.info('OrdersPage: Catering orders query', { ...cateringOrdersQuery, where: 'filtered for logging' });
        
        const cateringOrders = await withConnectionManagement(
          () => prisma.cateringOrder.findMany(cateringOrdersQuery),
          'Fetch catering orders',
          10000 // Reduced timeout since less data
        ) as unknown as CateringOrderWithCount[];
        
        logger.info(`OrdersPage: Found ${cateringOrders?.length || 0} catering orders`);

        // Convert to unified format with lightweight data
        const serializedCateringOrders = cateringOrders?.map(order => ({
          id: order.id,
          type: 'catering' as const,
          customerName: order.customerName,
          email: order.email,
          phone: order.phone,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: decimalToNumber(order.total),
          createdAt: order.createdAt.toISOString(),
          pickupTime: null,
          deliveryDate: null,
          deliveryTime: null,
          eventDate: order.eventDate ? order.eventDate.toISOString() : null,
          trackingNumber: null,
          fulfillmentType: 'pickup', // Default for catering orders
          isArchived: order.isArchived,
          itemCount: order._count.items,
          paymentMethod: order.paymentMethod,
          shippingCarrier: null,
        })) || [];

        allOrders.push(...serializedCateringOrders);

        if (typeFilter === 'catering') {
          totalCount = await withConnectionManagement(
            () => prisma.cateringOrder.count({ where: cateringOrdersWhere }),
            'Count catering orders',
            5000 // Reduced timeout for count queries
          );
          logger.info(`OrdersPage: Catering orders total count: ${totalCount}`);
        }
      } catch (cateringOrdersError) {
        logger.error('OrdersPage: Error fetching catering orders:', cateringOrdersError);
        throw cateringOrdersError;
      }
    }

    // If showing all orders, sort and paginate manually (optimized)
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

      // Estimate total count using fast count queries instead of loading all data
      try {
        const [regularCount, cateringCount] = await Promise.all([
          withConnectionManagement(
            () => prisma.order.count({ where: regularOrdersWhere }),
            'Count regular orders for all filter',
            3000 // Fast timeout for count
          ),
          withConnectionManagement(
            () => prisma.cateringOrder.count({ where: cateringOrdersWhere }),
            'Count catering orders for all filter',
            3000 // Fast timeout for count
          ),
        ]);
        
        totalCount = regularCount + cateringCount;
        logger.info(`OrdersPage: Combined total count: ${totalCount} (${regularCount} regular + ${cateringCount} catering)`);
      } catch (countError) {
        logger.error('OrdersPage: Error counting orders, using loaded data count:', countError);
        totalCount = allOrders.length; // Fallback to what we have
      }
      
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
