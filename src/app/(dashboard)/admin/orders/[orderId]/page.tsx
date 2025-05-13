import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import { serializeObject } from '@/utils/serialization';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import ErrorDisplay from '@/components/ui/ErrorDisplay';

// Define types for serialized data
interface SerializedOrderItem {
  id: string;
  quantity: number;
  price: number;
  productId: string;
  variantId: string | null;
  product?: {
    id: string;
    name: string;
  } | null;
  variant?: {
    id: string;
    name: string;
  } | null;
}

interface SerializedPayment {
  id: string;
  squarePaymentId: string;
  status: PaymentStatus;
  amount: number;
  createdAt: string;
}

interface SerializedOrder {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  customerName: string;
  email: string;
  phone: string;
  squareOrderId: string | null;
  pickupTime: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  items: SerializedOrderItem[];
  payments: SerializedPayment[];
}

// Helper for status badge colors
function getStatusColor(status: string | null | undefined): string {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'READY':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'FULFILLMENT_UPDATED':
        return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Helper for payment status badge colors
function getPaymentStatusColor(status: string | null | undefined): string {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REFUNDED':
        return 'bg-orange-100 text-orange-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

// Define props using a dedicated type for async params
interface PageProps {
  params: Promise<{ orderId: string }>;
}

/**
 * OrderDetailsPage - Server Component for displaying order details.
 */
const OrderDetailsPage = async ({ params }: PageProps) => {
  try {
    // Await the params Promise to access orderId
    const { orderId } = await params;

    if (!orderId) {
      notFound();
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      notFound(); // Trigger 404 if order doesn't exist
    }

    // Serialize the order to handle Decimal values
    const serializedOrder = serializeObject(order) as SerializedOrder;
    
    // Log key info for debugging
    logger.debug('Order details - raw order data:', {
      id: order.id,
      status: order.status,
      total: typeof order.total === 'object' ? order.total.toString() : order.total,
      itemsCount: order.items?.length || 0
    });
    
    logger.debug('Order details - serialized order data:', {
      id: serializedOrder?.id,
      status: serializedOrder?.status,
      total: serializedOrder?.total,
      itemsCount: serializedOrder?.items?.length || 0
    });
    
    // Calculate totals after serialization to ensure we're working with normal numbers
    const orderTotal = serializedOrder?.total || 0;
    const totalQuantity = (serializedOrder?.items || []).reduce(
      (sum: number, item: SerializedOrderItem) => sum + (item.quantity || 0), 
      0
    );

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Order Details</h1>
          <div className="flex gap-2">
            <Link
              href={`/admin/orders/${orderId}/edit`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Edit Order
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Order ID:</strong> {serializedOrder?.id || 'N/A'}</p>
              <p><strong>Square Order ID:</strong> {serializedOrder?.squareOrderId || 'N/A'}</p>
              <div>
                <strong>Status:</strong>{' '}
                <Badge className={`text-xs ${getStatusColor(serializedOrder?.status)}`}>
                  {serializedOrder?.status || 'UNKNOWN'}
                </Badge>
              </div>
               <div>
                <strong>Payment Status:</strong>{' '}
                <Badge className={`text-xs ${getPaymentStatusColor(serializedOrder?.paymentStatus)}`}>
                  {serializedOrder?.paymentStatus || 'PENDING'}
                </Badge>
              </div>
              <p><strong>Total Amount:</strong> {formatCurrency(orderTotal)}</p>
              <p><strong>Total Items:</strong> {totalQuantity}</p>
              <p><strong>Pickup/Delivery Time:</strong> {formatDateTime(serializedOrder?.pickupTime)}</p>
              <p><strong>Order Placed:</strong> {formatDateTime(serializedOrder?.createdAt)} 
                {serializedOrder?.createdAt ? 
                  ` (${formatDistance(new Date(serializedOrder.createdAt), new Date(), { addSuffix: true })})` : 
                  ''}
              </p>
               <p><strong>Last Updated:</strong> {formatDateTime(serializedOrder?.updatedAt)}</p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {serializedOrder?.customerName || 'N/A'}</p>
              <p><strong>Email:</strong> {serializedOrder?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {serializedOrder?.phone || 'N/A'}</p>
              {/* Add user link if available */}
              {serializedOrder?.userId && 
                <p><strong>User Account:</strong> <Link href={`/admin/users/${serializedOrder.userId}`} className="text-indigo-600 hover:underline">View User</Link></p>
              }
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Items Ordered ({serializedOrder?.items?.length || 0})</h2>
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
                {serializedOrder?.items && serializedOrder.items.length > 0 ? 
                  serializedOrder.items.map((item: SerializedOrderItem) => {
                    const itemPrice = item.price || 0;
                    const quantity = item.quantity || 0;
                    return (
                      <tr key={item.id || 'unknown'}>
                        <td className="px-4 py-3 whitespace-nowrap">{item.product?.name || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.variant?.name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">{quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(itemPrice)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(itemPrice * quantity)}</td>
                      </tr>
                    );
                  }) 
                : <tr><td colSpan={5} className="px-4 py-3 text-center">No items found</td></tr>}
              </tbody>
              <tfoot>
                  <tr className="font-semibold">
                      <td colSpan={4} className="px-4 py-3 text-right">Subtotal:</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(orderTotal)}</td>
                  </tr>
                   {/* Add rows for Tax, Tips, Discounts if applicable */}
                   <tr className="font-bold text-base">
                      <td colSpan={4} className="px-4 py-3 text-right">Grand Total:</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(orderTotal)}</td>
                  </tr>
              </tfoot>
            </table>
          </div>
        </div>

         {/* Payment Information */}
         {serializedOrder?.payments && serializedOrder.payments.length > 0 ? (
           <div className="bg-white p-6 rounded-lg shadow-md mb-8">
             <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200 text-sm">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Square Payment ID</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                     <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                     <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {serializedOrder.payments.map((payment: SerializedPayment) => (
                     <tr key={payment.id || 'unknown'}>
                       <td className="px-4 py-3 whitespace-nowrap">{payment.squarePaymentId || 'N/A'}</td>
                       <td className="px-4 py-3 whitespace-nowrap">
                         <Badge className={`text-xs ${getPaymentStatusColor(payment.status)}`}>
                           {payment.status || 'UNKNOWN'}
                         </Badge>
                       </td>
                       <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(payment.amount)}</td>
                       <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(payment.createdAt)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
         ) : null}
      </div>
    );
  } catch (error) {
    logger.error('Error rendering order details:', error);
    
    // Provide a fallback UI when there's an error
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Order Details</h1>
        <ErrorDisplay 
          title="Error Loading Order" 
          message="There was a problem loading the order details."
          returnLink={{ href: "/admin/orders", label: "Return to Orders List" }} 
        />
      </div>
    );
  }
};

export default OrderDetailsPage; 