'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderHistoryProps {
  _userId: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  total: number;
  pickupTime: string;
  createdAt: string;
  items: OrderItem[];
}

export function OrderHistory({ _userId }: OrderHistoryProps) {
  const [_orders, _setOrders] = useState<Order[]>([]);
  const [isLoading, _setIsLoading] = useState(true);
  const [_error, _setError] = useState<string | null>(null);
  
  // Temporarily disable fetching from the API to avoid the Prisma error
  // useEffect(() => {
  //   const fetchOrders = async () => {
  //     setIsLoading(true);
  //     setError(null);
  //     
  //     try {
  //       const response = await fetch(`/api/orders?userId=${_userId}`);
  //       
  //       if (!response.ok) {
  //         throw new Error('Failed to fetch orders');
  //       }
  //       
  //       const data = await response.json();
  //       _setOrders(data.orders);
  //     } catch (err: unknown) {
  //       _setError(err instanceof Error ? err.message : 'An error occurred while fetching your orders');
  //       _setOrders([]);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   
  //   fetchOrders();
  // }, [_userId]);
  
  // Helper function to get status badge color
  const _getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary">Processing</Badge>;
      case 'READY':
        return <Badge variant="default" className="bg-yellow-500">Ready for Pickup</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>View your past orders and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-yellow-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (_error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>View your past orders and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
            {_error}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
        <CardDescription>View your past orders and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="py-6 text-center">
          <p className="mb-4 text-gray-500">
            We&apos;re currently updating our order history feature. Please check back soon.
          </p>
          <Link href="/menu">
            <Button>Browse Menu</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
