import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, MapPin, ArrowLeft, Package, User } from 'lucide-react';
import { getBoxedLunchImage } from '@/lib/utils';
import { OrderItemImage } from '@/components/ui/order-item-image';
import { RetryPaymentButton } from '@/components/Orders/RetryPaymentButton';

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
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericAmount);
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
    PROCESSING: 'secondary',
    CONFIRMED: 'secondary',
    PREPARING: 'secondary',
    READY: 'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    FULFILLMENT_UPDATED: 'secondary',
    SHIPPING: 'primary',
    DELIVERED: 'success',
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

// Helper to get the display text for order status based on fulfillment type
const getStatusDisplayText = (status: string | null | undefined, fulfillmentType: string | null | undefined): string => {
  if (!status) return 'UNKNOWN';
  
  // Handle READY status based on fulfillment type
  if (status === 'READY') {
    const fulfillment = fulfillmentType?.toLowerCase();
    
    if (fulfillment === 'pickup') {
      return 'READY FOR PICKUP';
    } else if (fulfillment === 'local_delivery') {
      return 'READY FOR DELIVERY';
    } else if (fulfillment === 'nationwide_shipping') {
      return 'READY FOR SHIPPING';
    } else {
      // Fallback for unknown fulfillment types
      return 'READY';
    }
  }
  
  // For all other statuses, return as-is
  return status;
};

