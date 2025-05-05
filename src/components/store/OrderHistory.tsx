'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { UserOrder } from '@/app/api/user/orders/route'; // Import the type from the API route
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Eye } from "lucide-react";
import { Button } from '@/components/ui/button';

// Helper function to format currency
const formatCurrency = (amount: number | string | null | undefined) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericAmount);
};

// Helper function to format date
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'PPpp'); // Example format: Sep 14, 2023, 1:42:00 PM
  } catch {
    return 'Invalid Date';
  }
};

// Helper to map status to badge variant
const getStatusVariant = (status: string | null | undefined): "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'ready':
      return 'success'; // Green
    case 'pending':
      return 'warning'; // Yellow
    case 'processing':
      return 'secondary'; // Purple
    case 'cancelled':
    case 'failed':
      return 'danger'; // Red
    case 'shipping':
      return 'primary'; // Blue
    case 'delivered':
      return 'success'; // Green
    default:
      return 'outline'; // Gray
  }
};

// Define and export props for the component
export interface OrderHistoryProps {
  userId: string; // Accept userId instead of isActive
}

export function OrderHistory({ userId }: OrderHistoryProps) {
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
        // Use the userId if your API needs it (assuming it uses session internally currently)
        // Example: /api/user/orders?userId=${userId} - adjust if needed
        const response = await fetch('/api/user/orders');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data: UserOrder[] = await response.json();
        setOrders(data);
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
  }, [userId]); // Re-run effect only when userId changes

  if (isLoading) {
    return (
       <div className="flex items-center justify-center space-x-2 py-8">
         <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-yellow-500"></div>
         <span>Loading order history...</span>
       </div>
    );
  }

  if (error) {
     return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error Fetching Orders</AlertTitle>
            <AlertDescription>
              There was a problem retrieving your order history: {error}. Please try refreshing the page or contact support if the issue persists.
            </AlertDescription>
        </Alert>
     );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">You haven&apos;t placed any orders yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Determine if any order has tracking data
  const hasTrackingData = orders.some(order => !!order.trackingNumber);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              {hasTrackingData && <TableHead>Tracking</TableHead>}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                <TableCell>{formatDate(order.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(order.status)}>
                    {order.status?.toUpperCase() === 'READY' ? 'READY FOR PICKUP' : (order.status || 'N/A')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={order.paymentStatus?.toLowerCase() === 'paid' ? 'success' : 'secondary'}>
                    {order.paymentStatus || 'N/A'}
                  </Badge>
                </TableCell>
                {hasTrackingData && (
                  <TableCell>
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
                  </TableCell>
                )}
                <TableCell className="text-right">{formatCurrency(order.total?.toString())}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/account/order/${order.id}`} aria-label={`View details for order ${order.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Export the component as default if it's the main export of the file
// export default OrderHistory; - Uncomment if needed based on your file structure/imports
