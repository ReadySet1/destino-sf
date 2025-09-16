import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Decimal } from '@prisma/client/runtime/library';
import { FormattedNotes } from '@/components/Order/FormattedNotes';
import { ShippingLabelButton } from '../components/ShippingLabelButton';
import { ManualPaymentButton } from './components/ManualPaymentButton';

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
  paymentMethod: string | null;
  total: number;
  taxAmount: number;
  deliveryFee: number;
  serviceFee: number;
  gratuityAmount: number;
  shippingCostCents: number | null;
  customerName: string;
  email: string;
  phone: string;
  squareOrderId: string | null;
  pickupTime: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  labelCreatedAt: string | null;
  shippingCarrier: string | null;
  fulfillmentType: string | null;
  shippingRateId: string | null;
  retryCount: number;
  notes: string | null;
  items: SerializedOrderItem[];
  payments: SerializedPayment[];
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

// Manual serialization for order
function manuallySerializeOrder(order: any): SerializedOrder {
  if (!order) return null as any;

  // Manually serialize items
  const serializedItems = (order.items || []).map((item: any) => ({
    id: item.id,
    quantity: item.quantity || 0,
    price: decimalToNumber(item.price),
    productId: item.productId,
    variantId: item.variantId,
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
        }
      : null,
    variant: item.variant
      ? {
          id: item.variant.id,
          name: item.variant.name,
        }
      : null,
  }));

  // Manually serialize payments
  const serializedPayments = (order.payments || []).map((payment: any) => ({
    id: payment.id,
    squarePaymentId: payment.squarePaymentId,
    status: payment.status,
    amount: decimalToNumber(payment.amount),
    createdAt: payment.createdAt ? new Date(payment.createdAt).toISOString() : '',
  }));

  // Create serialized order with manual decimal conversions
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: decimalToNumber(order.total),
    taxAmount: decimalToNumber(order.taxAmount),
    deliveryFee: decimalToNumber(order.deliveryFee),
    serviceFee: decimalToNumber(order.serviceFee),
    gratuityAmount: decimalToNumber(order.gratuityAmount),
    shippingCostCents: order.shippingCostCents,
    customerName: order.customerName || '',
    email: order.email || '',
    phone: order.phone || '',
    squareOrderId: order.squareOrderId,
    pickupTime: order.pickupTime ? new Date(order.pickupTime).toISOString() : null,
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : '',
    updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : '',
    userId: order.userId,
    trackingNumber: order.trackingNumber,
    labelUrl: order.labelUrl,
    labelCreatedAt: order.labelCreatedAt?.toISOString() ?? null,
    shippingCarrier: order.shippingCarrier,
    fulfillmentType: order.fulfillmentType,
    shippingRateId: order.shippingRateId,
    retryCount: order.retryCount || 0,
    notes: order.notes,
    items: serializedItems,
    payments: serializedPayments,
  };
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

// Helper function to get the display text for payment status
function getPaymentStatusDisplay(paymentStatus: string | null | undefined, paymentMethod: string | null | undefined): string {
  // If payment method is CASH and status is PENDING, show CASH
  if (paymentMethod?.toUpperCase() === 'CASH' && paymentStatus?.toUpperCase() === 'PENDING') {
    return 'CASH';
  }
  return paymentStatus || 'PENDING';
}

// Helper for payment status badge colors
function getPaymentStatusColor(paymentStatus: string | null | undefined, paymentMethod: string | null | undefined): string {
  // Get the display status first
  const displayStatus = getPaymentStatusDisplay(paymentStatus, paymentMethod);
  
  switch (displayStatus.toUpperCase()) {
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'CASH':
      return 'bg-blue-100 text-blue-800';
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
    orderId: string;
  }>;
};

/**
 * OrderDetailsPage - Server Component for displaying order details.
 */
