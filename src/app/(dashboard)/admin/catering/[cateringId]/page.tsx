import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db-unified';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, MapPin, ArrowLeft, Package, User, Phone, Mail } from 'lucide-react';
import { ResponsivePageHeader, BreadcrumbItem, BreadcrumbSeparator } from '@/components/ui/responsive-page-header';

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

    return (
      <div className="space-y-6 md:space-y-8">
        <ResponsivePageHeader
          title="Catering Order Details"
          subtitle={`Order #${cateringOrder.id.slice(-8)} • ${cateringOrder.name}`}
          breadcrumbs={
            <>
              <BreadcrumbItem href="/admin">Dashboard</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem href="/admin/orders">Orders</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem isCurrent>Catering Order</BreadcrumbItem>
            </>
          }
          actions={
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <Link href="/admin/orders">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Link>
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-600" />
                  Order Summary
                </CardTitle>
                <CardDescription>Order #{cateringOrder.id.slice(-8)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Status</p>
                    <Badge variant={getStatusVariant(cateringOrder.status)} className="mt-1">
                      {cateringOrder.status === 'PREPARING' ? 'PREPARING' : cateringOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Payment Status</p>
                    <Badge
                      variant={getPaymentStatusVariant(cateringOrder.paymentStatus)}
                      className="mt-1"
                    >
                      {cateringOrder.paymentStatus}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Payment Method</p>
                    <Badge variant="outline" className="mt-1">
                      {cateringOrder.paymentMethod || 'SQUARE'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(cateringOrder.totalAmount?.toNumber())}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-lg font-semibold text-gray-900">{totalQuantity}</p>
                  </div>
                </div>

                {/* Catering order specific fields */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Event Date</p>
                      <p className="text-gray-900">{formatDateTime(cateringOrder.eventDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Number of People</p>
                      <p className="text-gray-900">{cateringOrder.numberOfPeople}</p>
                    </div>
                  </div>
                  {cateringOrder.deliveryAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Delivery Address</p>
                        <p className="text-gray-900">{parseDeliveryInfo(cateringOrder.deliveryAddress).address}</p>
                      </div>
                    </div>
                  )}
                  {cateringOrder.deliveryFee && cateringOrder.deliveryFee.toNumber() > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Delivery Fee</p>
                      <p className="text-gray-900">{formatCurrency(cateringOrder.deliveryFee?.toNumber())}</p>
                    </div>
                  )}
                  {cateringOrder.specialRequests && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-1">Special Requests</h4>
                      <p className="text-purple-800 text-sm">{cateringOrder.specialRequests}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 text-sm text-gray-600">
                  <strong>Order Placed:</strong> {formatDateTime(cateringOrder.createdAt)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Information */}
          <div>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-600" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-gray-900">{cateringOrder.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900">{cateringOrder.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{cateringOrder.phone}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Order Items */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Items Ordered ({cateringOrder.items.length})</CardTitle>
            <CardDescription>
              {totalQuantity} total items • {formatCurrency(cateringOrder.totalAmount?.toNumber())}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cateringOrder.items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  {/* Item Details */}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.itemName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {(item.itemType || 'item').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                    </div>
                    {/* Build Your Own Box Customizations */}
                    {item.notes && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="text-xs font-medium text-blue-800 mb-1">Customizations:</div>
                        <div className="text-xs text-blue-700">{item.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {formatCurrency(item.pricePerUnit?.toNumber())} each
                    </div>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(item.totalPrice?.toNumber())}
                    </div>
                  </div>
                </div>
              ))}

              {/* Order Total Breakdown */}
              <div className="border-t border-gray-200 pt-4 mt-6">
                {(() => {
                  // Calculate subtotal from items
                  const subtotal = cateringOrder.items.reduce(
                    (sum, item) => sum + (item.totalPrice?.toNumber() || 0),
                    0
                  );

                  // Get delivery fee
                  const deliveryFee = cateringOrder.deliveryFee?.toNumber() || 0;

                  // Calculate tax (8.25% on subtotal + delivery fee)
                  const taxableAmount = subtotal + deliveryFee;
                  const taxAmount = taxableAmount * 0.0825;

                  // Calculate service fee (3.5% on subtotal + delivery fee + tax)
                  const totalBeforeFee = subtotal + deliveryFee + taxAmount;
                  const serviceFee = totalBeforeFee * 0.035;

                  // Final total
                  const grandTotal = cateringOrder.totalAmount?.toNumber() || 0;

                  return (
                    <div className="space-y-2">
                      {/* Subtotal */}
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>

                      {/* Delivery Fee */}
                      {deliveryFee > 0 && (
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Delivery Fee:</span>
                          <span>{formatCurrency(deliveryFee)}</span>
                        </div>
                      )}

                      {/* Tax */}
                      {taxAmount > 0 && (
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Tax (8.25%):</span>
                          <span>{formatCurrency(taxAmount)}</span>
                        </div>
                      )}

                      {/* Service Fee */}
                      {serviceFee > 0.01 && (
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Service Fee (3.5%):</span>
                          <span>{formatCurrency(serviceFee)}</span>
                        </div>
                      )}

                      {/* Grand Total */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                        <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
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
