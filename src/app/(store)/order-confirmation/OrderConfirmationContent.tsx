'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { format } from 'date-fns';
import { OrderConfirmationLayout } from '@/components/shared/OrderConfirmationLayout';
import type { SerializableFetchedOrderData } from './page';
import type { StoreOrderData, CustomerInfo } from '@/types/confirmation';

interface Props {
  status: string;
  orderData: SerializableFetchedOrderData;
}

// Helper function to format currency (now expects number)
const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Helper function to format date-time
const formatDateTime = (dateTime: string | Date | null | undefined): string => {
  if (!dateTime) return 'Not specified';
  try {
    return format(new Date(dateTime), 'PPP p');
  } catch (error) {
    console.error("Error formatting date-time:", error);
    return 'Invalid date';
  }
};

export default function OrderConfirmationContent({ status, orderData }: Props) {
  const router = useRouter();
  const { clearCart } = useCartStore();
  
  // Clear cart on successful payment
  useEffect(() => {
    if (status === 'success') {
      clearCart();
    }
  }, [status, clearCart]);

  // Handle error states with simple fallback UI
  if (status === 'cancelled') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="mb-4 text-2xl font-bold">Order Cancelled</h1>
            <p className="text-gray-600">You cancelled the checkout process. Your cart items are still saved.</p>
          </div>
          <div className="flex justify-center">
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (status !== 'success') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">❓</div>
            <h1 className="mb-4 text-2xl font-bold">Order Status Unknown</h1>
            <p className="text-gray-600">There was an issue determining your order status. Please contact support.</p>
          </div>
          <div className="flex justify-center">
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Transform orderData to match StoreOrderData interface
  const transformedOrderData: StoreOrderData | null = orderData ? {
    id: orderData.id,
    status: orderData.status,
    total: orderData.total || 0,
    customerName: orderData.customerName || '',
    createdAt: new Date().toISOString(), // Default to current time if not available
    pickupTime: orderData.pickupTime ? orderData.pickupTime.toString() : undefined,
    paymentStatus: orderData.paymentStatus,
    items: orderData.items.map(item => ({
      id: item.id,
      name: item.product?.name || 'Unknown Product',
      price: item.price,
      quantity: item.quantity,
      product: item.product,
      variant: item.variant
    })),
    fulfillment: orderData.trackingNumber ? {
      type: 'shipment' as const,
      trackingNumber: orderData.trackingNumber,
      shippingCarrier: orderData.shippingCarrier || undefined
    } : {
      type: 'pickup' as const,
      pickupTime: orderData.pickupTime ? orderData.pickupTime.toString() : undefined
    }
  } : null;

  // Extract customer info
  const customerData: CustomerInfo = transformedOrderData ? {
    name: transformedOrderData.customerName
  } : {};

  return (
    <OrderConfirmationLayout
      orderType="store"
      status={status}
      orderData={transformedOrderData}
      customerData={customerData}
    />
  );
}