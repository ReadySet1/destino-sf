import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, MapPin } from 'lucide-react';

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
    'CONFIRMED': "secondary",
    'PREPARING': "secondary",
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
  
  // Try to fetch as a regular order first
  const regularOrder = await prisma.order.findUnique({
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
  
  // If not found as regular order, try as catering order
  const cateringOrder = !regularOrder ? await prisma.cateringOrder.findUnique({
    where: { 
      id: orderId,
      customerId: user.id // Ensure the order belongs to the authenticated user
    },
    include: {
      items: true,
    },
  }) : null;
  
  // If neither order type exists, show 404
  if (!regularOrder && !cateringOrder) {
    notFound();
  }
  
  // Determine order type and format data accordingly
  const isRegularOrder = !!regularOrder;
  const isCateringOrder = !!cateringOrder;
  
  // Common order data structure
  const orderData = isRegularOrder ? {
    id: regularOrder.id,
    status: regularOrder.status,
    paymentStatus: regularOrder.paymentStatus,
    total: regularOrder.total?.toNumber() ?? 0,
    createdAt: regularOrder.createdAt,
    customerName: regularOrder.customerName,
    email: regularOrder.email,
    phone: regularOrder.phone,
    pickupTime: regularOrder.pickupTime,
    fulfillmentType: regularOrder.fulfillmentType,
    trackingNumber: regularOrder.trackingNumber,
    shippingCarrier: regularOrder.shippingCarrier,
    items: regularOrder.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price?.toNumber() ?? 0,
      productName: item.product?.name || 'N/A',
      variantName: item.variant?.name || '-',
    })),
    type: 'regular' as const,
  } : {
    id: cateringOrder!.id,
    status: cateringOrder!.status,
    paymentStatus: cateringOrder!.paymentStatus,
    total: cateringOrder!.totalAmount?.toNumber() ?? 0,
    createdAt: cateringOrder!.createdAt,
    customerName: cateringOrder!.name,
    email: cateringOrder!.email,
    phone: cateringOrder!.phone,
    eventDate: cateringOrder!.eventDate,
    numberOfPeople: cateringOrder!.numberOfPeople,
    specialRequests: cateringOrder!.specialRequests,
    deliveryAddress: cateringOrder!.deliveryAddress,
    deliveryFee: cateringOrder!.deliveryFee?.toNumber() ?? 0,
    items: cateringOrder!.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.pricePerUnit?.toNumber() ?? 0,
      productName: item.name,
      itemType: item.itemType,
      totalPrice: item.totalPrice?.toNumber() ?? 0,
    })),
    type: 'catering' as const,
  };
  
  const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/account" className="text-indigo-600 hover:text-indigo-800">
          &larr; Back to My Account
        </Link>
      </div>
      
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Order Details</h1>
        <Badge variant="secondary" className={
          orderData.type === 'catering' 
            ? "bg-amber-100 text-amber-800 border-amber-200"
            : "bg-blue-50 text-blue-700 border-blue-200"
        }>
          {orderData.type.toUpperCase()}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Order Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Order ID:</strong> {orderData.id}</p>
            <div>
              <strong>Status:</strong>{' '}
              <Badge variant={getStatusVariant(orderData.status)}>
                {orderData.status === 'READY' ? 'READY FOR PICKUP' : orderData.status}
              </Badge>
            </div>
            <div>
              <strong>Payment Status:</strong>{' '}
              <Badge variant={getPaymentStatusVariant(orderData.paymentStatus)}>
                {orderData.paymentStatus}
              </Badge>
            </div>
            <p><strong>Total Amount:</strong> {formatCurrency(orderData.total)}</p>
            <p><strong>Total Items:</strong> {totalQuantity}</p>
            
            {/* Regular order specific fields */}
            {isRegularOrder && (
              <>
                {orderData.pickupTime && (
                  <p><strong>Pickup Time:</strong> {formatDateTime(orderData.pickupTime)}</p>
                )}
                {orderData.fulfillmentType && orderData.fulfillmentType !== 'pickup' && (
                  <p><strong>Fulfillment Type:</strong> {orderData.fulfillmentType.replace('_', ' ')}</p>
                )}
                {orderData.trackingNumber && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <h3 className="font-semibold mb-2">Shipping Information</h3>
                    <p><strong>Tracking Number:</strong> {orderData.trackingNumber}</p>
                    {orderData.shippingCarrier && (
                      <p><strong>Carrier:</strong> {orderData.shippingCarrier}</p>
                    )}
                    {orderData.trackingNumber && orderData.shippingCarrier && (
                      <p className="mt-2">
                        <a 
                          href={getTrackingUrl(orderData.trackingNumber, orderData.shippingCarrier)}
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
              </>
            )}
            
            {/* Catering order specific fields */}
            {isCateringOrder && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <p><strong>Event Date:</strong> {formatDateTime(orderData.eventDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <p><strong>Number of People:</strong> {orderData.numberOfPeople}</p>
                </div>
                {orderData.deliveryAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1" />
                    <p><strong>Delivery Address:</strong> {orderData.deliveryAddress}</p>
                  </div>
                )}
                {orderData.deliveryFee && orderData.deliveryFee > 0 && (
                  <p><strong>Delivery Fee:</strong> {formatCurrency(orderData.deliveryFee)}</p>
                )}
                {orderData.specialRequests && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p><strong>Special Requests:</strong></p>
                    <p className="text-gray-700 mt-1">{orderData.specialRequests}</p>
                  </div>
                )}
              </>
            )}
            
            <p><strong>Order Placed:</strong> {formatDateTime(orderData.createdAt)} ({formatDistance(new Date(orderData.createdAt), new Date(), { addSuffix: true })})</p>
          </div>
        </div>
        
        {/* Customer Information */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {orderData.customerName}</p>
            <p><strong>Email:</strong> {orderData.email}</p>
            <p><strong>Phone:</strong> {orderData.phone}</p>
          </div>
        </div>
      </div>
      
      {/* Order Items */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Items Ordered ({orderData.items.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Product</th>
                {isRegularOrder && <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Variant</th>}
                {isCateringOrder && <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>}
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Price/Item</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orderData.items.map((item) => {
                const itemTotal = isRegularOrder 
                  ? item.price * item.quantity
                  : (item as any).totalPrice;
                
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{item.productName}</td>
                    {isRegularOrder && <td className="px-4 py-3 whitespace-nowrap">{(item as any).variantName}</td>}
                    {isCateringOrder && <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {((item as any).itemType || 'item').toUpperCase()}
                      </Badge>
                    </td>}
                    <td className="px-4 py-3 whitespace-nowrap text-right">{item.quantity}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(itemTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={isRegularOrder ? 4 : 4} className="px-4 py-3 text-right">Total:</td>
                <td className="px-4 py-3 text-right">{formatCurrency(orderData.total)}</td>
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