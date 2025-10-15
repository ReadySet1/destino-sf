'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Wrench } from 'lucide-react';

interface SquareErrorFixerProps {
  orderId: string;
}

interface FixStatus {
  needsFixing: boolean;
  squareErrorDetected: boolean;
  currentStatus: {
    order: string;
    payment: string;
    hasSquareOrderId: boolean;
    hasValidPaymentUrl: boolean;
  };
  recommendations: string[];
}

export function SquareErrorFixer({ orderId }: SquareErrorFixerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<FixStatus | null>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/fix-square-error`);

      if (!response.ok) {
        throw new Error('Failed to check order status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fixSquareError = async () => {
    if (!status?.needsFixing && !status?.squareErrorDetected) {
      setError('Order does not appear to need fixing');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFixResult(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/fix-square-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fix Square error');
      }

      const data = await response.json();
      setFixResult(data);

      // Refresh status after fix
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Square Payment Error Fixer
        </CardTitle>
        <CardDescription>
          Diagnose and fix Square payment errors for order {orderId}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Check Status Button */}
        <Button onClick={checkStatus} disabled={isLoading} variant="outline" className="w-full">
          {isLoading ? 'Checking...' : 'Check Order Status'}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Display */}
        {status && (
          <div className="space-y-3">
            <Alert
              variant={status.needsFixing || status.squareErrorDetected ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Diagnosis:</strong>{' '}
                {status.needsFixing || status.squareErrorDetected
                  ? 'Order has Square payment issues that need fixing'
                  : 'Order appears to be functioning normally'}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Order Status:</strong> {status.currentStatus.order}
              </div>
              <div>
                <strong>Payment Status:</strong> {status.currentStatus.payment}
              </div>
              <div>
                <strong>Square Order ID:</strong>{' '}
                {status.currentStatus.hasSquareOrderId ? 'Present' : 'Missing'}
              </div>
              <div>
                <strong>Payment URL:</strong>{' '}
                {status.currentStatus.hasValidPaymentUrl ? 'Valid' : 'Invalid/Expired'}
              </div>
            </div>

            <div>
              <strong>Recommendations:</strong>
              <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                {status.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Fix Button */}
            {(status.needsFixing || status.squareErrorDetected) && (
              <Button
                onClick={fixSquareError}
                disabled={isLoading}
                className="w-full"
                variant="destructive"
              >
                {isLoading ? 'Fixing...' : 'Fix Square Error'}
              </Button>
            )}
          </div>
        )}

        {/* Fix Result Display */}
        {fixResult && (
          <Alert variant="default" className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold text-green-800">{fixResult.message}</div>
                <div>
                  <strong>Actions Taken:</strong>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {fixResult.actions?.map((action: string, idx: number) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-sm text-green-700 font-medium">
                  ✅ Customer can now retry payment through the normal checkout process
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
