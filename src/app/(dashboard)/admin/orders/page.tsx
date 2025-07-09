import { prisma } from '@/lib/db';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatPrice, formatDateTime, formatCurrency } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Decimal } from '@prisma/client/runtime/library';
import Pagination from '@/components/ui/pagination';
import OrderFilters from './components/OrderFilters';
import OrdersTable from './components/OrdersTable';

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
  return orders.map(order => {
    const itemsCount = order.items?.length || 0;
    const totalItems = order.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;
    
    return {
      id: order.id,
      status: order.status,
      customerName: order.customerName,
      total: Number(order.total || 0),
      items: order.items?.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price || 0),
      })) || [],
      pickupTime: order.pickupTime ? order.pickupTime.toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      trackingNumber: order.trackingNumber || null,
      shippingCarrier: order.shippingCarrier || null,
      type: order.isCateringOrder ? 'catering' : 'regular',
      paymentStatus: order.paymentStatus
    };
  });
}

// Manual serialization for catering orders
function serializeCateringOrders(orders: any[]): UnifiedOrder[] {
  return orders.map(order => {
    // Serialize items
    const serializedItems = order.items?.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      price: decimalToNumber(item.totalPrice)
    })) || [];
    
    return {
      id: order.id,
      status: order.status,
      customerName: order.name,
      total: decimalToNumber(order.totalAmount),
      items: serializedItems,
      pickupTime: null,
      eventDate: order.eventDate ? new Date(order.eventDate).toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      trackingNumber: null,
      shippingCarrier: null,
      type: 'catering',
      paymentStatus: order.paymentStatus
    };
  });
}

// Helper function to get the correct orderBy clause for database queries
function getOrderByClause(sortField: string, sortDirection: 'asc' | 'desc', orderType: 'regular' | 'catering') {
  const direction = sortDirection;
  
  // Map sort fields to actual database fields
  switch (sortField) {
    case 'customerName':
      return orderType === 'regular' 
        ? { customerName: direction }
        : { name: direction };
    case 'total':
      return orderType === 'regular'
        ? { total: direction }
        : { totalAmount: direction };
    case 'status':
      return { status: direction };
    case 'paymentStatus':
      return { paymentStatus: direction };
    case 'createdAt':
      return { createdAt: direction };
    case 'date':
      // For 'date', use pickupTime for regular orders and eventDate for catering
      return orderType === 'regular'
        ? { pickupTime: direction }
        : { eventDate: direction };
    default:
      return { createdAt: 'desc' as const };
  }
}

export default async function OrdersPage({ params, searchParams }: OrderPageProps) {
  await params; // We're not using the params, but we need to await the promise
  
  // Await the searchParams promise
  const searchParamsResolved = await searchParams;
  
  // Parse search params
  const currentPage = Number(searchParamsResolved?.page || 1);
  const searchQuery = searchParamsResolved?.search || '';
  const typeFilter = searchParamsResolved?.type || 'all';
  const statusFilter = searchParamsResolved?.status || 'all';
  const paymentFilter = searchParamsResolved?.payment || 'all';
  const sortField = searchParamsResolved?.sort || 'createdAt';
  const sortDirection = searchParamsResolved?.direction || 'desc';
  
  const itemsPerPage = 15;
  const skip = (currentPage - 1) * itemsPerPage;

  try {
    // Build where conditions for regular orders
    const regularOrdersWhere: any = {};
    
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
    const cateringOrdersWhere: any = {};
    
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
      // Fetch regular orders
      const regularOrders = await prisma.order.findMany({
        where: regularOrdersWhere,
        orderBy: getOrderByClause(sortField, sortDirection, 'regular'),
        include: { items: true },
        ...(typeFilter === 'regular' ? { skip, take: itemsPerPage } : {}),
      });

      const serializedRegularOrders = serializeRegularOrders(regularOrders);
      allOrders.push(...serializedRegularOrders);

      if (typeFilter === 'regular') {
        totalCount = await prisma.order.count({ where: regularOrdersWhere });
      }
    }

    if (typeFilter === 'all' || typeFilter === 'catering') {
      // Fetch catering orders
      const cateringOrders = await prisma.cateringOrder.findMany({
        where: cateringOrdersWhere,
        orderBy: getOrderByClause(sortField, sortDirection, 'catering'),
        include: { items: true },
        ...(typeFilter === 'catering' ? { skip, take: itemsPerPage } : {}),
      });

      const serializedCateringOrders = serializeCateringOrders(cateringOrders);
      allOrders.push(...serializedCateringOrders);

      if (typeFilter === 'catering') {
        totalCount = await prisma.cateringOrder.count({ where: cateringOrdersWhere });
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
            aValue = a.type === 'catering' ? (a.eventDate || '') : (a.pickupTime || '');
            bValue = b.type === 'catering' ? (b.eventDate || '') : (b.pickupTime || '');
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
      
      totalCount = allOrders.length;
      allOrders = allOrders.slice(skip, skip + itemsPerPage);
    }

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    logger.info(`Found ${allOrders.length} orders for display (page ${currentPage}/${totalPages})`);

    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Order Management</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/orders/manual"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Manual Order
            </Link>
          </div>
        </div>

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
            <OrdersTable orders={allOrders} />

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                searchParams={searchParamsResolved || {}} 
              />
            )}
          </>
        )}
      </div>
    );
  } catch (error) {
    logger.error('Error fetching orders:', error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Order Management</h1>
        <ErrorDisplay 
          title="Failed to Load Orders"
          message="There was an error loading the orders. Please try again later."
          returnLink={{ href: "/admin", label: "Return to dashboard" }}
        />
      </div>
    );
  }
}


