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
    console.error('Error formatting date-time:', error);
    return 'Invalid date';
  }
};

export default function OrderConfirmationContent({ status, orderData }: Props) {
  const router = useRouter();
  const { clearCart } = useCartStore();

  // Clear cart and localStorage on successful payment
  useEffect(() => {
    if (status === 'success') {
      // Clear cart state
      clearCart();

      // Clear regular checkout localStorage data
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('regularCheckoutData');
          console.log('✅ [CHECKOUT] Cleared cart and localStorage after successful confirmation');
        } catch (error) {
          console.warn('🔧 [CHECKOUT] Failed to clear localStorage:', error);
        }
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
            <h1 className="mb-4 text-2xl font-bold">Order Cancelled</h1>
            <p className="text-gray-600">
              You cancelled the checkout process. Your cart items are still saved.
            </p>
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
            <p className="text-gray-600">
              There was an issue determining your order status. Please contact support.
            </p>
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

  // Handle case where order data could not be retrieved (e.g., invalid UUID, not found)
  if (status === 'success' && !orderData) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">✅</div>
            <h1 className="mb-4 text-2xl font-bold text-green-600">Thank You for Your Order!</h1>
            <p className="text-gray-600">
              Thank you for your order. We&apos;ll send you updates about your order status.
            </p>
          </div>

          <div className="rounded-lg border bg-yellow-50 p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Could not retrieve order details at this time. Please check your email for order
              confirmation.
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => router.push('/account')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              View Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Transform orderData to match StoreOrderData interface
  const transformedOrderData: StoreOrderData | null = orderData
    ? {
        id: orderData.id,
        status: orderData.status,
        total: orderData.total || 0,
        customerName: orderData.customerName || '',
        createdAt: new Date().toISOString(), // Default to current time if not available
        pickupTime: orderData.pickupTime ? orderData.pickupTime.toString() : undefined,
        paymentStatus: orderData.paymentStatus,
        // Pricing breakdown
        subtotal: orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        taxAmount: orderData.taxAmount || 0,
        deliveryFee: orderData.deliveryFee || 0,
        serviceFee: orderData.serviceFee || 0,
        gratuityAmount: orderData.gratuityAmount || 0,
        shippingCost: orderData.shippingCost || 0,
        items: orderData.items.map(item => ({
          id: item.id,
          name: item.product?.name || 'Unknown Product',
          price: item.price,
          quantity: item.quantity,
          product: item.product,
          variant: item.variant,
        })),
        fulfillment: (() => {
          // Determine fulfillment type based on the actual fulfillmentType field from the database
          // The database stores: 'pickup', 'local_delivery', 'nationwide_shipping'
          const fulfillmentType = orderData.fulfillmentType?.toLowerCase();

          // Parse address information from notes field if available
          let addressInfo = null;
          try {
            if (orderData.notes && typeof orderData.notes === 'string') {
              const parsedNotes = JSON.parse(orderData.notes);
              addressInfo = parsedNotes.deliveryAddress || parsedNotes.shippingAddress || null;
            }
          } catch (error) {
            console.warn('Failed to parse order notes for address information:', error);
          }

          if (fulfillmentType === 'nationwide_shipping') {
            return {
              type: 'shipment' as const,
              trackingNumber: orderData.trackingNumber || undefined,
              shippingCarrier: orderData.shippingCarrier || undefined,
              shipmentDetails: addressInfo
                ? {
                    recipient: {
                      displayName: addressInfo.recipientName || addressInfo.name || undefined,
                      address: {
                        addressLine1: addressInfo.street || undefined,
                        addressLine2:
                          addressInfo.street2 || addressInfo.apartmentNumber || undefined,
                        locality: addressInfo.city || undefined,
                        administrativeDistrictLevel1: addressInfo.state || undefined,
                        postalCode: addressInfo.postalCode || addressInfo.zipCode || undefined,
                      },
                    },
                  }
                : undefined,
            };
          } else if (fulfillmentType === 'local_delivery') {
            return {
              type: 'delivery' as const,
              trackingNumber: orderData.trackingNumber || undefined,
              shippingCarrier: orderData.shippingCarrier || undefined,
              deliveryDetails: addressInfo
                ? {
                    recipient: {
                      displayName: addressInfo.recipientName || addressInfo.name || undefined,
                      address: {
                        addressLine1: addressInfo.street || undefined,
                        addressLine2:
                          addressInfo.street2 || addressInfo.apartmentNumber || undefined,
                        locality: addressInfo.city || undefined,
                        administrativeDistrictLevel1: addressInfo.state || undefined,
                        postalCode: addressInfo.postalCode || addressInfo.zipCode || undefined,
                      },
                    },
                  }
                : undefined,
            };
          } else if (fulfillmentType === 'pickup') {
            return {
              type: 'pickup' as const,
              pickupTime: orderData.pickupTime ? orderData.pickupTime.toString() : undefined,
            };
          } else {
            // Fallback: if no fulfillmentType is set, try to infer from available data
            if (orderData.trackingNumber) {
              return {
                type: 'shipment' as const,
                trackingNumber: orderData.trackingNumber,
                shippingCarrier: orderData.shippingCarrier || undefined,
              };
            } else if (orderData.pickupTime) {
              return {
                type: 'pickup' as const,
                pickupTime: orderData.pickupTime.toString(),
              };
            } else {
              // Default to pickup if no specific data is available
              return {
                type: 'pickup' as const,
                pickupTime: undefined,
              };
            }
          }
        })(),
      }
    : null;

  // Extract customer info
  const customerData: CustomerInfo = transformedOrderData
    ? {
        name: transformedOrderData.customerName,
      }
    : {};

  return (
    <OrderConfirmationLayout
      orderType="store"
      status={status}
      orderData={transformedOrderData}
      customerData={customerData}
    />
  );
}
