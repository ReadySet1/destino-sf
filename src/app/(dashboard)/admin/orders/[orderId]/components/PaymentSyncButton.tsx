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
import { AlertCircle, RotateCcw, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ManualPaymentButtonProps {
  orderId: string;
  squareOrderId: string | null;
  paymentStatus: string;
  status: string;
}

export function ManualPaymentButton({
  orderId,
  squareOrderId,
  paymentStatus,
  status,
}: ManualPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // Only show the button if payment is pending/failed
  const shouldShowButton = ['PENDING', 'FAILED'].includes(paymentStatus.toUpperCase());

  const handlePaymentSync = async () => {
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
          notes: 'Payment status manually synchronized by administrator',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('✅ Payment synchronized successfully', {
          description: 'The order has been marked as PAID and is ready to process',
          duration: 5000,
        });

        // Refresh the page to show updated data
        router.refresh();
      } else {
        throw new Error(result.error || 'Error synchronizing payment status');
      }
    } catch (error: any) {
      console.error('Error syncing payment:', error);
      toast.error('❌ Error synchronizing', {
        description: error.message || 'Could not synchronize payment status',
        duration: 7000,
      });
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
        <span className="font-medium text-yellow-800 text-sm">Manual Payment Override</span>
      </div>

      <p className="text-sm text-yellow-700">
        If you have confirmed that the payment was completed outside the system, you can manually
        mark this order as paid.
      </p>

      <div className="flex gap-2 flex-wrap">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Confirm Manual Payment Override
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <p>
                  Are you sure you want to manually mark this order as <strong>PAID</strong>?
                </p>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p>
                    <strong>Order ID:</strong> {orderId}
                  </p>
                  <p>
                    <strong>Current Status:</strong>{' '}
                    <Badge variant="secondary">{paymentStatus}</Badge>
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  This action will change the payment status to PAID and the order status to
                  PROCESSING. Only use this if you have confirmed the payment was completed outside
                  the system.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handlePaymentSync}
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Yes, Mark as Paid
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
