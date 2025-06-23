import { prisma } from '@/lib/db';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatPrice, formatDateTime, formatCurrency } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Decimal } from '@prisma/client/runtime/library';

// Define the shape of the resolved params
type ResolvedParams = {
  [key: string]: string | string[] | undefined;
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

export default async function OrdersPage({ params }: { params: Promise<ResolvedParams> }) {
  await params; // We're not using the params, but we need to await the promise

  try {
    // Fetch regular orders with items included
    const regularOrders = await prisma.order.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
      },
    });

    // Fetch catering orders with items included
    const cateringOrders = await prisma.cateringOrder.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
      },
    });

    // Serialize both types of orders
    const serializedRegularOrders = serializeRegularOrders(regularOrders);
    const serializedCateringOrders = serializeCateringOrders(cateringOrders);
    
    // Combine and sort all orders by creation date
    const allOrders = [...serializedRegularOrders, ...serializedCateringOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20); // Limit to 20 most recent orders
    
    logger.info(`Found ${serializedRegularOrders.length} regular orders and ${serializedCateringOrders.length} catering orders for display`);

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Order Management</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/orders/manual"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Manual Order
            </Link>
            <select className="border rounded p-2">
              <option value="all">All Orders</option>
              <option value="regular">Regular Orders</option>
              <option value="catering">Catering Orders</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input type="text" placeholder="Search orders..." className="border rounded p-2" />
          </div>
        </div>

        {allOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No orders found.</div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                      {order.id ? `${order.id.substring(0, 8)}...` : 'N/A'}
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
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
