import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

// Utility function to normalize image data from database
function normalizeImages(images: any): string[] {
  if (!images) return [];

  // Case 1: Already an array of strings
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
    return images.filter(url => url && url.trim() !== '');
  }

  // Case 2: String that might be a JSON array
  if (typeof images === 'string') {
    try {
      // First check if it's a direct URL
      if (images.startsWith('http')) {
        return [images];
      }

      // Try parsing as JSON
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter(url => url && typeof url === 'string');
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  return [];
}

export const metadata: Metadata = {
  title: 'Order Confirmation | Destino SF',
  description: 'Your order has been received and is being processed',
};

// Updated PageProps type for Next.js 15.3+
type ManualSuccessPageProps = {
  params: Promise<{}>;
  searchParams: Promise<{
    orderId?: string | string[];
    paymentMethod?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
};

async function getOrderDetails(orderId: string) {
  try {
    return await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerName: true,
        email: true,
        phone: true,
        paymentMethod: true,
        paymentStatus: true,
        status: true,
        total: true,
        taxAmount: true,
        fulfillmentType: true,
        pickupTime: true,
        deliveryDate: true,
        deliveryTime: true,
        notes: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: {
              select: {
                name: true,
                images: true,
              },
            },
            variant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

export default async function ManualSuccessPage({ searchParams }: ManualSuccessPageProps) {
  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const orderId = resolvedSearchParams.orderId?.toString();
  const paymentMethod = resolvedSearchParams.paymentMethod?.toString();

  if (!orderId) {
    redirect('/');
  }

  const order = await getOrderDetails(orderId);
  if (!order) {
    redirect('/');
  }

  const paymentMethodName = order.paymentMethod === 'CASH' ? 'Cash' : order.paymentMethod || 'Unknown';

  const paymentInstructions =
    order.paymentMethod === 'CASH'
      ? 'Please bring exact change when you pick up your order. Your order will be prepared according to your selected pickup time.'
      : 'Please contact us for payment instructions.';

  const nextSteps =
    order.paymentMethod === 'CASH'
      ? 'Your order will be ready for pickup at the scheduled time.'
      : 'We will process your order according to the selected payment method.';

  // Helper function to format fulfillment information
  const getFulfillmentInfo = () => {
    if (order.fulfillmentType === 'pickup' && order.pickupTime) {
      const pickupDate = new Date(order.pickupTime);
      return {
        method: 'Pickup',
        details: `${pickupDate.toLocaleDateString()} at ${pickupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      };
    } else if (order.fulfillmentType === 'local_delivery' && order.deliveryDate) {
      return {
        method: 'Local Delivery',
        details: `${order.deliveryDate}${order.deliveryTime ? ` at ${order.deliveryTime}` : ''}`,
      };
    } else if (order.fulfillmentType === 'nationwide_shipping') {
      return {
        method: 'Nationwide Shipping',
        details: 'Will be shipped to your address',
      };
    }
    return {
      method: order.fulfillmentType || 'Not specified',
      details: 'Details to be confirmed',
    };
  };

  const fulfillmentInfo = getFulfillmentInfo();

  // Calculate subtotal (total minus tax)
  const subtotal = order.total.toNumber() - (order.taxAmount?.toNumber() || 0);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Thank You For Your Order!</h1>
        <p className="text-lg text-gray-600">
          Your order has been received and is awaiting payment.
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between pb-2 border-b">
              <span className="font-medium">Order Reference:</span>
              <span className="font-mono text-sm">#{order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between pb-2 border-b">
              <span className="font-medium">Name:</span>
              <span>{order.customerName}</span>
            </div>
            <div className="flex justify-between pb-2 border-b">
              <span className="font-medium">Email:</span>
              <span className="text-sm">{order.email}</span>
            </div>
            {order.phone && (
              <div className="flex justify-between pb-2 border-b">
                <span className="font-medium">Phone:</span>
                <span>{order.phone}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between pb-2 border-b">
              <span className="font-medium">Payment Method:</span>
              <span>{paymentMethodName}</span>
            </div>
            <div className="flex justify-between pb-2 border-b">
              <span className="font-medium">Order Status:</span>
              <span className="capitalize">
                {order.status ? order.status.toLowerCase().replace('_', ' ') : 'pending'}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b">
              <span className="font-medium">Fulfillment:</span>
              <span>{fulfillmentInfo.method}</span>
            </div>
            <div className="flex justify-between pb-2 border-b">
              <span className="font-medium">Order Date:</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
        {order.items && order.items.length > 0 ? (
          <>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    {(() => {
                      const productImages = normalizeImages(item.product?.images);
                      const firstImage = productImages[0];
                      return firstImage ? (
                        <img
                          src={firstImage}
                          alt={item.product?.name || 'Product image'}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : null;
                    })()}
                    <div>
                      <h3 className="font-medium">{item.product?.name || 'Product'}</h3>
                      {item.variant?.name && (
                        <p className="text-sm text-gray-600">{item.variant.name}</p>
                      )}
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.price.toNumber() * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">${item.price.toNumber().toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Total */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {order.taxAmount && order.taxAmount.toNumber() > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax:</span>
                  <span>${order.taxAmount.toNumber().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>${order.total.toNumber().toFixed(2)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Order items will be displayed here once processed.</p>
            <div className="mt-4 flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>${order.total.toNumber().toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Fulfillment Information */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Fulfillment Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Method:</span>
            <span>{fulfillmentInfo.method}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Details:</span>
            <span>{fulfillmentInfo.details}</span>
          </div>
          {order.notes && (
            <div className="mt-4">
              <span className="font-medium">Special Instructions:</span>
              <p className="mt-1 text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Payment Instructions</h2>
        <p className="mb-3">{paymentInstructions}</p>
      </div>

      {/* What Happens Next */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">What Happens Next?</h2>
        <p className="mb-4">{nextSteps}</p>
        <p className="text-sm text-gray-600">
          If you have any questions about your order or any special date/time requests please
          contact us at{' '}
          <a href="mailto:orders@destino-sf.com" className="text-blue-600 hover:underline">
            orders@destino-sf.com
          </a>{' '}
          or call us at{' '}
          <a href="tel:+14155771677" className="text-blue-600 hover:underline">
            (415) 577-1677
          </a>
          . We are here to help!
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button asChild variant="default">
          <Link href="/">Return to Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/menu">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
