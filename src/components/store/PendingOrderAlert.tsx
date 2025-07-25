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
        window.location.href = result.checkoutUrl;
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
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg text-orange-800">
              Orden Pendiente Encontrada
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-100">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Ya tienes una orden con los mismos productos creada hace{' '}
            {hoursAgo > 0 ? `${hoursAgo}h ${minutesAgo}m` : `${minutesAgo}m`}.
            Puedes completar el pago de la orden existente en lugar de crear una nueva.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border border-orange-200 bg-white p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Orden #{existingOrder.id.slice(-8)}</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Pago Pendiente
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600">
              <div>Total: <span className="font-semibold text-green-600">${existingOrder.total.toFixed(2)}</span></div>
              <div>Creada: {format(new Date(existingOrder.createdAt), 'MMM d, yyyy h:mm a')}</div>
              {existingOrder.retryCount > 0 && (
                <div>Intentos de pago: {existingOrder.retryCount}/3</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {canRetryPayment && (
            <Button
              onClick={handleRetryPayment}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4" />
              {isProcessing ? 'Procesando...' : 'Completar Pago Existente'}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onCreateNew}
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            Crear Nueva Orden
          </Button>

          <Button
            variant="ghost"
            onClick={onContinueExisting}
            className="text-gray-600 hover:text-gray-800"
          >
            Ver Orden Existente
          </Button>
        </div>

        {!canRetryPayment && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Esta orden ha alcanzado el límite máximo de intentos de pago (3/3).
              Puedes crear una nueva orden o contactar soporte.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 