import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
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

    // Fetch the catering order with all related data
    const cateringOrder = await prisma.cateringOrder.findUnique({
      where: { id: cateringId },
      include: {
        items: true,
        customer: true,
      },
    });

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
                        {/* Debug info - remove this after fixing */}
                        <details className="mt-2 text-xs text-gray-500">
                          <summary>Debug Info (will be removed)</summary>
                          <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                            Type: {typeof cateringOrder.deliveryAddress}{'\n'}
                            Raw: {JSON.stringify(cateringOrder.deliveryAddress, null, 2)}
                          </pre>
                        </details>
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

              {/* Order Total */}
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex justify-between items-center">
                                  <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(cateringOrder.totalAmount?.toNumber())}
                </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('Error fetching catering order:', error);
    throw error;
  }
}
