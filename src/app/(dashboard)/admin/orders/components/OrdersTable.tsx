'use client';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatDateTime, formatCurrency } from '@/utils/formatting';
import SortableTableHeader from '@/components/ui/sortable-table-header';

// Define our unified order type (same as in page.tsx)
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

interface OrdersTableProps {
  orders: UnifiedOrder[];
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

export default function OrdersTable({ orders }: OrdersTableProps) {
  return (
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
              <SortableTableHeader column="customerName">
                Customer
              </SortableTableHeader>
              <SortableTableHeader column="status">
                Status
              </SortableTableHeader>
              <SortableTableHeader column="paymentStatus">
                Payment
              </SortableTableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <SortableTableHeader column="total">
                Total
              </SortableTableHeader>
              <SortableTableHeader column="date">
                Date
              </SortableTableHeader>
              <SortableTableHeader column="createdAt">
                Created
              </SortableTableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order, index) => (
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
  );
} 