import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus } from '@prisma/client';
import { formatPrice, formatDateTime, formatCurrency } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Decimal } from '@prisma/client/runtime/library';

// Define the shape of the resolved params
type ResolvedParams = {
  [key: string]: string | string[] | undefined;
};

// Define our serialized order type
interface SerializedOrder {
  id: string;
  status: OrderStatus;
  customerName: string | null;
  total: number;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
  }>;
  pickupTime: string | null;
  createdAt: string;
  trackingNumber: string | null;
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

// Manual serialization for orders
function manuallySerializeOrders(orders: any[]): SerializedOrder[] {
  return orders.map(order => {
    // Serialize items
    const serializedItems = order.items?.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      price: decimalToNumber(item.price)
    })) || [];
    
    return {
      id: order.id,
      status: order.status,
      customerName: order.customerName,
      total: decimalToNumber(order.total),
      items: serializedItems,
      pickupTime: order.pickupTime ? new Date(order.pickupTime).toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      trackingNumber: order.trackingNumber,
      shippingCarrier: order.shippingCarrier
    };
  });
}

export default async function OrdersPage({ params }: { params: Promise<ResolvedParams> }) {
  await params; // We're not using the params, but we need to await the promise

  try {
    // Fetch orders with items included
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
      },
    });

    // Manually serialize the orders to handle Decimal values
    const serializedOrders = manuallySerializeOrders(orders);
    
    logger.info(`Found ${serializedOrders.length} orders for display`);

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
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input type="text" placeholder="Search orders..." className="border rounded p-2" />
          </div>
        </div>

        {serializedOrders.length === 0 ? (
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
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pickup Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serializedOrders.map((order, index) => (
                  <tr key={order.id || `order-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id ? `${order.id.substring(0, 8)}...` : 'N/A'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.items?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(order.pickupTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt ? formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.trackingNumber ? (
                        <span>
                          <span className="font-mono" aria-label="Tracking Number">{order.trackingNumber}</span>
                          {order.shippingCarrier && (
                            <>
                              {' '}<span>({order.shippingCarrier})</span>
                              {/* Tracking link for major carriers */}
                              {(() => {
                                const carrier = order.shippingCarrier?.toLowerCase();
                                let url: string | null = null;
                                if (carrier?.includes('ups')) url = `https://www.ups.com/track?tracknum=${order.trackingNumber}`;
                                else if (carrier?.includes('fedex')) url = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${order.trackingNumber}`;
                                else if (carrier?.includes('usps')) url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.trackingNumber}`;
                                if (url) {
                                  return (
                                    <>
                                      {' '}<a href={url} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 focus:outline focus:outline-2 focus:outline-blue-400" aria-label={`Track your package on ${order.shippingCarrier}`}>Track</a>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={`/admin/orders/${order.id}`}
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

function getStatusColor(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'READY':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
