import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus } from '@prisma/client';

type OrderWithItems = {
  id: string;
  status: OrderStatus;
  total: Decimal;
  customerName: string;
  pickupTime: Date | null;
  createdAt: Date;
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      [key: string]: string | number | boolean | null | undefined;
    };
    variant: {
      id: string;
      name: string;
      [key: string]: string | number | boolean | null | undefined;
    } | null;
    [key: string]: string | number | boolean | null | undefined | object;
  }>;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  fulfillmentType?: string | null;
};

// Define the shape of the resolved params
type ResolvedParams = {
  [key: string]: string | string[] | undefined;
};

export default async function OrdersPage({ params }: { params: Promise<ResolvedParams> }) {
  await params; // We're not using the params, but we need to await the promise

  // Fetch the most recent orders
  const ordersFromDb = await prisma.order.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      status: true,
      total: true,
      customerName: true,
      pickupTime: true,
      createdAt: true,
      trackingNumber: true,
      shippingCarrier: true,
      fulfillmentType: true,
      items: {
        select: {
          id: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Transform the orders to match our expected type
  const orders = ordersFromDb.map(
    (order) => ({
      id: order.id,
      status: order.status,
      total: order.total,
      customerName: order.customerName,
      pickupTime: order.pickupTime,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
        },
        variant: item.variant,
      })),
      trackingNumber: order.trackingNumber,
      shippingCarrier: order.shippingCarrier,
      fulfillmentType: order.fulfillmentType,
    })
  ) as OrderWithItems[];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <div className="flex gap-2">
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

      {orders.length === 0 ? (
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
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.items.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.pickupTime ? new Date(order.pickupTime).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Tracking info: only show if trackingNumber exists */}
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
