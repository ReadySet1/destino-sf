'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OrderConfirmationLayout } from '@/components/shared/OrderConfirmationLayout';
import { RetryPaymentButton } from '@/components/Orders/RetryPaymentButton';
import { useCateringCartStore } from '@/store/catering-cart';
import type { SerializableCateringOrderData } from './CateringConfirmationLoader';
import type { CateringOrderData, CustomerInfo } from '@/types/confirmation';

interface Props {
  status: string;
  orderData: SerializableCateringOrderData;
  squareOrderId?: string | null;
}

export default function CateringConfirmationContent({ status, orderData, squareOrderId }: Props) {
  const router = useRouter();
  const { clearCart } = useCateringCartStore();

  // Debug logging for status determination
  console.log('🔧 [CATERING-CONFIRMATION] Status received:', status);
  console.log('🔧 [CATERING-CONFIRMATION] Order data exists:', !!orderData);
  console.log('🔧 [CATERING-CONFIRMATION] Square Order ID:', squareOrderId);

  // Clear catering cart and localStorage data on successful confirmation
  useEffect(() => {
    if (status === 'success' && typeof window !== 'undefined') {
      try {
        // Clear catering cart state
        clearCart();

        // Clear all catering-related localStorage data
        localStorage.removeItem('cateringOrderData');
        localStorage.removeItem('cateringCart');
        localStorage.removeItem('cateringCustomerInfo');
        localStorage.removeItem('cateringDeliveryAddress');
        localStorage.removeItem('cateringFulfillmentInfo');

        console.log('✅ [CATERING] Cleared cart and localStorage after successful confirmation');
      } catch (error) {
        console.warn('🔧 [CATERING] Failed to clear cart/localStorage:', error);
      }
    }
  }, [status, clearCart]);

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
              We couldn&apos;t find a catering order with that ID. Please check your order
              confirmation email or contact support.
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
              There was an error loading your catering order details. Please try refreshing the page
              or contact support.
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
              Your catering order payment was not successful. You can retry the payment or place a
              new order.
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            {/* Show retry payment button for Square payments with pending/failed payments */}
            {orderData &&
              orderData.id &&
              orderData.paymentMethod === 'SQUARE' &&
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

  if (status === 'pending' || status === 'processing') {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">⏳</div>
            <h1 className="mb-4 text-2xl font-bold">
              {status === 'processing' ? 'Order Processing' : 'Payment Processing'}
            </h1>
            <p className="text-gray-600">
              {status === 'processing'
                ? 'Your catering order is being processed. You can complete the payment or check your email for updates.'
                : 'Your catering order is being processed. You can retry the payment if needed or check your email for updates.'}
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            {/* Show retry payment button for Square payments with pending/failed payments */}
            {orderData &&
              orderData.id &&
              orderData.paymentMethod === 'SQUARE' &&
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
    ? (() => {
        // Calculate subtotal from items
        const subtotal = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);

        // Calculate tax amount
        const taxAmount = (() => {
          const metadata = orderData.metadata as any;
          // Try to get from metadata first (stored during order creation)
          if (metadata?.taxAmount && typeof metadata.taxAmount === 'number') {
            return metadata.taxAmount;
          }
          // Fallback: calculate if metadata not available (older orders)
          const deliveryFee = orderData.deliveryFee || 0;
          const taxableAmount = subtotal + deliveryFee;
          return Math.round(taxableAmount * 0.0825 * 100) / 100;
        })();

        // Calculate service fee
        const serviceFee = (() => {
          const metadata = orderData.metadata as any;
          // Try to get from metadata first (stored during order creation)
          if (metadata?.serviceFee !== undefined && typeof metadata.serviceFee === 'number') {
            return metadata.serviceFee;
          }
          // Fallback: calculate if metadata not available (older orders)
          const deliveryFee = orderData.deliveryFee || 0;
          const taxableAmount = subtotal + deliveryFee;
          const tax = taxableAmount * 0.0825;
          const totalBeforeFee = subtotal + deliveryFee + tax;
          return Math.round(totalBeforeFee * 0.035 * 100) / 100;
        })();

        return {
          id: orderData.id,
          status: orderData.status,
          total: orderData.totalAmount,
          customerName: orderData.name,
          createdAt: orderData.createdAt.toString(),
          // Pricing breakdown
          subtotal,
          taxAmount,
          deliveryFee: orderData.deliveryFee || 0,
          serviceFee,
          gratuityAmount: 0, // Catering doesn't have gratuity
          shippingCost: 0, // Catering doesn't have shipping
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
        };
      })()
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
