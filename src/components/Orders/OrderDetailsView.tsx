'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import {
  CreditCard,
  Clock,
  AlertCircle,
  Package,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { logger } from '@/utils/logger';

type RegularOrderData = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  paymentUrlExpiresAt: Date | null;
  email: string;
  phone: string;
  customerName: string;
  fulfillmentType: string;
  pickupTime?: Date | null;
  deliveryAddress?: string | null;
  shippingAddress?: string | null;
  items: Array<{
    quantity: number;
    price: number;
    product: {
      name: string;
    };
    variant?: {
      name: string;
    } | null;
  }>;
  type: 'regular';
};

type CateringOrderData = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  paymentUrlExpiresAt: Date | null;
  email: string;
  phone: string;
  name: string;
  eventDate: Date;
  numberOfPeople: number;
  items: Array<{
    quantity: number;
    itemName: string;
    pricePerUnit: number;
  }>;
  type: 'catering';
};

type OrderData = RegularOrderData | CateringOrderData;

interface Props {
  order: OrderData;
  isAuthenticated: boolean;
}

export function OrderDetailsView({ order, isAuthenticated }: Props) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPayment = async () => {
    setIsRetrying(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/retry-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retry payment');
      }

      if (result.success && result.checkoutUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      logger.error('Retry payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'outline' | 'primary' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
      case 'PROCESSING':
        return 'warning';
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'FAILED':
      case 'REFUNDED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mb-4 border-destino-yellow/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange transition-all"
          >
            <Link href={isAuthenticated ? '/account/orders' : '/orders/pending'}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-gradient-to-br from-destino-orange to-amber-600 p-3 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-destino-charcoal">
                Order #{order.id.slice(-8)}
              </h1>
              <p className="text-gray-600">
                {order.type === 'regular' ? 'Regular Order' : 'Catering Order'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Order Status Card */}
          <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                    <Package className="h-5 w-5 text-destino-orange" />
                    Order Status
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Placed on {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-destino-charcoal mb-1">
                    ${Number(order.total).toFixed(2)}
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <p className={`font-semibold ${getPaymentStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-semibold">{order.paymentMethod}</p>
                </div>
              </div>

              {/* Retry Payment Information */}
              {order.retryCount > 0 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Payment retry attempts: {order.retryCount}/3</AlertDescription>
                </Alert>
              )}

              {/* Retry Payment Button */}
              {order.paymentMethod === 'SQUARE' && order.paymentStatus === 'PENDING' && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleRetryPayment}
                    disabled={isRetrying || order.retryCount >= 3}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="h-4 w-4" />
                    {isRetrying ? 'Processing...' : 'Complete Payment'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
              <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                <User className="h-5 w-5 text-destino-orange" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>
                    {order.type === 'regular'
                      ? (order as RegularOrderData).customerName
                      : (order as CateringOrderData).name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{order.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{order.phone}</span>
                </div>
                {order.type === 'catering' && (
                  <>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        Event Date:{' '}
                        {format(new Date((order as CateringOrderData).eventDate), 'PPP')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>Number of People: {(order as CateringOrderData).numberOfPeople}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fulfillment Information */}
          {order.type === 'regular' && (
            <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
                <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                  <MapPin className="h-5 w-5 text-destino-orange" />
                  Fulfillment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Method</p>
                    <p className="font-semibold capitalize">
                      {(order as RegularOrderData).fulfillmentType.replace('_', ' ')}
                    </p>
                  </div>
                  {(order as RegularOrderData).pickupTime && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pickup Time</p>
                      <p className="font-semibold">
                        {format(new Date((order as RegularOrderData).pickupTime!), 'PPP p')}
                      </p>
                    </div>
                  )}
                  {(order as RegularOrderData).deliveryAddress && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
                      <p className="font-semibold">{(order as RegularOrderData).deliveryAddress}</p>
                    </div>
                  )}
                  {(order as RegularOrderData).shippingAddress && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Shipping Address</p>
                      <p className="font-semibold">{(order as RegularOrderData).shippingAddress}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
              <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                <Package className="h-5 w-5 text-destino-orange" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {order.type === 'regular'
                  ? (order as RegularOrderData).items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-3 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {item.product.name}
                            {item.variant && ` (${item.variant.name})`}
                          </p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">
                          ${(Number(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))
                  : (order as CateringOrderData).items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-3 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">
                          ${(Number(item.pricePerUnit) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t-2 border-destino-orange/30">
                  <p className="text-lg font-bold">Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${Number(order.total).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="mt-8 text-center bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <p className="text-sm text-gray-600 mb-4">
              Need help with this order?{' '}
              <Link
                href="/contact"
                className="text-destino-orange hover:text-destino-charcoal font-medium transition-colors hover:no-underline"
              >
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
