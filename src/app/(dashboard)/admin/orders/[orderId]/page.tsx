import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component
import Link from 'next/link';
import { serializeObject } from '@/utils/serialization';

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '$0.00';
  // Now expects a standard number
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

// Helper for status badge colors (similar to the list page)
function getStatusColor(status: string | null | undefined): string {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'READY':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800'; // Or a specific completed color
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'FULFILLMENT_UPDATED': // Example custom status
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
        return 'bg-orange-100 text-orange-800'; // Example for refunded
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
 *
 * Next.js 15 App Router: The `params` prop is a Promise and must be awaited.
 * This ensures compatibility with dynamic route segments and avoids build/runtime errors.
 *
 * Edge Cases Handled:
 * - If orderId is missing or invalid, triggers 404.
 * - If order is not found, triggers 404.
 * - Handles null/undefined values for all order fields.
 * - Ensures accessibility and security best practices.
 */
const OrderDetailsPage = async ({ params }: PageProps) => {
  // Await the params Promise to access orderId
  const { orderId } = await params;

  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      customerName: true,
      email: true,
      phone: true,
      total: true,
      taxAmount: true,
      pickupTime: true,
      createdAt: true,
      updatedAt: true,
      squareOrderId: true,
      paymentMethod: true,
      paymentStatus: true,
      notes: true,
      fulfillmentType: true,
      trackingNumber: true,
      shippingCarrier: true,
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          quantity: true,
          price: true,
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              description: true,
            }
          },
          variant: {
            select: {
              id: true,
              name: true,
              price: true,
            }
          },
        },
      },
      payments: {
        select: {
          id: true,
          squarePaymentId: true,
          amount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }
      },
    },
  });

  if (!order) {
    notFound(); // Trigger 404 if order doesn't exist
  }

  // Serialize the order to handle Decimal values
  const serializedOrder = serializeObject(order);
  
  // Calculate totals after serialization to ensure we're working with normal numbers
  const orderTotalNumber = serializedOrder.total ?? 0;
  const totalQuantity = serializedOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

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
            <p><strong>Order ID:</strong> {serializedOrder.id}</p>
            <p><strong>Square Order ID:</strong> {serializedOrder.squareOrderId || 'N/A'}</p>
            <div>
              <strong>Status:</strong>{' '}
              <Badge className={`text-xs ${getStatusColor(serializedOrder.status)}`}>
                {serializedOrder.status || 'UNKNOWN'}
              </Badge>
            </div>
             <div>
              <strong>Payment Status:</strong>{' '}
              <Badge className={`text-xs ${getPaymentStatusColor(serializedOrder.paymentStatus)}`}>
                {serializedOrder.paymentStatus || 'PENDING'}
              </Badge>
            </div>
            <p><strong>Total Amount:</strong> {formatCurrency(orderTotalNumber)}</p>
            <p><strong>Total Items:</strong> {totalQuantity}</p>
            <p><strong>Pickup/Delivery Time:</strong> {formatDateTime(serializedOrder.pickupTime)}</p>
            <p><strong>Order Placed:</strong> {formatDateTime(serializedOrder.createdAt)} ({formatDistance(new Date(serializedOrder.createdAt), new Date(), { addSuffix: true })})</p>
             <p><strong>Last Updated:</strong> {formatDateTime(serializedOrder.updatedAt)}</p>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {serializedOrder.customerName || 'N/A'}</p>
            <p><strong>Email:</strong> {serializedOrder.email || 'N/A'}</p>
            <p><strong>Phone:</strong> {serializedOrder.phone || 'N/A'}</p>
            {/* Add user link if available */}
            {/* {order.userId && <p><strong>User Account:</strong> <Link href={`/admin/users/${order.userId}`}>View User</Link></p>} */}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Items Ordered ({serializedOrder.items.length})</h2>
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
              {serializedOrder.items.map((item: any) => {
                const priceNum = item.price || 0;
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
                    <td colSpan={4} className="px-4 py-3 text-right">Subtotal:</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(orderTotalNumber)}</td>
                </tr>
                 {/* Add rows for Tax, Tips, Discounts if applicable */}
                 <tr className="font-bold text-base">
                    <td colSpan={4} className="px-4 py-3 text-right">Grand Total:</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(orderTotalNumber)}</td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>

       {/* Payment Information */}
       {serializedOrder.payments && serializedOrder.payments.length > 0 && (
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
                 {serializedOrder.payments.map((payment: any) => (
                   <tr key={payment.id}>
                     <td className="px-4 py-3 whitespace-nowrap">{payment.squarePaymentId}</td>
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
       )}

      {/* Add sections for Fulfillment Details, Refunds, Order History/Logs if needed */}

      {/* Raw Data (Optional for Debugging) */}
      {/* <div className="bg-gray-100 p-4 rounded-lg shadow-inner mt-8">
        <h3 className="text-lg font-semibold mb-2">Raw Order Data (Debug)</h3>
        <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded">
          {JSON.stringify(order, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value // Convert BigInts for JSON stringify
          , 2)}
        </pre>
      </div> */}

    </div>
  );
};

export default OrderDetailsPage; 