'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrderConfirmationLayout } from '@/components/shared/OrderConfirmationLayout';
import { RetryPaymentButton } from '@/components/Orders/RetryPaymentButton';
import type { SerializableCateringOrderData } from './CateringConfirmationLoader';
import type { CateringOrderData, CustomerInfo } from '@/types/confirmation';

interface Props {
  status: string;
  orderData: SerializableCateringOrderData;
  squareOrderId?: string | null;
}

export default function CateringConfirmationContent({ status, orderData, squareOrderId }: Props) {
  const router = useRouter();

  // Debug logging for status determination
  console.log('🔧 [CATERING-CONFIRMATION] Status received:', status);
  console.log('🔧 [CATERING-CONFIRMATION] Order data exists:', !!orderData);
  console.log('🔧 [CATERING-CONFIRMATION] Square Order ID:', squareOrderId);

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

  // Handle various error and pending states
  if (status === 'not_found') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">🔍</div>
            <h1 className="mb-4 text-2xl font-bold">Catering Order Not Found</h1>
            <p className="text-gray-600">
              We couldn&apos;t find a catering order with that ID. Please check your order confirmation email or contact support.
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

  if (status === 'error') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">⚠️</div>
            <h1 className="mb-4 text-2xl font-bold">Error Loading Order</h1>
            <p className="text-gray-600">
              There was an error loading your catering order details. Please try refreshing the page or contact support.
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Refresh Page
            </button>
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

  if (status === 'failed') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="mb-4 text-2xl font-bold">Payment Failed</h1>
            <p className="text-gray-600">
              Your catering order payment was not successful. You can retry the payment or place a new order.
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            {/* Show retry payment button for Square payments if order data is available */}
            {orderData && orderData.id && orderData.paymentMethod === 'SQUARE' && 
             orderData.status === 'PENDING' && // Only show for PENDING status (catering orders don't have PAYMENT_FAILED)
             (orderData.paymentStatus === 'PENDING' || orderData.paymentStatus === 'FAILED') && (
              <RetryPaymentButton
                orderId={orderData.id}
                retryCount={orderData.retryCount || 0}
                disabled={(orderData.retryCount || 0) >= 3}
              />
            )}
            <button
              onClick={() => router.push('/catering')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Place New Order
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'pending') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">⏳</div>
            <h1 className="mb-4 text-2xl font-bold">Payment Processing</h1>
            <p className="text-gray-600">
              Your catering order is being processed. You can retry the payment if needed or check your email for updates.
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            {/* Show retry payment button for Square payments if order data is available */}
            {orderData && orderData.id && orderData.paymentMethod === 'SQUARE' && 
             orderData.status === 'PENDING' && // Only show for PENDING status (catering orders don't have PAYMENT_FAILED)
             (orderData.paymentStatus === 'PENDING' || orderData.paymentStatus === 'FAILED') && (
              <RetryPaymentButton
                orderId={orderData.id}
                retryCount={orderData.retryCount || 0}
                disabled={(orderData.retryCount || 0) >= 3}
              />
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Refresh Status
            </button>
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

  // Handle processing status - order was created but payment is still being processed
  if (status === 'processing') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">⏳</div>
            <h1 className="mb-4 text-2xl font-bold">Payment Processing</h1>
            <p className="text-gray-600 mb-4">
              Your catering order has been received and payment is being processed. 
              You should receive a confirmation email shortly.
            </p>
            <p className="text-sm text-gray-500">
              Order ID: {orderData?.id}
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

  // Handle pending status - order exists but payment hasn't been completed yet
  if (status === 'pending') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">📋</div>
            <h1 className="mb-4 text-2xl font-bold">Payment Required</h1>
            <p className="text-gray-600 mb-4">
              Your catering order has been created but payment is still required to confirm your order.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Order ID: {orderData?.id}
            </p>
            {orderData && (
              <div className="text-sm text-gray-600 mb-6 p-4 bg-gray-50 rounded-lg">
                <p><strong>Event Date:</strong> {new Date(orderData.eventDate).toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong> ${orderData.totalAmount.toFixed(2)}</p>
                <p><strong>Items:</strong> {orderData.items.length} items</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push(`/account/order/${orderData?.id}`)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Complete Payment
            </button>
            <button
              onClick={() => router.push('/catering')}
              className="text-gray-600 hover:text-gray-800 py-2"
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
