import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import { CateringStatus, PaymentStatus } from '@prisma/client';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Decimal } from '@prisma/client/runtime/library';
import { getBoxedLunchImage } from '@/lib/utils';
import { OrderItemImage } from '@/components/ui/order-item-image';

// Define types for serialized data
interface SerializedCateringOrderItem {
  id: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  notes: string | null;
  itemType: string;
}

interface SerializedCateringOrder {
  id: string;
  status: CateringStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  totalAmount: number;
  name: string;
  email: string;
  phone: string;
  squareOrderId: string | null;
  squarePaymentId: string | null;
  squareCheckoutUrl: string | null;
  eventDate: string;
  numberOfPeople: number;
  notes: string | null;
  specialRequests: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  items: SerializedCateringOrderItem[];
}

// Helper function to manually convert Decimal to number
function decimalToNumber(value: any): number {
  if (value === null || value === undefined) return 0;

  // If it's already a number
  if (typeof value === 'number') return value;

  // If it's a string that can be parsed as a number
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  // If it's a Decimal object
  if (typeof value === 'object' && value !== null) {
    try {
      // For Prisma Decimal objects
      if (typeof value.toNumber === 'function') {
        return value.toNumber();
      }

      // Try to use valueOf
      if (typeof value.valueOf === 'function') {
        const val = value.valueOf();
        if (typeof val === 'number') return val;
      }

      // Last resort: convert to string and parse
      return parseFloat(String(value)) || 0;
    } catch (e) {
      console.error('Error converting value to number:', e);
      return 0;
    }
  }

  return 0;
}

// Manual serialization for catering order
function manuallySerializeCateringOrder(order: any): SerializedCateringOrder {
  if (!order) return null as any;

  // Manually serialize items
  const serializedItems = (order.items || []).map((item: any) => ({
    id: item.id,
    name: item.itemName || '', // Use itemName from database
    itemType: item.itemType || 'item', // Include itemType for display
    quantity: item.quantity || 0,
    pricePerUnit: decimalToNumber(item.pricePerUnit),
    totalPrice: decimalToNumber(item.totalPrice),
    notes: item.notes,
  }));

  // Create serialized order with manual decimal conversions
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmount: decimalToNumber(order.totalAmount),
    name: order.name || '',
    email: order.email || '',
    phone: order.phone || '',
    squareOrderId: order.squareOrderId,
    squarePaymentId: order.squarePaymentId,
    squareCheckoutUrl: order.squareCheckoutUrl,
    eventDate: order.eventDate ? new Date(order.eventDate).toISOString() : '',
    numberOfPeople: order.numberOfPeople || 0,
    notes: order.notes,
    specialRequests: order.specialRequests,
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : '',
    updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : '',
    customerId: order.customerId,
    items: serializedItems,
  };
}

