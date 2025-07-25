'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import ResponsiveOrdersTable from './ResponsiveOrdersTable';

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

interface OrdersTableWrapperProps {
  orders: UnifiedOrder[];
  sortKey: string;
  sortDirection: 'asc' | 'desc';
}

export default function OrdersTableWrapper({ 
  orders, 
  sortKey, 
  sortDirection 
}: OrdersTableWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', key);
    params.set('direction', direction);
    router.push(`?${params.toString()}`);
  };

  return (
    <ResponsiveOrdersTable 
      orders={orders}
      onSort={handleSort}
      sortKey={sortKey}
      sortDirection={sortDirection}
    />
  );
} 