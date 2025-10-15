'use client';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatDateTime, formatCurrency } from '@/utils/formatting';
import { ResponsiveTable, createTableColumn, TableColumn } from '@/components/ui/responsive-table';
import { useState } from 'react';
import { unarchiveOrder, unarchiveCateringOrder } from '@/app/actions/orders';
import { toast } from '@/lib/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  RotateCcw,
  Package,
  Calendar,
  CreditCard,
  User,
  FileText,
} from 'lucide-react';

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

export default function ArchivedOrdersTable({ orders }: ArchivedOrdersTableProps) {
  const [unarchivingOrderId, setUnarchivingOrderId] = useState<string | null>(null);

  const handleUnarchiveOrder = async (orderId: string, orderType: 'regular' | 'catering') => {
    setUnarchivingOrderId(orderId);

    try {
      const result =
        orderType === 'catering'
          ? await unarchiveCateringOrder(orderId)
          : await unarchiveOrder(orderId);

      if (result.success) {
        toast.success('Order Unarchived', {
          description: `Order ${orderId.substring(0, 8)}... has been restored successfully.`,
        });
        // Refresh the page to update the list
        window.location.reload();
      } else {
        toast.error('Unarchive Failed', {
          description: result.error || 'Failed to unarchive order',
        });
      }
    } catch (error) {
      toast.error('Unarchive Failed', {
        description: 'An unexpected error occurred',
      });
    } finally {
      setUnarchivingOrderId(null);
    }
  };

  const renderActions = (order: ArchivedOrder) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/${order.type === 'catering' ? 'catering' : 'orders'}/${order.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleUnarchiveOrder(order.id, order.type)}
          disabled={unarchivingOrderId === order.id}
          className="text-green-600"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {unarchivingOrderId === order.id ? 'Unarchiving...' : 'Unarchive Order'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: TableColumn<ArchivedOrder>[] = [
    createTableColumn(
      'id',
      'Order ID',
      order => (
        <Link
          href={`/admin/${order.type === 'catering' ? 'catering' : 'orders'}/${order.id}`}
          className="text-indigo-600 hover:text-indigo-900 hover:underline font-mono text-sm"
        >
          {order.id.slice(-8).toUpperCase()}
        </Link>
      ),
      {
        sortable: false,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'type',
      'Type',
      order => (
        <div className="flex items-center space-x-1">
          <Package className="h-4 w-4 text-gray-400" />
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.type === 'catering' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
          >
            {order.type === 'catering' ? 'CATERING' : 'REGULAR'}
          </span>
        </div>
      ),
      {
        sortable: false,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'customerName',
      'Customer',
      order => (
        <div>
          <div className="font-medium">{order.customerName || order.name || 'Anonymous'}</div>
          <div className="text-xs text-gray-400">{order.email}</div>
        </div>
      ),
      {
        sortable: false,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'status',
      'Status',
      order => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
        >
          {order.status}
        </span>
      ),
      {
        sortable: false,
        mobileVisible: false,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'paymentStatus',
      'Payment',
      order => (
        <div className="flex items-center space-x-1">
          <CreditCard className="h-4 w-4 text-gray-400" />
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}
          >
            {order.paymentStatus}
          </span>
        </div>
      ),
      {
        sortable: false,
        mobileVisible: false,
        tabletVisible: false,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'total',
      'Total',
      order => <span className="font-medium">{formatCurrency(order.total)}</span>,
      {
        sortable: false,
        mobileVisible: true,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'archivedAt',
      'Archived',
      order => (
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm">
              {order.archivedAt
                ? formatDistance(new Date(order.archivedAt), new Date(), {
                    addSuffix: true,
                  })
                : 'N/A'}
            </div>
            <div className="text-xs text-gray-400 flex items-center">
              <User className="h-3 w-3 mr-1" />
              {order.archivedByUser?.name || order.archivedByUser?.email || 'Unknown'}
            </div>
          </div>
        </div>
      ),
      {
        sortable: false,
        mobileVisible: false,
        tabletVisible: true,
        desktopVisible: true,
      }
    ),
    createTableColumn(
      'archiveReason',
      'Reason',
      order => (
        <div className="flex items-center space-x-1">
          <FileText className="h-4 w-4 text-gray-400" />
          <span
            className="text-sm text-gray-600 max-w-32 truncate"
            title={order.archiveReason || ''}
          >
            {order.archiveReason || '-'}
          </span>
        </div>
      ),
      {
        sortable: false,
        mobileVisible: false,
        tabletVisible: false,
        desktopVisible: true,
      }
    ),
    createTableColumn('actions', 'Actions', order => renderActions(order), {
      sortable: false,
      mobileVisible: true,
      tabletVisible: true,
      desktopVisible: true,
      className: 'text-right',
    }),
  ];

  return (
    <ResponsiveTable
      data={orders}
      columns={columns}
      emptyMessage="No archived orders found"
      config={{
        mobileCardLayout: true,
        horizontalScroll: false,
        actionButtonLayout: 'dropdown',
      }}
    />
  );
}