// Helper for status badge colors
function getStatusColor(status: string | null | undefined): string {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'PREPARING':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
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

type PageProps = {
  params: Promise<{
    cateringId: string;
  }>;
};

/**
 * CateringOrderDetailsPage - Server Component for displaying catering order details.
 */
const CateringOrderDetailsPage = async ({ params }: PageProps) => {
  try {
    // Get cateringId from params - await params as required by Next.js
    const { cateringId } = await params;

    console.log('Catering ID:', cateringId);

    if (!cateringId) {
      console.error('No catering ID provided');
      notFound();
    }

    // Log before database query
    console.log('Fetching catering order with ID:', cateringId);

    const order = await prisma.cateringOrder.findUnique({
      where: { id: cateringId },
      include: {
        items: true,
        customer: true,
      },
    });

    // Log database query result
    console.log('Database query result:', order ? 'Order found' : 'No order found');

    if (!order) {
      console.error(`Catering order not found for ID: ${cateringId}`);
      notFound(); // Trigger 404 if order doesn't exist
    }

    // Log raw order data for inspection - but don't log the whole object to avoid console clutter
    console.log('Raw order data found:', {
      id: order.id,
      status: order.status,
      items: order.items?.length || 0,
    });

    // Manually serialize the order to handle Decimal values
    const serializedOrder = manuallySerializeCateringOrder(order);

    // Log key info
    console.log('Serialized order:', {
      id: serializedOrder.id,
      status: serializedOrder.status,
      totalAmount: serializedOrder.totalAmount,
      itemsCount: serializedOrder.items?.length || 0,
    });

    // Log key info for debugging
    logger.info('Catering order details - serialized data:', {
      id: serializedOrder.id,
      status: serializedOrder.status,
      total: serializedOrder.totalAmount,
      itemsCount: serializedOrder.items?.length || 0,
    });

    // Calculate totals
    const orderTotal = serializedOrder.totalAmount || 0;
    const totalQuantity = (serializedOrder.items || []).reduce(
      (sum: number, item: SerializedCateringOrderItem) => sum + (item.quantity || 0),
      0
    );

    console.log('Order total:', orderTotal);
    console.log('Total quantity:', totalQuantity);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Catering Order Details</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/orders"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Back to Orders
            </Link>
            <Link
              href={`/admin/catering/${cateringId}/edit`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Edit Catering Order
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Order ID:</strong> {serializedOrder?.id || 'N/A'}
              </p>
              <p>
                <strong>Square Order ID:</strong> {serializedOrder?.squareOrderId || 'N/A'}
              </p>
              <div>
                <strong>Status:</strong>{' '}
                <Badge className={`text-xs ${getStatusColor(serializedOrder?.status)}`}>
                  {serializedOrder?.status || 'UNKNOWN'}
                </Badge>
              </div>
              <div>
                <strong>Payment Status:</strong>{' '}
                <Badge
                  className={`text-xs ${getPaymentStatusColor(serializedOrder?.paymentStatus)}`}
                >
                  {serializedOrder?.paymentStatus || 'PENDING'}
                </Badge>
              </div>
              {serializedOrder?.paymentMethod && (
                <p>
                  <strong>Payment Method:</strong> {serializedOrder.paymentMethod}
                </p>
              )}
              <p>
                <strong>Total Amount:</strong> {formatCurrency(orderTotal)}
              </p>
              <p>
                <strong>Event Date:</strong> {formatDateTime(serializedOrder?.eventDate)}
              </p>
              <p>
                <strong>Order Placed:</strong> {formatDateTime(serializedOrder?.createdAt)}
                {serializedOrder?.createdAt
                  ? ` (${formatDistance(new Date(serializedOrder.createdAt), new Date(), { addSuffix: true })})`
                  : ''}
              </p>
              <p>
                <strong>Last Updated:</strong> {formatDateTime(serializedOrder?.updatedAt)}
              </p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Name:</strong> {serializedOrder?.name || 'N/A'}
              </p>
              <p>
                <strong>Email:</strong> {serializedOrder?.email || 'N/A'}
              </p>
              <p>
                <strong>Phone:</strong> {serializedOrder?.phone || 'N/A'}
              </p>
              {/* Add user link if available */}
              {serializedOrder?.customerId && (
                <p>
                  <strong>User Account:</strong>{' '}
                  <Link
                    href={`/admin/users/${serializedOrder.customerId}`}
                    className="text-indigo-600 hover:underline"
                  >
                    View User
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Special Requests / Notes */}
        {(serializedOrder?.notes || serializedOrder?.specialRequests) && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
            <div className="space-y-4">
              {serializedOrder?.notes && (
                <div>
                  <h3 className="font-medium text-gray-700">Order Notes</h3>
                  <p className="text-gray-600 mt-1 whitespace-pre-line">{serializedOrder.notes}</p>
                </div>
              )}
              {serializedOrder?.specialRequests && (
                <div>
                  <h3 className="font-medium text-gray-700">Special Requests</h3>
                  <p className="text-gray-600 mt-1 whitespace-pre-line">
                    {serializedOrder.specialRequests}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Items Ordered ({serializedOrder?.items?.length || 0})
          </h2>
          <div className="space-y-4">
            {serializedOrder?.items && serializedOrder.items.length > 0 ? (
              serializedOrder.items.map((item: SerializedCateringOrderItem) => {
                return (
                  <div
                    key={item.id || 'unknown'}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    {/* Item Details */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name || 'N/A'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`text-xs ${item.itemType === 'package' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}
                        >
                          {item.itemType === 'package' ? 'PACKAGE' : 'ITEM'}
                        </Badge>
                        <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {formatCurrency(item.pricePerUnit)} each
                      </div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">No items found</div>
            )}

            {/* Order Total */}
            <div className="border-t pt-4 mt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(orderTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {serializedOrder?.squarePaymentId && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Square Payment ID:</strong> {serializedOrder.squarePaymentId}
              </p>
              <div>
                <strong>Payment Status:</strong>{' '}
                <Badge
                  className={`text-xs ${getPaymentStatusColor(serializedOrder?.paymentStatus)}`}
                >
                  {serializedOrder?.paymentStatus || 'PENDING'}
                </Badge>
              </div>
              {serializedOrder?.squareCheckoutUrl && (
                <p>
                  <strong>Checkout URL:</strong>{' '}
                  <a
                    href={serializedOrder.squareCheckoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Square Checkout
                  </a>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error rendering catering order details:', error);
    logger.error('Error rendering catering order details:', error);

    // Provide a fallback UI when there's an error
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Catering Order Details</h1>
        <ErrorDisplay
          title="Error Loading Order"
          message={`There was a problem loading the catering order details: ${error instanceof Error ? error.message : 'Unknown error'}`}
          returnLink={{ href: '/admin/orders', label: 'Return to Orders List' }}
        />
      </div>
    );
  }
};

export default CateringOrderDetailsPage;
