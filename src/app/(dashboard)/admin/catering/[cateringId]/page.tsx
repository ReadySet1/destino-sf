import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db-unified';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

// Types
interface PageProps {
  params: Promise<{ cateringId: string }>;
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
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericAmount);
};

// Helper to parse delivery address and extract delivery info
const parseDeliveryInfo = (address: any): { address: string; deliveryDateTime?: string } => {
  if (!address) return { address: '' };
  
  if (typeof address === 'string') {
    // Check if it contains "[object Object]" - this means the original object wasn't properly serialized
    if (address.includes('[object Object]')) {
      // Extract the date/time part after the comma
      const parts = address.split(', ');
      if (parts.length > 1) {
        return {
          address: 'Address information unavailable (data corruption)',
          deliveryDateTime: parts.slice(1).join(', ')
        };
      }
      return { address: 'Address information unavailable (data corruption)' };
    }
    
    // Check if it's a JSON string
    try {
      const parsed = JSON.parse(address);
      if (typeof parsed === 'object') {
        const parts = [];
        if (parsed.street) parts.push(parsed.street);
        if (parsed.street2) parts.push(parsed.street2);
        if (parsed.city) parts.push(parsed.city);
        if (parsed.state) parts.push(parsed.state);
        if (parsed.postalCode) parts.push(parsed.postalCode);
        return { address: parts.join(', ') };
      }
    } catch {
      // Not a JSON string, return as-is
      return { address };
    }
    return { address };
  }
  
  // If it's an object, format it properly
  if (typeof address === 'object') {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.street2) parts.push(address.street2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    return { address: parts.join(', ') };
  }
  
  return { address: String(address) };
};

