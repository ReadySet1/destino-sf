import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { formatDateTime } from '@/utils/formatting';
import { ShoppingCart } from 'lucide-react';

interface RecentOrder {
  id: string;
  customer: string;
  total: number;
  status: string;
  createdAt: string;
}

interface RecentOrdersListProps {
  orders: RecentOrder[];
}

export function RecentOrdersList({ orders }: RecentOrdersListProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="text-center">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No recent orders</p>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'success' as const;
      case 'pending':
      case 'processing':
        return 'warning' as const;
      case 'cancelled':
      case 'failed':
        return 'danger' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Order #{order.id}</div>
              <Badge variant={getStatusVariant(order.status)}>
                {order.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {order.customer}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDateTime(order.createdAt)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">{formatCurrency(order.total)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
