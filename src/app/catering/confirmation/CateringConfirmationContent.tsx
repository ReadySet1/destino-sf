'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrderConfirmationLayout } from '@/components/shared/OrderConfirmationLayout';
import type { SerializableCateringOrderData } from './page';
import type { CateringOrderData, CustomerInfo } from '@/types/confirmation';

interface Props {
  status: string;
  orderData: SerializableCateringOrderData;
  squareOrderId?: string | null;
}

export default function CateringConfirmationContent({ status, orderData, squareOrderId }: Props) {
  const router = useRouter();

  // Clear localStorage catering order data on successful confirmation
  useEffect(() => {
    if (status === 'success' && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cateringOrderData');
        localStorage.removeItem('cateringCart');
        console.log('🔧 [CATERING] Cleared localStorage catering data after successful confirmation');
      } catch (error) {
        console.warn('🔧 [CATERING] Failed to clear localStorage:', error);
      }
    }
  }, [status]);

  // Handle error states with simple fallback UI
  if (status === 'cancelled') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="mb-4 text-2xl font-bold">Catering Order Cancelled</h1>
            <p className="text-gray-600">
              You cancelled the checkout process. You can start a new catering order anytime.
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/catering')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Catering
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (status !== 'success' && status !== 'confirmed') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">❓</div>
            <h1 className="mb-4 text-2xl font-bold">Catering Order Status Unknown</h1>
            <p className="text-gray-600">
              There was an issue determining your catering order status. Please contact support.
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/catering')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Catering
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Transform orderData to match CateringOrderData interface
  const transformedOrderData: CateringOrderData | null = orderData
    ? {
        id: orderData.id,
        status: orderData.status,
        total: orderData.totalAmount,
        customerName: orderData.name,
        createdAt: orderData.createdAt.toString(),
        eventDetails: {
          eventDate: orderData.eventDate.toString(),
          specialRequests: orderData.specialRequests || undefined,
        },
        items: orderData.items.map(item => ({
          id: item.id,
          name: item.itemName,
          price: item.pricePerUnit,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
          metadata: {
            type: item.itemType === 'package' ? 'package' : 'item',
          },
        })),
        totalAmount: orderData.totalAmount,
      }
    : null;

  // Extract customer info
  const customerData: CustomerInfo = orderData
    ? {
        name: orderData.name,
        email: orderData.email,
        phone: orderData.phone,
      }
    : {};

  // Payment details for Square redirect
  const paymentDetails = {
    isSquareRedirect: !!squareOrderId,
    squareStatus: status === 'success' ? 'success' : undefined,
    squareOrderId: squareOrderId || undefined,
  };

  return (
    <OrderConfirmationLayout
      orderType="catering"
      status={status}
      orderData={transformedOrderData}
      customerData={customerData}
      paymentDetails={paymentDetails}
    />
  );
}
