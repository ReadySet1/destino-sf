// app/(store)/order-confirmation/OrderConfirmationContent.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { Button } from '@/components/ui/button';

export default function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCartStore();
  
  // Extract status from query params (provided by Square redirect)
  const status = searchParams.get('status') || '';
  const orderId = searchParams.get('orderId') || '';
  
  // Clear cart on successful payment
  useEffect(() => {
    if (status === 'success') {
      clearCart();
    }
  }, [status, clearCart]);
  
  // Show different messages based on status
  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return {
          title: 'Thank You for Your Order!',
          message: 'Your payment was successful and your order has been placed.',
          icon: '✅'
        };
      case 'cancelled':
        return {
          title: 'Order Cancelled',
          message: 'You cancelled the checkout process. Your cart items are still saved.',
          icon: '❌'
        };
      default:
        return {
          title: 'Order Status',
          message: 'We have received your payment request. Please check your email for confirmation.',
          icon: '🔄'
        };
    }
  };
  
  const statusInfo = getStatusMessage();
  
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">{statusInfo.icon}</div>
          <h1 className="mb-4 text-2xl font-bold">{statusInfo.title}</h1>
          <p className="text-gray-600">{statusInfo.message}</p>
          
          {orderId && (
            <p className="mt-2 text-sm text-gray-500">
              Order ID: {orderId}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-4">
          <Button 
            onClick={() => router.push('/')}
            className="w-full"
          >
            Continue Shopping
          </Button>
          
          {status !== 'success' && (
            <Button 
              onClick={() => router.push('/cart')}
              variant="outline"
              className="w-full"
            >
              Return to Cart
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}