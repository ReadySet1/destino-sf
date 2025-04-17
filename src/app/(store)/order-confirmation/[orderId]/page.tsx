import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { CheckCircle2Icon, TruckIcon, MapPinIcon, CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getOrderDetails } from '@/utils/square';

// Define our own Order interface based on what we're using
interface Order {
  id?: string;
  totalMoney?: {
    amount?: number;
  };
  fulfillments?: Array<{
    type?: string;
    pickupDetails?: {
      pickupAt?: string;
      note?: string;
    };
    deliveryDetails?: {
      deliverAt?: string;
      recipient?: {
        displayName?: string;
        address?: {
          addressLine1?: string;
          addressLine2?: string;
          locality?: string;
          administrativeDistrictLevel1?: string;
          postalCode?: string;
        };
      };
    };
    shipmentDetails?: {
      carrier?: string;
      recipient?: {
        displayName?: string;
        address?: {
          addressLine1?: string;
          addressLine2?: string;
          locality?: string;
          administrativeDistrictLevel1?: string;
          postalCode?: string;
        };
      };
    };
  }>;
}

type ExtendedOrder = Order & {
  payment_note?: string;
  status?: string;
  createdAt?: string;
};

// Type for payment note JSON structure
interface PaymentNote {
  // Define specific fields if the structure is known, otherwise leave empty or use Record<string, any>
}

// Updated type for Next.js 15.3.1 which expects params to be a Promise
type ConfirmationPageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  // Await the promises to get the actual values
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const order = await getOrderDetails(resolvedParams.orderId) as ExtendedOrder | null;

  if (!order) {
    notFound();
  }

  // Extract fulfillment details from the order with explicit typing
  const fulfillment = order.fulfillments?.[0];
  const fulfillmentType = fulfillment?.type?.toLowerCase() || '';
  
  // Safely parse the payment note
  let paymentNote: PaymentNote | null = null;
  if (order.payment_note) {
    try {
      paymentNote = JSON.parse(order.payment_note) as PaymentNote;
    } catch (error) {
      console.error("Failed to parse payment note:", error);
    }
  }

  // Use searchParams status as fallback or primary source if needed
  const displayStatus = resolvedSearchParams.status || order.status || 'Processing';
  
  // Parse order date safely
  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();

  // Function to safely format dates with fallbacks
  const safeFormat = (dateString: string | null | undefined, formatString: string): string => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), formatString);
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  // Calculate total amount safely
  const totalAmount = order.totalMoney?.amount !== undefined
    ? (Number(order.totalMoney.amount) / 100).toFixed(2)
    : '0.00';

  // Helper function to determine fulfillment title
  const getFulfillmentTitle = (): string => {
    if (!fulfillment) return 'Order Details';
    
    switch (fulfillment.type?.toLowerCase()) {
      case 'pickup': return 'Pickup Details';
      case 'delivery': return 'Delivery Details';
      case 'shipment': return 'Shipping Details';
      default: return 'Order Details';
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <CheckCircle2Icon className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="mb-2 text-3xl font-bold">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. We&apos;ll send you updates about your order status.
          </p>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-4">
                <span className="font-medium">Order ID</span>
                <span className="font-mono">{order.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-4">
                <span className="font-medium">Order Date</span>
                <span>{order.createdAt ? format(orderDate, 'PPP') : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-4">
                <span className="font-medium">Order Status</span>
                <span className="capitalize">{displayStatus.toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Amount</span>
                <span className="font-medium">${totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Fulfillment Details - Only render if fulfillment exists */}
          {fulfillment && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">{getFulfillmentTitle()}</h2>

              <div className="space-y-4">
                {/* Pickup Details */}
                {fulfillment.type?.toLowerCase() === 'pickup' && fulfillment.pickupDetails && (
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="mt-1 h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Pickup Time</p>
                      <p className="text-gray-600">
                        {safeFormat(fulfillment.pickupDetails.pickupAt, 'PPP p')}
                      </p>
                      {fulfillment.pickupDetails.note && (
                        <p className="mt-1 text-sm text-gray-500">
                          {fulfillment.pickupDetails.note}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery/Shipment Details */}
                {fulfillment && ['delivery', 'shipment'].includes(fulfillment.type?.toLowerCase() || '') && (
                  <>
                    {/* Shipping Address */}
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="mt-1 h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Shipping Address</p>
                        {(fulfillment.deliveryDetails?.recipient || fulfillment.shipmentDetails?.recipient) ? (
                          <>
                            <p className="text-gray-600">
                              {fulfillment.deliveryDetails?.recipient?.displayName ||
                               fulfillment.shipmentDetails?.recipient?.displayName || 'N/A'}
                            </p>
                            <p className="text-gray-600">
                              {fulfillment.deliveryDetails?.recipient?.address?.addressLine1 ||
                               fulfillment.shipmentDetails?.recipient?.address?.addressLine1 || 'N/A'}
                            </p>
                            {(fulfillment.deliveryDetails?.recipient?.address?.addressLine2 ||
                              fulfillment.shipmentDetails?.recipient?.address?.addressLine2) && (
                              <p className="text-gray-600">
                                {fulfillment.deliveryDetails?.recipient?.address?.addressLine2 ||
                                 fulfillment.shipmentDetails?.recipient?.address?.addressLine2}
                              </p>
                            )}
                            <p className="text-gray-600">
                              {[
                                fulfillment.deliveryDetails?.recipient?.address?.locality ||
                                fulfillment.shipmentDetails?.recipient?.address?.locality || '',
                                fulfillment.deliveryDetails?.recipient?.address?.administrativeDistrictLevel1 ||
                                fulfillment.shipmentDetails?.recipient?.address?.administrativeDistrictLevel1 || '',
                                fulfillment.deliveryDetails?.recipient?.address?.postalCode ||
                                fulfillment.shipmentDetails?.recipient?.address?.postalCode || ''
                              ].filter(Boolean).join(', ') || 'N/A'}
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-600">Address not available</p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Time */}
                    {fulfillment.type?.toLowerCase() === 'delivery' && fulfillment.deliveryDetails?.deliverAt && (
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="mt-1 h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Delivery Time</p>
                          <p className="text-gray-600">
                            {safeFormat(fulfillment.deliveryDetails.deliverAt, 'PPP p')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Shipping Method */}
                    {fulfillment.type?.toLowerCase() === 'shipment' && (
                      <div className="flex items-start gap-3">
                        <TruckIcon className="mt-1 h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Shipping Method</p>
                          <p className="text-gray-600">
                            {fulfillment.shipmentDetails?.carrier || 'Standard Shipping'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <Alert>
            <AlertDescription>
              {fulfillment?.type?.toLowerCase() === 'pickup' && (
                <>
                  Please bring your ID and order confirmation when picking up your order.
                  We&apos;ll notify you when your order is ready for pickup.
                </>
              )}
              {fulfillment?.type?.toLowerCase() === 'delivery' && (
                <>
                  We&apos;ll notify you when your order is out for delivery.
                  Make sure someone is available at the delivery address during the selected time slot.
                </>
              )}
              {fulfillment?.type?.toLowerCase() === 'shipment' && (
                <>
                  We&apos;ll send you tracking information once your order ships.
                  You can track your order status using the order ID above.
                </>
              )}
              {(!fulfillment || !fulfillment.type) && (
                <>
                  Your order details are being processed. We&apos;ll update you soon.
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </main>
  );
}