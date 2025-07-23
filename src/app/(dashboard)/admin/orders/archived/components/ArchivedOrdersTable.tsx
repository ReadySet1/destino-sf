'use client';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatDateTime, formatCurrency } from '@/utils/formatting';
import { useState } from 'react';
import { unarchiveOrder, unarchiveCateringOrder } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, RotateCcw } from 'lucide-react';

// Define our unified archived order type
interface ArchivedOrder {
  id: string;
  status: OrderStatus | CateringStatus;
  customerName: string | null;
  name?: string; // For catering orders
  total: number;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
  }>;
  pickupTime: string | null;
  eventDate?: string | null;
  createdAt: string;
  archivedAt: string;
  archivedBy: string;
  archiveReason: string | null;
  archivedByUser: {
    name: string | null;
    email: string;
  } | null;
  type: 'regular' | 'catering';
  paymentStatus: PaymentStatus;
  email: string;
}

interface ArchivedOrdersTableProps {
  orders: ArchivedOrder[];
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
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ArchivedOrdersTable({ orders }: ArchivedOrdersTableProps) {
  const { toast } = useToast();
  const [unarchivingOrderId, setUnarchivingOrderId] = useState<string | null>(null);

  const handleUnarchiveOrder = async (orderId: string, orderType: 'regular' | 'catering') => {
    setUnarchivingOrderId(orderId);

    try {
      const result = orderType === 'catering' 
        ? await unarchiveCateringOrder(orderId)
        : await unarchiveOrder(orderId);

      if (result.success) {
        toast({
          title: "Order Unarchived",
          description: `Order ${orderId.substring(0, 8)}... has been restored successfully.`,
        });
        // Refresh the page to update the list
        window.location.reload();
      } else {
        toast({
          title: "Unarchive Failed",
          description: result.error || "Failed to unarchive order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Unarchive Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUnarchivingOrderId(null);
    }
  };

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
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Archived
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
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
                  <div>
                    <div className="font-medium">{order.customerName || order.name || 'N/A'}</div>
                    <div className="text-xs text-gray-400">{order.email}</div>
                  </div>
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
                  {formatCurrency(order.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    <div>{order.archivedAt ? formatDistance(new Date(order.archivedAt), new Date(), { addSuffix: true }) : 'N/A'}</div>
                    <div className="text-xs text-gray-400">
                      by {order.archivedByUser?.name || order.archivedByUser?.email || 'Unknown'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.archiveReason || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/admin/${order.type === 'catering' ? 'catering' : 'orders'}/${order.id}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleUnarchiveOrder(order.id, order.type)}
                        disabled={unarchivingOrderId === order.id}
                        className="flex items-center gap-2 cursor-pointer text-green-600 focus:text-green-600 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {unarchivingOrderId === order.id ? 'Unarchiving...' : 'Unarchive Order'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 