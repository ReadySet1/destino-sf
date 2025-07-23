'use client';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatDateTime, formatCurrency } from '@/utils/formatting';
import SortableTableHeader from '@/components/ui/sortable-table-header';
import { useState } from 'react';
import { archiveOrder, archiveCateringOrder } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Archive } from 'lucide-react';

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
  const { toast } = useToast();
  const [archivingOrderId, setArchivingOrderId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [bulkArchiveReason, setBulkArchiveReason] = useState('');
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);

  const handleArchiveOrder = async (orderId: string, orderType: 'regular' | 'catering') => {
    setArchivingOrderId(orderId);
    setShowArchiveDialog(true);
  };

  const handleBulkArchive = async () => {
    if (selectedOrders.length === 0) return;

    setIsBulkArchiving(true);
    try {
      const { archiveBulkOrders } = await import('@/app/actions/orders');
      const result = await archiveBulkOrders(selectedOrders, bulkArchiveReason);

      if (result.success) {
        toast({
          title: "Orders Archived",
          description: `Successfully archived ${result.count} orders.`,
        });
        if (result.errors && result.errors.length > 0) {
          toast({
            title: "Some Errors Occurred",
            description: `${result.errors.length} orders could not be archived.`,
            variant: "destructive",
          });
        }
        // Refresh the page to update the list
        window.location.reload();
      } else {
        toast({
          title: "Bulk Archive Failed",
          description: result.errors?.join(', ') || "Failed to archive orders",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Bulk Archive Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkArchiving(false);
      setSelectedOrders([]);
      setBulkArchiveReason('');
      setShowBulkArchiveDialog(false);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const confirmArchive = async () => {
    if (!archivingOrderId) return;

    setIsArchiving(true);
    try {
      const order = orders.find(o => o.id === archivingOrderId);
      if (!order) return;

      const result = order.type === 'catering' 
        ? await archiveCateringOrder(archivingOrderId, archiveReason)
        : await archiveOrder(archivingOrderId, archiveReason);

      if (result.success) {
        toast({
          title: "Order Archived",
          description: `Order ${archivingOrderId.substring(0, 8)}... has been archived successfully.`,
        });
        // Refresh the page to update the list
        window.location.reload();
      } else {
        toast({
          title: "Archive Failed",
          description: result.error || "Failed to archive order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Archive Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
      setArchivingOrderId(null);
      setArchiveReason('');
      setShowArchiveDialog(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
      {/* Bulk Actions Toolbar */}
      {selectedOrders.length > 0 && (
        <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-900">
              {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setShowBulkArchiveDialog(true)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              Archive Selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
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
                        onClick={() => handleArchiveOrder(order.id, order.type)}
                        className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Archive className="h-4 w-4" />
                        Archive Order
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Archive Confirmation Dialog */}
      {showArchiveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Archive Order</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to archive this order? This will hide it from the main orders list but preserve all data.
            </p>
            <div className="mb-4">
              <label htmlFor="archive-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Archive Reason (Optional)
              </label>
              <textarea
                id="archive-reason"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Testing order, Customer request, etc."
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowArchiveDialog(false);
                  setArchivingOrderId(null);
                  setArchiveReason('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={isArchiving}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isArchiving ? 'Archiving...' : 'Archive Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Archive Confirmation Dialog */}
      {showBulkArchiveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Archive Multiple Orders</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to archive {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''}? This will hide them from the main orders list but preserve all data.
            </p>
            <div className="mb-4">
              <label htmlFor="bulk-archive-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Archive Reason (Optional)
              </label>
              <textarea
                id="bulk-archive-reason"
                value={bulkArchiveReason}
                onChange={(e) => setBulkArchiveReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Testing orders, Customer request, etc."
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowBulkArchiveDialog(false);
                  setBulkArchiveReason('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkArchive}
                disabled={isBulkArchiving}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isBulkArchiving ? 'Archiving...' : `Archive ${selectedOrders.length} Order${selectedOrders.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 