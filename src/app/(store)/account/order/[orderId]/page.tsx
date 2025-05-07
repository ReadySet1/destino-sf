import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Types
interface PageProps {
  params: Promise<{ orderId: string }>;
}

// Helper to format dates consistently
const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'PPpp'); // Format: Apr 29, 2025, 1:30 PM
  } catch (error) {
    return 'Invalid date';
  }
};

// Helper to format currency
const formatCurrency = (amount: number | string | null | undefined): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericAmount);
};

// Helper to get badge variant for different order statuses
const getStatusVariant = (status: string | null | undefined): "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline" | undefined => {
  if (!status) return "secondary";
  
  const statusMap: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline"> = {
    'PENDING': "warning",
    'PROCESSING': "secondary",
    'READY': "success",
    'COMPLETED': "success",
    'CANCELLED': "danger",
    'FULFILLMENT_UPDATED': "secondary",
    'SHIPPING': "primary",
    'DELIVERED': "success",
  };
  
  return statusMap[status] || "secondary";
};

// Helper to get badge variant for payment status
const getPaymentStatusVariant = (status: string | null | undefined): "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline" | undefined => {
  if (!status) return "secondary";
  
  const statusMap: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline"> = {
    'PENDING': "warning",
    'PAID': "success",
    'FAILED': "danger",
    'REFUNDED': "danger",
    'COMPLETED': "success",
  };
  
  return statusMap[status] || "secondary";
};

export default async function OrderDetailsPage({ params }: PageProps) {
  // Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Account Access</h1>
        <p className="mb-6 text-gray-600">Please sign in to access your order details.</p>
        <Button asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    );
  }
  
  // Await the params Promise to access orderId
  const { orderId } = await params;
  
  if (!orderId) {
    notFound();
  }
  
  // Fetch the order and ensure it belongs to the current user
  const order = await prisma.order.findUnique({
    where: { 
      id: orderId,
      userId: user.id // Ensure the order belongs to the authenticated user
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });
  
  if (!order) {
    notFound(); // 404 if order doesn't exist or doesn't belong to user
  }
  
  // Safely convert decimal values for display
  const orderTotalNumber = order.total?.toNumber() ?? 0;
  const itemPriceNumber = (itemPrice: any) => itemPrice?.toNumber() ?? 0;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/account" className="text-indigo-600 hover:text-indigo-800">
          &larr; Back to My Account
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Order Details</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Order Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Order ID:</strong> {order.id}</p>
            <div>
              <strong>Status:</strong>{' '}
              <Badge variant={getStatusVariant(order.status)}>
                {order.status === 'READY' ? 'READY FOR PICKUP' : order.status}
              </Badge>
            </div>
            <div>
              <strong>Payment Status:</strong>{' '}
              <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
                {order.paymentStatus}
              </Badge>
            </div>
            <p><strong>Total Amount:</strong> {formatCurrency(orderTotalNumber)}</p>
            <p><strong>Total Items:</strong> {totalQuantity}</p>
            {order.pickupTime && (
              <p><strong>Pickup Time:</strong> {formatDateTime(order.pickupTime)}</p>
            )}
            {order.fulfillmentType && order.fulfillmentType !== 'pickup' && (
              <p><strong>Fulfillment Type:</strong> {order.fulfillmentType.replace('_', ' ')}</p>
            )}
            <p><strong>Order Placed:</strong> {formatDateTime(order.createdAt)} ({formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })})</p>
            
            {/* Shipping information if applicable */}
            {order.trackingNumber && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <h3 className="font-semibold mb-2">Shipping Information</h3>
                <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
                {order.shippingCarrier && (
                  <p><strong>Carrier:</strong> {order.shippingCarrier}</p>
                )}
                {/* Add tracking link for major carriers */}
                {order.trackingNumber && order.shippingCarrier && (
                  <p className="mt-2">
                    <a 
                      href={getTrackingUrl(order.trackingNumber, order.shippingCarrier)}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Track Your Package
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Customer Information */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {order.customerName}</p>
            <p><strong>Email:</strong> {order.email}</p>
            <p><strong>Phone:</strong> {order.phone}</p>
          </div>
        </div>
      </div>
      
      {/* Order Items */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Items Ordered ({order.items.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Variant</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Price/Item</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item) => {
                const priceNum = itemPriceNumber(item.price);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{item.product?.name || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.variant?.name || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{item.quantity}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(priceNum)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(priceNum * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={4} className="px-4 py-3 text-right">Total:</td>
                <td className="px-4 py-3 text-right">{formatCurrency(orderTotalNumber)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* Support section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
        <p className="mb-4">If you have any questions about your order, please contact our customer service team.</p>
        <div className="flex space-x-4">
          <Button asChild variant="outline">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

// Helper function to generate tracking URLs
function getTrackingUrl(trackingNumber: string, carrier: string): string {
  const carrierLower = carrier.toLowerCase();
  
  if (carrierLower.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  } else if (carrierLower.includes('fedex')) {
    return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
  } else if (carrierLower.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  } else if (carrierLower.includes('dhl')) {
    return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`;
  }
  
  // Default fallback
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${trackingNumber}`)}`;
} 