// Responsive Orders Table Component
// This component uses the new responsive table system for better mobile experience

'use client';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatDateTime, formatCurrency } from '@/utils/formatting';
import { ResponsiveTable, createTableColumn, TableColumn } from '@/components/ui/responsive-table';
import { useState } from 'react';
import { archiveOrder, archiveCateringOrder } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Archive, Package, Calendar, CreditCard } from 'lucide-react';

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

interface ResponsiveOrdersTableProps {
  orders: UnifiedOrder[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
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

export default function ResponsiveOrdersTable({ 
  orders, 
  onSort, 
  sortKey, 
  sortDirection = 'asc' 
}: ResponsiveOrdersTableProps) {
  const { toast } = useToast();
  const [archivingOrderId, setArchivingOrderId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveOrder = async (orderId: string, orderType: 'regular' | 'catering') => {
    setArchivingOrderId(orderId);
    setShowArchiveDialog(true);
  };

  const confirmArchive = async () => {
    if (!archivingOrderId || !archiveReason.trim()) return;

    setIsArchiving(true);
    try {
      const order = orders.find(o => o.id === archivingOrderId);
      if (!order) throw new Error('Order not found');

      const result = order.type === 'catering' 
        ? await archiveCateringOrder(archivingOrderId, archiveReason)
        : await archiveOrder(archivingOrderId, archiveReason);

      if (result.success) {
        toast({
          title: 'Order Archived',
          description: 'The order has been successfully archived.',
        });
        setShowArchiveDialog(false);
        setArchiveReason('');
        setArchivingOrderId(null);
        // Refresh the page to update the list
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to archive order');
      }
    } catch (error) {
      console.error('Error archiving order:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const renderActions = (order: UnifiedOrder) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/orders/${order.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleArchiveOrder(order.id, order.type)}
          className="text-red-600"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive Order
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: TableColumn<UnifiedOrder>[] = [
    createTableColumn(
      'id',
      'Order ID',
      (order) => (
        <span className="font-mono text-sm">
          {order.id.slice(-8).toUpperCase()}
        </span>
      ),
      {
        sortable: true,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'customerName',
      'Customer',
      (order) => (
        <span className="font-medium">
          {order.customerName || 'Anonymous'}
        </span>
      ),
      {
        sortable: true,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'status',
      'Status',
      (order) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      ),
      {
        sortable: true,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'total',
      'Total',
      (order) => (
        <span className="font-medium">
          {formatCurrency(order.total)}
        </span>
      ),
      {
        sortable: true,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'date',
      'Date',
      (order) => (
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            {order.type === 'catering' && order.eventDate
              ? formatDateTime(new Date(order.eventDate))
              : order.pickupTime
              ? formatDateTime(new Date(order.pickupTime))
              : formatDateTime(new Date(order.createdAt))}
          </span>
        </div>
      ),
      {
        sortable: true,
        mobileVisible: false,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'paymentStatus',
      'Payment',
      (order) => (
        <div className="flex items-center space-x-1">
          <CreditCard className="h-4 w-4 text-gray-400" />
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
            {order.paymentStatus}
          </span>
        </div>
      ),
      {
        sortable: true,
        mobileVisible: false,
        tabletVisible: false,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'type',
      'Type',
      (order) => (
        <div className="flex items-center space-x-1">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="capitalize text-sm">
            {order.type}
          </span>
        </div>
      ),
      {
        sortable: true,
        mobileVisible: false,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'actions',
      'Actions',
      (order) => renderActions(order),
      {
        sortable: false,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
        className: 'text-right',
      }
    ),
  ];

  return (
    <>
      <ResponsiveTable
        data={orders}
        columns={columns}
        onSort={onSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        emptyMessage="No orders found"
        config={{
          mobileCardLayout: true,
          horizontalScroll: false,
          actionButtonLayout: 'dropdown',
        }}
      />

      {/* Archive Dialog */}
      {showArchiveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Archive Order</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for archiving this order:
            </p>
            <textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Reason for archiving..."
              className="w-full p-3 border border-gray-300 rounded-md mb-4 resize-none"
              rows={3}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowArchiveDialog(false);
                  setArchiveReason('');
                  setArchivingOrderId(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={isArchiving}
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={!archiveReason.trim() || isArchiving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 