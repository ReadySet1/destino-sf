'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  orderId: string;
  retryCount: number;
  disabled?: boolean;
}

export function RetryPaymentButton({ orderId, retryCount, disabled }: Props) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/retry-payment`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retry payment');
      }

      if (result.success && result.checkoutUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      variant="default"
      className="flex items-center gap-2"
    >
      <CreditCard className="h-4 w-4" />
      {isRetrying ? 'Processing...' : 'Retry Payment'}
    </Button>
  );
}