const OrderDetailsPage = async ({ params }: PageProps) => {
  try {
    // Await params before accessing its properties (Next.js 15 requirement)
    const { orderId } = await params;

    console.log('Order ID:', orderId);

    if (!orderId) {
      console.error('No order ID provided');
      notFound();
    }

    // Validate UUID format before making database query
    const isValidUUID = (uuid: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    if (!isValidUUID(orderId)) {
      console.error(`Invalid UUID format for orderId: ${orderId}`);
      notFound();
    }

    // Log before database query
    console.log('Fetching order with ID:', orderId);

    // Try to fetch as a regular order first with enhanced error handling
    let order = null;
    let cateringOrder = null;
    
    try {
      order = await prisma.order.findUnique({
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
        // Include all fields needed for shipping label functionality
      });
    } catch (error) {
      // Log error with context
      console.error('Failed to fetch admin order:', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code
      });
      
      // Check if it's a prepared statement error
      if (error instanceof Error && 
          ((error as any).code === '42P05' || // prepared statement already exists
           (error as any).code === '26000' || // prepared statement does not exist
           error.message.includes('prepared statement'))) {
        console.log('Detected prepared statement error in admin order query, attempting retry...');
        
        // Attempt one retry with a fresh connection
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          order = await prisma.order.findUnique({
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
          
          console.log('✅ Admin order retry successful after prepared statement error');
        } catch (retryError) {
          console.error('❌ Admin order retry failed:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // If not found as regular order, try as catering order with same error handling
    if (!order) {
      try {
        cateringOrder = await prisma.cateringOrder.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            customer: true,
          },
        });
      } catch (error) {
        // Log error with context
        console.error('Failed to fetch admin catering order:', {
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code
        });
        
        // Check if it's a prepared statement error
        if (error instanceof Error && 
            ((error as any).code === '42P05' || // prepared statement already exists
             (error as any).code === '26000' || // prepared statement does not exist
             error.message.includes('prepared statement'))) {
          console.log('Detected prepared statement error in admin catering order query, attempting retry...');
          
          // Attempt one retry with a fresh connection
          try {
            await prisma.$disconnect();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            cateringOrder = await prisma.cateringOrder.findUnique({
              where: { id: orderId },
              include: {
                items: true,
                customer: true,
              },
            });
            
            console.log('✅ Admin catering order retry successful after prepared statement error');
          } catch (retryError) {
            console.error('❌ Admin catering order retry failed:', retryError);
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    }

    // Log database query result
    console.log('Database query result:', order ? 'Regular order found' : (cateringOrder ? 'Catering order found' : 'No order found'));

    // If this is a catering order, redirect to the catering order details page
    if (cateringOrder) {
      console.log(`Found catering order, redirecting to catering details page for ID: ${orderId}`);
      redirect(`/admin/catering/${orderId}`);
      return; // This will never execute due to redirect, but helps with type safety
    }

    if (!order) {
      console.error(`Order not found for ID: ${orderId}`);
      
      // Return custom error page instead of generic 404
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-red-900 mb-2">Order Not Found</h1>
              <p className="text-red-700 mb-4">
                The order with ID <code className="bg-red-100 px-2 py-1 rounded font-mono text-sm">{orderId}</code> could not be found.
              </p>
              
              <div className="text-sm text-red-600 mb-6">
                <p>This could happen if:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>The order was deleted or archived</li>
                  <li>This is a catering order (check the catering orders section)</li>
                  <li>The order ID was mistyped or is invalid</li>
                  <li>There was a temporary database issue</li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/admin/orders"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  View All Orders
                </Link>
                <Link
                  href="/admin/catering"
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Check Catering Orders
                </Link>
                <button
                  onClick={() => window.history.back()}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Log key info about the raw order
    console.log('Raw order data found:', {
      id: order.id,
      status: order.status,
      items: order.items?.length || 0,
    });

    // Manually serialize the order to handle Decimal values
    const serializedOrder = manuallySerializeOrder(order);

    // Log key info about the serialized order
    console.log('Serialized order:', {
      id: serializedOrder.id,
      status: serializedOrder.status,
      total: serializedOrder.total,
      itemsCount: serializedOrder.items?.length || 0,
    });

    // Log key info for debugging
    logger.info('Order details - serialized data:', {
      id: serializedOrder.id,
      status: serializedOrder.status,
      total: serializedOrder.total,
      itemsCount: serializedOrder.items?.length || 0,
    });

    // Calculate totals
    const orderTotal = serializedOrder.total || 0;
    const totalQuantity = (serializedOrder.items || []).reduce(
      (sum: number, item: SerializedOrderItem) => sum + (item.quantity || 0),
      0
    );

    console.log('Order total:', orderTotal);
    console.log('Total quantity:', totalQuantity);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Order Details</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/orders"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 mr-2"
            >
              Back to Orders
            </Link>
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
                  className={`text-xs ${getPaymentStatusColor(serializedOrder?.paymentStatus, serializedOrder?.paymentMethod)}`}
                >
                  {getPaymentStatusDisplay(serializedOrder?.paymentStatus, serializedOrder?.paymentMethod)}
                </Badge>
              </div>
              <p>
                <strong>Total Amount:</strong> {formatCurrency(orderTotal)}
              </p>
              <p>
                <strong>Total Items:</strong> {totalQuantity}
              </p>
              <p>
                <strong>Pickup/Delivery Time:</strong> {formatDateTime(serializedOrder?.pickupTime)}
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

              {serializedOrder?.trackingNumber && (
                <p>
                  <strong>Tracking Number:</strong>{' '}
                  <span className="font-mono">{serializedOrder.trackingNumber}</span>
                  {serializedOrder.shippingCarrier && ` (${serializedOrder.shippingCarrier})`}
                </p>
              )}

              {serializedOrder?.fulfillmentType && (
                <p>
                  <strong>Fulfillment Type:</strong> {serializedOrder.fulfillmentType.replace('_', ' ').toUpperCase()}
                </p>
              )}
            </div>
            
            {/* Manual Payment Button - Only show for admin users when payment is pending/failed */}
            <div className="mt-4">
              <ManualPaymentButton
                orderId={serializedOrder.id}
                squareOrderId={serializedOrder.squareOrderId}
                paymentStatus={serializedOrder.paymentStatus}
                status={serializedOrder.status}
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Name:</strong> {serializedOrder?.customerName || 'N/A'}
              </p>
              <p>
                <strong>Email:</strong> {serializedOrder?.email || 'N/A'}
              </p>
              <p>
                <strong>Phone:</strong> {serializedOrder?.phone || 'N/A'}
              </p>
              {/* Add user link if available */}
              {serializedOrder?.userId && (
                <p>
                  <strong>User Account:</strong>{' '}
                  <Link
                    href={`/admin/users/${serializedOrder.userId}`}
                    className="text-indigo-600 hover:underline"
                  >
                    View User
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Shipping Label Management */}
          {serializedOrder?.fulfillmentType === 'nationwide_shipping' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Shipping Label</h2>
              <ShippingLabelButton
                orderId={serializedOrder.id}
                shippingRateId={serializedOrder.shippingRateId}
                trackingNumber={serializedOrder.trackingNumber}
                labelUrl={serializedOrder.labelUrl}
                shippingCarrier={serializedOrder.shippingCarrier}
                fulfillmentType={serializedOrder.fulfillmentType}
                paymentStatus={serializedOrder.paymentStatus}
                retryCount={serializedOrder.retryCount}
              />
            </div>
          )}

          {/* Order Notes */}
          {serializedOrder?.notes && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Order Notes</h2>
              <FormattedNotes notes={serializedOrder.notes} />
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Items Ordered ({serializedOrder?.items?.length || 0})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Variant
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                    Price/Item
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serializedOrder?.items && serializedOrder.items.length > 0 ? (
                  serializedOrder.items.map((item: SerializedOrderItem) => {
                    const itemPrice = item.price || 0;
                    const quantity = item.quantity || 0;
                    return (
                      <tr key={item.id || 'unknown'}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.product?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.variant?.name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">{quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {formatCurrency(itemPrice)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {formatCurrency(itemPrice * quantity)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                {/* Calculate detailed breakdown */}
                {(() => {
                  // Calculate subtotal from items
                  const subtotalFromItems = (serializedOrder?.items || []).reduce(
                    (sum: number, item: SerializedOrderItem) => {
                      const itemPrice = item.price || 0;
                      const quantity = item.quantity || 0;
                      return sum + (itemPrice * quantity);
                    },
                    0
                  );

                  // Get individual components from database
                  const taxAmount = serializedOrder?.taxAmount || 0;
                  const deliveryFee = serializedOrder?.deliveryFee || 0;
                  const serviceFee = serializedOrder?.serviceFee || 0;
                  const gratuityAmount = serializedOrder?.gratuityAmount || 0;
                  const shippingCostDollars = serializedOrder?.shippingCostCents 
                    ? (serializedOrder.shippingCostCents / 100) 
                    : 0;


                  return (
                    <>

                      {/* Subtotal */}
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">
                          Subtotal:
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          {formatCurrency(subtotalFromItems)}
                        </td>
                      </tr>

                      {/* Tax */}
                      {taxAmount > 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">
                            Tax (8.25%):
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(taxAmount)}
                          </td>
                        </tr>
                      )}

                      {/* Shipping */}
                      {shippingCostDollars > 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">
                            Shipping ({serializedOrder?.shippingCarrier || 'N/A'}):
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(shippingCostDollars)}
                          </td>
                        </tr>
                      )}

                      {/* Delivery Fee */}
                      {deliveryFee > 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">
                            Delivery Fee:
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(deliveryFee)}
                          </td>
                        </tr>
                      )}

                      {/* Service Fee */}
                      {serviceFee > 0.01 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">
                            Service Fee:
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(serviceFee)}
                          </td>
                        </tr>
                      )}

                      {/* Gratuity */}
                      {gratuityAmount > 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">
                            Gratuity/Tip:
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(gratuityAmount)}
                          </td>
                        </tr>
                      )}


                      {/* Grand Total */}
                      <tr className="border-t-2 border-gray-300 font-bold text-base">
                        <td colSpan={4} className="px-4 py-3 text-right">
                          Grand Total:
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(orderTotal)}
                        </td>
                      </tr>
                    </>
                  );
                })()}
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
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Square Payment ID
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serializedOrder.payments.map((payment: SerializedPayment) => (
                    <tr key={payment.id || 'unknown'}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {payment.squarePaymentId || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs ${getPaymentStatusColor(payment.status, serializedOrder?.paymentMethod)}`}>
                          {payment.status || 'UNKNOWN'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(payment.createdAt)}
                      </td>
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
    // Check if this is a Next.js redirect error (which is normal behavior)
    const isRedirectError = error instanceof Error && 'digest' in error && 
      typeof (error as any).digest === 'string' && 
      (error as any).digest.startsWith('NEXT_REDIRECT');
    
    if (isRedirectError) {
      // This is a normal redirect, don't log it as an error and re-throw to complete the redirect
      throw error;
    }

    // Only log actual errors, not redirect behavior
    console.error('Error rendering order details:', error);
    logger.error('Error rendering order details:', error);

    // Provide a fallback UI when there's an error
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Order Details</h1>
        <ErrorDisplay
          title="Error Loading Order"
          message={`There was a problem loading the order details: ${error instanceof Error ? error.message : 'Unknown error'}`}
          returnLink={{ href: '/admin/orders', label: 'Return to Orders List' }}
        />
      </div>
    );
  }
};

export default OrderDetailsPage;
