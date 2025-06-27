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
        orderBy: { createdAt: 'desc' },
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
        orderBy: { createdAt: 'desc' },
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
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allOrders.map((order, index) => (
                      <tr key={order.id || `order-${index}`} className={order.type === 'catering' ? 'bg-amber-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <Link
                            href={`/admin/${order.type === 'catering' ? 'catering' : 'orders'}/${order.id}`}
                            className="text-indigo-600 hover:text-indigo-900 hover:underline font-mono"
                            title={`View details for order ${order.id}`}
                          >
                            {order.id ? `${order.id.substring(0, 8)}...` : 'N/A'}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.type === 'catering' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            {order.type === 'catering' ? 'CATERING' : 'REGULAR'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.customerName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.items?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.type === 'catering' 
                            ? (order.eventDate ? formatDateTime(order.eventDate) : 'N/A')
                            : (order.pickupTime ? formatDateTime(order.pickupTime) : 'N/A')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.createdAt ? formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link
                            href={`/admin/${order.type === 'catering' ? 'catering' : 'orders'}/${order.id}`}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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

function getStatusColor(status: OrderStatus | CateringStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROCESSING':
    case 'PREPARING':
      return 'bg-blue-100 text-blue-800';
    case 'READY':
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPaymentStatusColor(status: PaymentStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-purple-100 text-purple-800';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