export default async function OrderDetailsPage({ params }: PageProps) {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
        <div className="container mx-auto py-16 text-center">
          <div className="mx-auto max-w-md bg-white/95 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-destino-yellow/30">
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-destino-yellow to-destino-orange p-6 shadow-lg">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-destino-charcoal">Account Access</h1>
            <p className="mb-6 text-gray-600">Please sign in to access your order details.</p>
            <Button asChild size="lg" className="bg-gradient-to-r from-destino-yellow to-yellow-400 hover:from-yellow-400 hover:to-destino-yellow text-destino-charcoal shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Await the params Promise to access orderId
  const { orderId } = await params;

  if (!orderId) {
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

  // Try to fetch as a regular order first with enhanced error handling
  let regularOrder = null;
  let cateringOrder = null;
  
  try {
    regularOrder = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: user.id, // Ensure the order belongs to the authenticated user
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
  } catch (error) {
    // Log error with context
    console.error('Failed to fetch regular order:', {
      orderId,
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code
    });
    
    // Check if it's a prepared statement error
    if (error instanceof Error && 
        ((error as any).code === '42P05' || // prepared statement already exists
         (error as any).code === '26000' || // prepared statement does not exist
         error.message.includes('prepared statement'))) {
      console.log('Detected prepared statement error, attempting retry with fresh connection...');
      
      // Attempt one retry with a fresh connection
      try {
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        regularOrder = await prisma.order.findUnique({
          where: {
            id: orderId,
            userId: user.id,
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
        
        console.log('✅ Retry successful after prepared statement error');
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  // If not found as regular order, try as catering order with same error handling
  if (!regularOrder) {
    try {
      cateringOrder = await prisma.cateringOrder.findUnique({
        where: {
          id: orderId,
          customerId: user.id, // Ensure the order belongs to the authenticated user
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          name: true,
          email: true,
          phone: true,
          eventDate: true,
          numberOfPeople: true,
          specialRequests: true,
          deliveryAddress: true,
          deliveryFee: true,
          paymentMethod: true,
          paymentStatus: true,
          retryCount: true,
          lastRetryAt: true,
          paymentUrl: true,
          paymentUrlExpiresAt: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              pricePerUnit: true,
              totalPrice: true,
              itemName: true,
              itemType: true,
            },
          },
        },
      });
    } catch (error) {
      // Log error with context
      console.error('Failed to fetch catering order:', {
        orderId,
        customerId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code
      });
      
      // Check if it's a prepared statement error
      if (error instanceof Error && 
          ((error as any).code === '42P05' || // prepared statement already exists
           (error as any).code === '26000' || // prepared statement does not exist
           error.message.includes('prepared statement'))) {
        console.log('Detected prepared statement error in catering order query, attempting retry...');
        
        // Attempt one retry with a fresh connection
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          cateringOrder = await prisma.cateringOrder.findUnique({
            where: {
              id: orderId,
              customerId: user.id,
            },
            select: {
              id: true,
              status: true,
              totalAmount: true,
              name: true,
              email: true,
              phone: true,
              eventDate: true,
              numberOfPeople: true,
              specialRequests: true,
              deliveryAddress: true,
              deliveryFee: true,
              paymentMethod: true,
              paymentStatus: true,
              retryCount: true,
              lastRetryAt: true,
              paymentUrl: true,
              paymentUrlExpiresAt: true,
              createdAt: true,
              items: {
                select: {
                  id: true,
                  quantity: true,
                  pricePerUnit: true,
                  totalPrice: true,
                  itemName: true,
                  itemType: true,
                },
              },
            },
          });
          
          console.log('✅ Catering order retry successful after prepared statement error');
        } catch (retryError) {
          console.error('❌ Catering order retry failed:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  // If neither order type exists, show 404
  if (!regularOrder && !cateringOrder) {
    notFound();
  }

  // Determine order type and format data accordingly
  const isRegularOrder = !!regularOrder;
  const isCateringOrder = !!cateringOrder;

  // Common order data structure
  const orderData = isRegularOrder
    ? {
        id: regularOrder!.id,
        status: regularOrder!.status,
        paymentStatus: regularOrder!.paymentStatus,
        total: regularOrder!.total?.toNumber() ?? 0,
        taxAmount: regularOrder!.taxAmount?.toNumber() ?? 0,
        deliveryFee: regularOrder!.deliveryFee?.toNumber() ?? 0,
        serviceFee: regularOrder!.serviceFee?.toNumber() ?? 0,
        gratuityAmount: regularOrder!.gratuityAmount?.toNumber() ?? 0,
        shippingCost: regularOrder!.shippingCostCents ? (regularOrder!.shippingCostCents / 100) : 0,
        createdAt: regularOrder!.createdAt,
        customerName: regularOrder!.customerName,
        email: regularOrder!.email,
        phone: regularOrder!.phone,
        pickupTime: regularOrder!.pickupTime,
        fulfillmentType: regularOrder!.fulfillmentType,
        trackingNumber: regularOrder!.trackingNumber,
        shippingCarrier: regularOrder!.shippingCarrier,
        items: regularOrder!.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price?.toNumber() ?? 0,
          productName: item.product?.name || 'N/A',
          variantName: item.variant?.name || '-',
          imageUrl:
            item.product?.images && item.product.images.length > 0
              ? item.product.images[0]
              : undefined,
        })),
        type: 'regular' as const,
      }
    : {
        id: cateringOrder!.id,
        status: cateringOrder!.status,
        paymentStatus: cateringOrder!.paymentStatus,
        total: cateringOrder!.totalAmount?.toNumber() ?? 0,
        taxAmount: 0, // Catering orders don't store tax breakdown separately
        deliveryFee: cateringOrder!.deliveryFee?.toNumber() ?? 0,
        serviceFee: 0, // Catering orders don't have service fees
        gratuityAmount: 0, // Catering orders don't store gratuity separately
        shippingCost: 0, // Catering orders don't have shipping
        createdAt: cateringOrder!.createdAt,
        customerName: cateringOrder!.name,
        email: cateringOrder!.email,
        phone: cateringOrder!.phone,
        eventDate: cateringOrder!.eventDate,
        numberOfPeople: cateringOrder!.numberOfPeople,
        specialRequests: cateringOrder!.specialRequests,
        deliveryAddress: cateringOrder!.deliveryAddress,
        items: cateringOrder!.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.pricePerUnit?.toNumber() ?? 0,
          productName: item.itemName, // Use itemName instead of name
          itemType: item.itemType,
          totalPrice: item.totalPrice?.toNumber() ?? 0,
        })),
        type: 'catering' as const,
      };

  const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate subtotal (total minus all fees and taxes)
  const subtotal = orderData.total - orderData.taxAmount - orderData.deliveryFee - orderData.serviceFee - orderData.gratuityAmount - orderData.shippingCost;

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Navigation */}
        <div className="mb-6">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-destino-yellow/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all bg-white/80 backdrop-blur-sm"
          >
            <Link href="/account">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Account
            </Link>
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gradient-to-br from-destino-orange to-amber-600 p-3 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-destino-charcoal">Order Details</h1>
              <p className="text-gray-600">
                {orderData.type === 'catering' ? 'Catering Order' : 'Regular Order'} • Placed{' '}
                {formatDistance(new Date(orderData.createdAt), new Date(), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
                <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                  <Package className="h-5 w-5 text-destino-orange" />
                  Order Summary
                </CardTitle>
                <CardDescription className="text-gray-600">Order #{orderData.id.slice(-8)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Status</p>
                    <Badge variant={getStatusVariant(orderData.status)} className="mt-1">
                      {getStatusDisplayText(orderData.status, orderData.fulfillmentType)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Payment Status</p>
                    <Badge
                      variant={getPaymentStatusVariant(orderData.paymentStatus)}
                      className="mt-1"
                    >
                      {orderData.paymentStatus}
                    </Badge>
                    {/* Show retry payment button for eligible orders */}
                    {((isRegularOrder &&
                      (orderData.status === 'PENDING' || orderData.status === 'PAYMENT_FAILED') &&
                      (orderData.paymentStatus === 'PENDING' || orderData.paymentStatus === 'FAILED') &&
                      regularOrder?.paymentMethod === 'SQUARE') ||
                      (isCateringOrder &&
                      orderData.status === 'PENDING' && // CateringStatus only has PENDING (no PAYMENT_FAILED)
                      (orderData.paymentStatus === 'PENDING' || orderData.paymentStatus === 'FAILED') &&
                      cateringOrder?.paymentMethod === 'SQUARE')) && (
                      <div className="mt-2">
                        <RetryPaymentButton
                          orderId={orderData.id}
                          retryCount={isRegularOrder ? (regularOrder?.retryCount || 0) : (cateringOrder?.retryCount || 0)}
                          disabled={isRegularOrder ? ((regularOrder?.retryCount || 0) >= 3) : ((cateringOrder?.retryCount || 0) >= 3)}
                        />
                      </div>
                      )}
                  </div>
                </div>

                {/* Add Payment Method Row */}
                <div className="pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Payment Method</p>
                    <Badge variant="outline" className="mt-1">
                      {isRegularOrder
                        ? regularOrder?.paymentMethod || 'SQUARE'
                        : cateringOrder!.paymentMethod || 'SQUARE'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(orderData.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-lg font-semibold text-gray-900">{totalQuantity}</p>
                  </div>
                </div>

                {/* Regular order specific fields */}
                {isRegularOrder && (
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    {orderData.pickupTime && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Pickup Time</p>
                          <p className="text-gray-900">{formatDateTime(orderData.pickupTime)}</p>
                        </div>
                      </div>
                    )}
                    {orderData.fulfillmentType && orderData.fulfillmentType !== 'pickup' && (
                      <div>
                        <p className="text-sm text-gray-600">Fulfillment Type</p>
                        <p className="text-gray-900">
                          {orderData.fulfillmentType.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                    {orderData.trackingNumber && (
                      <div className="bg-gradient-to-r from-blue-50 to-destino-cream/30 p-4 rounded-lg border border-blue-200/50 backdrop-blur-sm">
                        <h4 className="font-semibold text-blue-900 mb-2">Shipping Information</h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-blue-700">Tracking Number:</span>{' '}
                            {orderData.trackingNumber}
                          </p>
                          {orderData.shippingCarrier && (
                            <p>
                              <span className="text-blue-700">Carrier:</span>{' '}
                              {orderData.shippingCarrier}
                            </p>
                          )}
                          {orderData.trackingNumber && orderData.shippingCarrier && (
                            <p className="mt-2">
                              <a
                                href={getTrackingUrl(
                                  orderData.trackingNumber,
                                  orderData.shippingCarrier
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-destino-charcoal underline font-medium transition-colors hover:no-underline"
                              >
                                Track Your Package
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Catering order specific fields */}
                {isCateringOrder && (
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Event Date</p>
                        <p className="text-gray-900">{formatDateTime(orderData.eventDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Number of People</p>
                        <p className="text-gray-900">{orderData.numberOfPeople}</p>
                      </div>
                    </div>
                    {orderData.deliveryAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Delivery Address</p>
                          <p className="text-gray-900">{orderData.deliveryAddress}</p>
                        </div>
                      </div>
                    )}
                    {orderData.deliveryFee && orderData.deliveryFee > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Delivery Fee</p>
                        <p className="text-gray-900">{formatCurrency(orderData.deliveryFee)}</p>
                      </div>
                    )}
                    {orderData.specialRequests && (
                      <div className="bg-gradient-to-r from-purple-50 to-destino-cream/30 p-4 rounded-lg border border-purple-200/50 backdrop-blur-sm">
                        <h4 className="font-semibold text-purple-900 mb-1">Special Requests</h4>
                        <p className="text-purple-800 text-sm">{orderData.specialRequests}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 text-sm text-gray-600">
                  <strong>Order Placed:</strong> {formatDateTime(orderData.createdAt)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Information */}
          <div>
            <Card className="bg-white/95 backdrop-blur-sm border-destino-yellow/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-yellow/20">
                <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                  <User className="h-5 w-5 text-destino-orange" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-gray-900">{orderData.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900">{orderData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{orderData.phone}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Order Items */}
        <Card className="bg-white/95 backdrop-blur-sm border-destino-yellow/30 shadow-lg mb-8">
          <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-yellow/20">
            <CardTitle className="text-destino-charcoal">Items Ordered ({orderData.items.length})</CardTitle>
            <CardDescription className="text-gray-600">
              {totalQuantity} total items • {formatCurrency(orderData.total)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderData.items.map(item => {
                const itemTotal = isRegularOrder
                  ? item.price * item.quantity
                  : (item as any).totalPrice;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border border-destino-yellow/30 rounded-lg hover:bg-destino-cream/20 transition-colors backdrop-blur-sm"
                  >
                    {/* Item Image - Only show for regular orders, not catering orders */}
                    {!isCateringOrder && (
                      <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                        <OrderItemImage
                          src={(item as any).imageUrl ?? getBoxedLunchImage(item.productName)}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.productName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {isRegularOrder && (item as any).variantName !== '-' && (
                          <Badge variant="outline" className="text-xs">
                            {(item as any).variantName}
                          </Badge>
                        )}
                        {isCateringOrder && (
                          <Badge variant="outline" className="text-xs">
                            {((item as any).itemType || 'item').toUpperCase()}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{formatCurrency(item.price)} each</div>
                      <div className="font-medium text-gray-900">{formatCurrency(itemTotal)}</div>
                    </div>
                  </div>
                );
              })}

              {/* Order Breakdown */}
              <div className="border-t border-gray-200 pt-4 mt-6 space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {/* Tax */}
                {orderData.taxAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(orderData.taxAmount)}
                    </span>
                  </div>
                )}

                {/* Delivery Fee */}
                {orderData.deliveryFee > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Delivery Fee:</span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(orderData.deliveryFee)}
                    </span>
                  </div>
                )}

                {/* Shipping Cost */}
                {orderData.shippingCost > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Shipping{orderData.shippingCarrier ? ` (${orderData.shippingCarrier})` : ''}:
                    </span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(orderData.shippingCost)}
                    </span>
                  </div>
                )}

                {/* Service Fee */}
                {orderData.serviceFee > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Service Fee:</span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(orderData.serviceFee)}
                    </span>
                  </div>
                )}

                {/* Gratuity */}
                {orderData.gratuityAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Gratuity/Tip:</span>
                    <span className="text-gray-900 font-medium">
                      {formatCurrency(orderData.gratuityAmount)}
                    </span>
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-gray-200 pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(orderData.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support section */}
        <Card className="bg-white/95 backdrop-blur-sm border-blue-300/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50/50 to-destino-cream/30 border-b border-blue-200/20">
            <CardTitle className="text-destino-charcoal">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              If you have any questions about your order, please contact our customer service team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                variant="outline"
                className="border-blue-300/40 text-destino-charcoal hover:bg-blue-50/50 hover:border-blue-400 hover:text-destino-charcoal transition-all transform hover:scale-[1.02]"
              >
                <Link href="/contact">Contact Us</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-destino-orange/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all transform hover:scale-[1.02]"
              >
                <Link href="/account/orders">View All Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
