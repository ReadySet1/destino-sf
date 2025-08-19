'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaymentSyncButtonProps {
  orderId: string;
  squareOrderId: string | null;
  paymentStatus: string;
  status: string;
}

export function PaymentSyncButton({ 
  orderId, 
  squareOrderId, 
  paymentStatus, 
  status 
}: PaymentSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // Only show the button if payment is pending/failed and we have a Square order ID
  const shouldShowButton = 
    squareOrderId && 
    ['PENDING', 'FAILED'].includes(paymentStatus.toUpperCase());

  const handlePaymentSync = async () => {
    if (!squareOrderId) {
      toast.error('No se puede sincronizar: falta el ID de Square');
      return;
    }

    setIsLoading(true);
    setIsDialogOpen(false);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: 'PAID',
          squareOrderId: squareOrderId,
          notes: 'Estado de pago sincronizado manualmente por el administrador'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('✅ Pago sincronizado correctamente', {
          description: 'La orden ha sido marcada como PAGADA y está lista para procesar',
          duration: 5000,
        });
        
        // Refresh the page to show updated data
        router.refresh();
      } else {
        throw new Error(result.error || 'Error al sincronizar el estado de pago');
      }
    } catch (error: any) {
      console.error('Error syncing payment:', error);
      toast.error('❌ Error al sincronizar', {
        description: error.message || 'No se pudo sincronizar el estado de pago',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckSquareStatus = async () => {
    if (!squareOrderId) return;

    setIsLoading(true);
    try {
      // Get current order status for debugging
      const response = await fetch(`/api/admin/orders/${orderId}/payment-status`);
      const result = await response.json();

      if (response.ok && result.success) {
        const { order } = result;
        toast.info('ℹ️ Estado actual de la orden', {
          description: `🏪 Pago: ${order.paymentStatus} | 📦 Estado: ${order.status}`,
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('Error checking status:', error);
      toast.error('Error al verificar el estado');
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldShowButton) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <span className="font-medium text-yellow-800 text-sm">
          Sincronización de Pago Necesaria
        </span>
      </div>
      
      <p className="text-sm text-yellow-700">
        El pago puede haber sido procesado exitosamente en Square pero el webhook no sincronizó correctamente. 
        Usa estos botones para verificar y corregir el estado del pago.
      </p>

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleCheckSquareStatus}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Verificar Estado
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Marcar Como Pagado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Confirmar Sincronización de Pago
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <p>
                  ¿Estás seguro de que quieres marcar esta orden como <strong>PAGADA</strong>?
                </p>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p><strong>Orden ID:</strong> {orderId}</p>
                  <p><strong>Square ID:</strong> {squareOrderId}</p>
                  <p><strong>Estado actual:</strong> <Badge variant="secondary">{paymentStatus}</Badge></p>
                </div>
                <p className="text-sm text-gray-600">
                  Esta acción cambiará el estado de pago a PAGADO y el estado de la orden a PROCESANDO.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={handlePaymentSync}
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Sí, Marcar Como Pagado
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-xs text-yellow-600">
        <strong>Square Order ID:</strong> {squareOrderId}
      </div>
    </div>
  );
}
