// app/(store)/order-confirmation/OrderConfirmationContent.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns'; // Import date-fns for formatting
// Import the serializable type
import type { SerializableFetchedOrderData } from './page';

// Helper function to format currency (now expects number)
const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    // No longer need to convert from Decimal
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Helper function to format date/time
const formatDateTime = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A';
  try {
    // Use date-fns format for consistent output
    return format(new Date(date), 'PP, p'); // e.g., May 1, 2025, 2:00 PM
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid Date';
  }
};

interface Props {
  status: string;
  orderData: SerializableFetchedOrderData; // Use the serializable type
}

export default function OrderConfirmationContent({ status, orderData }: Props) {
  const router = useRouter();
  const { clearCart } = useCartStore();
  
  // Clear cart on successful payment
  useEffect(() => {
    if (status === 'success') {
      clearCart();
    }
  }, [status, clearCart]);
  
  // Determine content based on status and orderData
  let title: string;
  let message: string | React.ReactNode;
  let icon: string;

  if (status === 'success') {
    if (orderData) {
      title = 'Thank You for Your Order!';
      message = `Your payment was successful and order #${orderData.id.substring(0, 8)}... has been placed.`;
      icon = '✅';
    } else {
      title = 'Thank You for Your Order!';
      message = 'Your payment was successful. We are processing your order details.';
      icon = '✅';
      // Optionally show an error if orderData is null when status is success
      // message = 'Your payment was successful, but we encountered an issue retrieving the full order details. Please check your email.';
      // icon = '⚠️';
    }
  } else if (status === 'cancelled') {
    title = 'Order Cancelled';
    message = 'You cancelled the checkout process. Your cart items are still saved.';
    icon = '❌';
  } else {
    title = 'Order Status Unknown';
    message = 'There was an issue determining your order status. Please contact support.';
    icon = '❓';
  }
  
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">{icon}</div>
          <h1 className="mb-4 text-2xl font-bold">{title}</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Display Order Details if successful and data exists */}
        {status === 'success' && orderData && (
          <div className="mb-8 space-y-4 border-t pt-6 text-sm">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            <p><strong>Order ID:</strong> {orderData.id}</p>
            <p><strong>Customer:</strong> {orderData.customerName || 'N/A'}</p>
            <p><strong>Pickup Time:</strong> {formatDateTime(orderData.pickupTime)}</p>
            <p><strong>Total Paid:</strong> {formatCurrency(orderData.total)}</p>

            {/* Tracking Number Section */}
            {orderData.trackingNumber && (
              <div aria-live="polite" className="bg-blue-50 border border-blue-200 rounded p-3 mt-2" role="region" aria-label="Shipping Tracking Information">
                <strong>Tracking Number:</strong> {orderData.trackingNumber}
                {orderData.shippingCarrier && (
                  <>
                    {' '}<span>({orderData.shippingCarrier})</span>
                    {/* Optionally, add a tracking link for common carriers */}
                    {(() => {
                      const carrier = orderData.shippingCarrier?.toLowerCase();
                      let url: string | null = null;
                      if (carrier?.includes('ups')) url = `https://www.ups.com/track?tracknum=${orderData.trackingNumber}`;
                      else if (carrier?.includes('fedex')) url = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${orderData.trackingNumber}`;
                      else if (carrier?.includes('usps')) url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${orderData.trackingNumber}`;
                      if (url) {
                        return (
                          <>
                            {' '}<a href={url} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 focus:outline focus:outline-2 focus:outline-blue-400" aria-label={`Track your package on ${orderData.shippingCarrier}`}>Track Package</a>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
              </div>
            )}

            <h3 className="font-semibold pt-2">Items:</h3>
            {orderData.items.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {orderData.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.product?.name || 'Unknown Product'}
                    {item.variant?.name && ` (${item.variant.name})`}
                    {' - '}{formatCurrency(item.price)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No items found for this order.</p>
            )}
          </div>
        )}

        {/* Error message if success but no data */}
        {status === 'success' && !orderData && (
            <p className="text-center text-red-600 mb-6">Could not retrieve order details at this time.</p>
        )}
        
        <div className="flex flex-col gap-4 border-t pt-6">
          <Button 
            onClick={() => router.push('/')}
            className="w-full"
          >
            Continue Shopping
          </Button>
          
          {/* Link to account/orders page if applicable */}
          {/* <Button variant="outline" onClick={() => router.push('/account/orders')} className="w-full">
            View My Orders
          </Button> */} 
        </div>
      </div>
    </main>
  );
}