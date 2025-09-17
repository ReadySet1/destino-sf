'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CreditCard, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PendingOrderAlertProps {
  existingOrder: {
    id: string;
    total: number;
    createdAt: Date;
    paymentUrl?: string;
    paymentUrlExpiresAt?: Date;
    retryCount: number;
  };
  onContinueExisting: () => void;
  onCreateNew: () => void;
  onDismiss: () => void;
}

export default function PendingOrderAlert({
  existingOrder,
  onContinueExisting,
  onCreateNew,
  onDismiss,
}: PendingOrderAlertProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRetryPayment = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/orders/${existingOrder.id}/retry-payment`, {
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
        
        // Use setTimeout to ensure the redirect happens reliably
        setTimeout(() => {
          window.location.href = result.checkoutUrl;
        }, 100);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Retry payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
      setIsProcessing(false);
    }
  };

  const canRetryPayment = existingOrder.retryCount < 3;
  const hasValidPaymentUrl = 
    existingOrder.paymentUrl && 
    existingOrder.paymentUrlExpiresAt && 
    new Date(existingOrder.paymentUrlExpiresAt) > new Date();

  const orderAge = Date.now() - new Date(existingOrder.createdAt).getTime();
  const hoursAgo = Math.floor(orderAge / (1000 * 60 * 60));
  const minutesAgo = Math.floor((orderAge % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Card className="border-orange-200 bg-orange-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <CardTitle className="text-lg text-orange-800 truncate">
              Pending Order Found
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-100 flex-shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-100">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You already have an order with the same products created{' '}
            {hoursAgo > 0 ? `${hoursAgo}h ${minutesAgo}m` : `${minutesAgo}m`} ago.
            You can complete payment for the existing order instead of creating a new one.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border border-orange-200 bg-white p-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="font-medium text-gray-700">Order #{existingOrder.id.slice(-8)}</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 w-fit">
                Payment Pending
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
              <div>
                <span className="text-gray-500">Total:</span>{' '}
                <span className="font-semibold text-green-600">${existingOrder.total.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>{' '}
                {format(new Date(existingOrder.createdAt), 'MMM d, yyyy h:mm a')}
              </div>
              {existingOrder.retryCount > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Payment attempts:</span> {existingOrder.retryCount}/3
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {canRetryPayment && (
            <Button
              onClick={handleRetryPayment}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Complete Existing Payment'}
            </Button>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={onCreateNew}
              className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              Create New Order
            </Button>

            <Button
              variant="ghost"
              onClick={onContinueExisting}
              className="w-full sm:w-auto text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            >
              View Existing Order
            </Button>
          </div>
        </div>

        {!canRetryPayment && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              This order has reached the maximum payment attempt limit (3/3).
              You can create a new order or contact support for assistance.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 