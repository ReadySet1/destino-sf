'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { CreditCard, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PendingOrder {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: Date;
  retryCount: number;
  paymentUrlExpiresAt: Date | null;
  items: Array<{
    quantity: number;
    price: number;
    product: {
      name: string;
    };
    variant?: {
      name: string;
    } | null;
  }>;
}

interface Props {
  orders: PendingOrder[];
}

export function PendingOrdersList({ orders }: Props) {
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const handleRetryPayment = async (orderId: string) => {
    setRetryingOrderId(orderId);

    try {
      const response = await fetch(`/api/orders/${orderId}/retry-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retry payment');
      }

      if (result.success && result.checkoutUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Retry payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
    } finally {
      setRetryingOrderId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Orders</h3>
            <p className="text-gray-500">
              All your orders have been completed or are being processed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => (
        <Card key={order.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                <p className="text-sm text-gray-500">
                  {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">${Number(order.total).toFixed(2)}</div>
                <Badge variant={order.status === 'PAYMENT_FAILED' ? 'danger' : 'secondary'}>
                  {order.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Order Items Summary */}
            <div className="text-sm">
              <h4 className="font-medium mb-2">Items:</h4>
              <ul className="space-y-1 text-gray-600">
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.quantity}x {item.product.name}
                    {item.variant && ` (${item.variant.name})`} - $
                    {(Number(item.price) * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Retry Information */}
            {order.retryCount > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Payment retry attempts: {order.retryCount}/3</AlertDescription>
              </Alert>
            )}

            {/* Action Button */}
            <div className="flex justify-end">
              {order.paymentMethod === 'SQUARE' && (
                <Button
                  onClick={() => handleRetryPayment(order.id)}
                  disabled={retryingOrderId === order.id || order.retryCount >= 3}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {retryingOrderId === order.id ? 'Processing...' : 'Retry Payment'}
                </Button>
              )}
              {order.paymentMethod === 'CASH' && (
                <div className="text-sm text-gray-600">
                  <p>Please visit our store to pay with cash</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