// Helper to get badge variant for different order statuses
const getStatusVariant = (
  status: string | null | undefined
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'
  | undefined => {
  if (!status) return 'secondary';

  const statusMap: Record<
    string,
    'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
  > = {
    PENDING: 'warning',
    CONFIRMED: 'secondary',
    PREPARING: 'secondary',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };

  return statusMap[status] || 'secondary';
};

// Helper to get badge variant for payment status
const getPaymentStatusVariant = (
  status: string | null | undefined
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'
  | undefined => {
  if (!status) return 'secondary';

  const statusMap: Record<
    string,
    'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
  > = {
    PENDING: 'warning',
    PAID: 'success',
    FAILED: 'danger',
    REFUNDED: 'danger',
    COMPLETED: 'success',
  };

  return statusMap[status] || 'secondary';
};

export default async function AdminCateringOrderPage({ params }: PageProps) {
  try {
    // Await params before accessing its properties (Next.js 15 requirement)
    const { cateringId } = await params;

    if (!cateringId) {
      console.error('No catering order ID provided');
      notFound();
    }

    // Validate UUID format before making database query
    const isValidUUID = (uuid: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    if (!isValidUUID(cateringId)) {
      console.error(`Invalid UUID format for cateringId: ${cateringId}`);
      notFound();
    }

    // Log before database query
    console.log('Fetching catering order with ID:', cateringId);

    // Fetch the catering order with all related data with enhanced error handling
    let cateringOrder = null;
    
    try {
      cateringOrder = await prisma.cateringOrder.findUnique({
        where: { id: cateringId },
        include: {
          items: true,
          customer: true,
        },
      });
    } catch (error) {
      // Log error with context
      console.error('Failed to fetch admin catering order:', {
        cateringId,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code
      });
      
      // Check if it's a prepared statement error or connection issue
      if (error instanceof Error && 
          ((error as any).code === '42P05' || // prepared statement already exists
           (error as any).code === '26000' || // prepared statement does not exist
           error.message.includes('prepared statement') ||
           error.message.includes('Response from the Engine was empty'))) {
        console.log('Detected database connection error in admin catering order query, attempting retry...');
        
        // Attempt one retry with a fresh connection
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          cateringOrder = await prisma.cateringOrder.findUnique({
            where: { id: cateringId },
            include: {
              items: true,
              customer: true,
            },
          });
          
          console.log('✅ Admin catering order retry successful after database connection error');
        } catch (retryError) {
          console.error('❌ Admin catering order retry failed:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    if (!cateringOrder) {
      console.error(`Catering order not found for ID: ${cateringId}`);
      notFound();
    }

    const totalQuantity = cateringOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const orderTotal = cateringOrder.totalAmount?.toNumber() || 0;

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Catering Order Details</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/orders"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 mr-2"
            >
              Back to Orders
            </Link>
            <Link
              href={`/admin/catering/${cateringId}/edit`}
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
                <strong>Order ID:</strong> {cateringOrder?.id || 'N/A'}
              </p>
              <p>
                <strong>Square Order ID:</strong> {cateringOrder?.squareOrderId || 'N/A'}
              </p>
              <div>
                <strong>Status:</strong>{' '}
                <Badge className={`text-xs ${
                  cateringOrder?.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                  cateringOrder?.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  cateringOrder?.status === 'PREPARING' ? 'bg-blue-100 text-blue-800' :
                  cateringOrder?.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                  cateringOrder?.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {cateringOrder?.status || 'UNKNOWN'}
                </Badge>
              </div>
              <div>
                <strong>Payment Status:</strong>{' '}
                <Badge className={`text-xs ${
                  cateringOrder?.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                  cateringOrder?.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  cateringOrder?.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                  cateringOrder?.paymentStatus === 'REFUNDED' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {cateringOrder?.paymentStatus || 'PENDING'}
                </Badge>
              </div>
              <p>
                <strong>Total Amount:</strong> {formatCurrency(orderTotal)}
              </p>
              <p>
                <strong>Total Items:</strong> {totalQuantity}
              </p>
              <p>
                <strong>Event Date:</strong> {formatDateTime(cateringOrder?.eventDate)}
              </p>
              <p>
                <strong>Number of People:</strong> {cateringOrder?.numberOfPeople}
              </p>
              <p>
                <strong>Order Placed:</strong> {formatDateTime(cateringOrder?.createdAt)}
                {cateringOrder?.createdAt
                  ? ` (${formatDistance(new Date(cateringOrder.createdAt), new Date(), { addSuffix: true })})`
                  : ''}
              </p>
              <p>
                <strong>Last Updated:</strong> {formatDateTime(cateringOrder?.updatedAt)}
              </p>

              {cateringOrder?.deliveryAddress && (
                <p>
                  <strong>Delivery Address:</strong> {parseDeliveryInfo(cateringOrder.deliveryAddress).address}
                </p>
              )}

              <p>
                <strong>Fulfillment Type:</strong> CATERING
              </p>
            </div>

            {cateringOrder?.specialRequests && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-1">Special Requests</h4>
                <p className="text-purple-800 text-sm">{cateringOrder.specialRequests}</p>
              </div>
            )}
          </div>

          {/* Customer Information */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Name:</strong> {cateringOrder?.name || 'N/A'}
              </p>
              <p>
                <strong>Email:</strong> {cateringOrder?.email || 'N/A'}
              </p>
              <p>
                <strong>Phone:</strong> {cateringOrder?.phone || 'N/A'}
              </p>
              {/* Add user link if available */}
              {cateringOrder?.customerId && (
                <p>
                  <strong>User Account:</strong>{' '}
                  <Link
                    href={`/admin/users/${cateringOrder.customerId}`}
                    className="text-indigo-600 hover:underline"
                  >
                    View User
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Items Ordered ({cateringOrder?.items?.length || 0})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {cateringOrder?.items && cateringOrder.items.length > 0 ? (
                  cateringOrder.items.map((item: any) => {
                    const itemPrice = item.pricePerUnit?.toNumber() || 0;
                    const quantity = item.quantity || 0;
                    const totalPrice = item.totalPrice?.toNumber() || 0;
                    return (
                      <tr key={item.id || 'unknown'}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="font-medium">{item.itemName || 'N/A'}</div>
                            {item.notes && (
                              <div className="mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border">
                                <strong>Customizations:</strong> {item.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">
                            {(item.itemType || 'item').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">{quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {formatCurrency(itemPrice)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {formatCurrency(totalPrice)}
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
                  const subtotalFromItems = (cateringOrder?.items || []).reduce(
                    (sum: number, item: any) => sum + (item.totalPrice?.toNumber() || 0),
                    0
                  );

                  // Get individual components
                  const deliveryFee = cateringOrder?.deliveryFee?.toNumber() || 0;
                  
                  // Calculate tax (8.25% on subtotal + delivery fee)
                  const taxableAmount = subtotalFromItems + deliveryFee;
                  const taxAmount = taxableAmount * 0.0825;
                  
                  // Calculate service fee (3.5% of subtotal + delivery fee + tax)
                  const totalBeforeFee = subtotalFromItems + deliveryFee + taxAmount;
                  const serviceFee = totalBeforeFee * 0.035;

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

                      {/* Service Fee */}
                      {serviceFee > 0.01 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">
                            Service Fee (3.5%):
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(serviceFee)}
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
        {cateringOrder?.squareOrderId && (
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
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {cateringOrder.squareOrderId || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={`text-xs ${
                        cateringOrder?.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                        cateringOrder?.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        cateringOrder?.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                        cateringOrder?.paymentStatus === 'REFUNDED' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {cateringOrder?.paymentStatus || 'UNKNOWN'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {formatCurrency(orderTotal)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(cateringOrder?.createdAt)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
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
    console.error('Error fetching catering order:', error);

    // Provide a fallback UI when there's an error
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-red-900 mb-2">Error Loading Catering Order</h1>
              <p className="text-red-700 mb-4">
                There was a problem loading the catering order details.
              </p>
              
              <div className="text-sm text-red-600 mb-6">
                <p>Error details:</p>
                <code className="bg-red-100 px-2 py-1 rounded font-mono text-sm block mt-2">
                  {error instanceof Error ? error.message : 'Unknown error'}
                </code>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/admin/orders"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  View All Orders
                </Link>
                <Link
                  href="/admin"
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Admin Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
