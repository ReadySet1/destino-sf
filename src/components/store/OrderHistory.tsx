'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { UserOrder } from '@/app/api/user/orders/route'; // Updated import
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Eye, Calendar, Users, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper function to format currency
const formatCurrency = (amount: number | string | null | undefined) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericAmount);
};

// Helper function to format date
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'MMM dd, yyyy'); // Shorter format for table
  } catch {
    return 'Invalid Date';
  }
};

// Helper to map status to badge variant
const getStatusVariant = (
  status: string | null | undefined
): 'default' | 'primary' | 'secondary' | 'outline' => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'ready':
      return 'default'; // Green
    case 'pending':
      return 'secondary'; // Yellow
    case 'processing':
    case 'confirmed':
    case 'preparing':
      return 'outline'; // Purple
    case 'cancelled':
    case 'failed':
      return 'secondary'; // Red-like
    case 'shipping':
      return 'default'; // Blue
    case 'delivered':
      return 'default'; // Green
    default:
      return 'outline'; // Gray
  }
};

// Helper to get order type badge
const getOrderTypeBadge = (order: UserOrder) => {
  if (order.type === 'catering') {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
        CATERING
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
        REGULAR
      </Badge>
    );
  }
};

// Define and export props for the component
export interface OrderHistoryProps {
  userId: string; // Accept userId instead of isActive
  limit?: number; // Add limit prop for showing fewer orders on account page
}

export function OrderHistory({ userId, limit }: OrderHistoryProps) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if userId is not available (though it should be)
    if (!userId) {
      setIsLoading(false);
      setError('User ID is missing, cannot fetch orders.');
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/user/orders');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data: UserOrder[] = await response.json();
        // Apply limit if specified
        const filteredData = limit ? data.slice(0, limit) : data;
        setOrders(filteredData);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch orders when the component mounts or userId changes
    console.log('OrderHistory: Fetching orders for user:', userId);
    void fetchOrders();

    // No need to return a cleanup function unless you have subscriptions
  }, [userId, limit]); // Re-run effect only when userId or limit changes

  if (isLoading) {
    return (
      <div className="flex items-center justify-center space-x-2 py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600"></div>
        <span className="text-gray-600">Loading orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Unable to Load Orders</AlertTitle>
        <AlertDescription>
          {error}. Please try refreshing the page or contact support if the issue persists.
        </AlertDescription>
      </Alert>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Package className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-500 mb-6">
          You haven&apos;t placed any orders yet. Start exploring our menu!
        </p>
        <Button asChild>
          <Link href="/menu" className="bg-primary hover:bg-primary/90">
            Browse Menu
          </Link>
        </Button>
      </div>
    );
  }

  // For responsive design, show simplified version on mobile
  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-medium text-gray-700">Order</TableHead>
                <TableHead className="font-medium text-gray-700">Type</TableHead>
                <TableHead className="font-medium text-gray-700">Date</TableHead>
                <TableHead className="font-medium text-gray-700">Status</TableHead>
                <TableHead className="font-medium text-gray-700 text-right">Total</TableHead>
                <TableHead className="font-medium text-gray-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="font-medium text-gray-900">#{order.id.substring(0, 8)}</div>
                    <div className="text-sm text-gray-500">{formatDate(order.createdAt)}</div>
                  </TableCell>
                  <TableCell>{getOrderTypeBadge(order)}</TableCell>
                  <TableCell>
                    {order.type === 'catering' && order.eventDate ? (
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className="h-3 w-3 text-amber-600" />
                        <span>{format(new Date(order.eventDate), 'MMM dd')}</span>
                        {order.numberOfPeople && (
                          <>
                            <Users className="h-3 w-3 text-amber-600 ml-2" />
                            <span>{order.numberOfPeople}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)} className="text-xs">
                      {order.status?.toUpperCase() || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <Link href={`/account/order/${order.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {orders.map(order => (
          <div
            key={order.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-gray-900">#{order.id.substring(0, 8)}</div>
                <div className="text-sm text-gray-500">{formatDate(order.createdAt)}</div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {getOrderTypeBadge(order)}
                <Badge variant={getStatusVariant(order.status)} className="text-xs">
                  {order.status?.toUpperCase() || 'N/A'}
                </Badge>
              </div>
            </div>

            {order.type === 'catering' && order.eventDate && (
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3 p-2 bg-amber-50 rounded-lg">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-amber-600" />
                  <span>{format(new Date(order.eventDate), 'MMM dd')}</span>
                </div>
                {order.numberOfPeople && (
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3 text-amber-600" />
                    <span>{order.numberOfPeople} people</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="font-medium text-lg text-gray-900">{formatCurrency(order.total)}</div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <Link href={`/account/order/${order.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {limit && orders.length >= limit && (
        <div className="text-center pt-4 border-t border-gray-200">
          <Button
            asChild
            variant="outline"
            className="border-amber-200 text-amber-600 hover:bg-amber-50"
          >
            <Link href="/account/orders">View All Orders ({orders.length}+)</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// Export the component as default if it's the main export of the file
// export default OrderHistory; - Uncomment if needed based on your file structure/imports
