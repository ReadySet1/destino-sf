'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  User, 
  ShoppingBag, 
  CalendarDays, 
  FileText, 
  Eye,
  ArrowRight,
  Phone,
  Mail,
  Clock,
  MapPin,
  Truck,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { 
  OrderConfirmationProps, 
  StoreOrderData, 
  CateringOrderData
} from '@/types/confirmation';
import { isStoreOrder, isCateringOrder } from '@/types/confirmation';

export function OrderConfirmationLayout({
  orderType,
  status,
  orderData,
  customerData,
  paymentDetails
}: OrderConfirmationProps) {
  // Helper function to format dates safely
  const safeFormat = (dateString: string | null | undefined, formatString: string): string => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), formatString);
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  // Helper function to get fulfillment title for store orders
  const getFulfillmentTitle = (fulfillment?: StoreOrderData['fulfillment']): string => {
    if (!fulfillment || !fulfillment.type) return 'Order Details';
    
    switch (fulfillment.type.toLowerCase()) {
      case 'pickup': return 'Pickup Details';
      case 'delivery': return 'Delivery Details';
      case 'shipment': return 'Shipping Details';
      default: return 'Order Details';
    }
  };

  // Helper function to get next steps content
  const getNextStepsContent = () => {
    if (orderType === 'catering') {
      return (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            A member of our team will reach out to you within 24 hours to confirm 
            all the details of your order and answer any questions you might have.
          </p>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p>Please check your email for a confirmation of your order.</p>
            <div className="pt-2 border-t border-gray-200">
              <p className="font-medium text-gray-700 mb-1">For urgent inquiries:</p>
              <div className="space-y-1">
                <a href="tel:415-525-4448" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors">
                  <Phone className="h-3 w-3" />
                  415-525-4448
                </a>
                <a href="mailto:catering@destinosf.com" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors">
                  <Mail className="h-3 w-3" />
                  catering@destinosf.com
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Store order next steps
    if (orderData && isStoreOrder(orderData) && orderData.fulfillment) {
      const fulfillment = orderData.fulfillment;
      
      if (fulfillment.type === 'pickup') {
        return (
          <p className="text-sm text-gray-600">
            Please bring your ID and order confirmation when picking up your order.
            We&apos;ll notify you when your order is ready for pickup.
          </p>
        );
      } else if (fulfillment.type === 'delivery') {
        return (
          <p className="text-sm text-gray-600">
            We&apos;ll notify you when your order is out for delivery.
            Make sure someone is available at the delivery address during the selected time slot.
          </p>
        );
      } else if (fulfillment.type === 'shipment') {
        return (
          <p className="text-sm text-gray-600">
            We&apos;ll send you tracking information once your order ships.
            You can track your order status using the order ID above.
          </p>
        );
      }
    }

    return (
      <p className="text-sm text-gray-600">
        Your order details are being processed. We&apos;ll update you soon.
      </p>
    );
  };

  // Helper function to get action buttons
  const getActionButtons = () => {
    const buttons = [];

    // View Order Details button (if we have an orderId)
    if (orderData?.id) {
      buttons.push(
        <Link key="view-details" href={`/account/order/${orderData.id}`}>
          <Button 
            size="lg" 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Order Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      );
    }

    // Type-specific navigation buttons
    if (orderType === 'catering') {
      buttons.push(
        <Link key="catering-menu" href="/catering">
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            Return to Catering Menu
          </Button>
        </Link>
      );
    } else {
      buttons.push(
        <Link key="continue-shopping" href="/">
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            Continue Shopping
          </Button>
        </Link>
      );
    }

    // Home button
    buttons.push(
      <Link key="home" href="/">
        <Button 
          size="lg" 
          className="w-full sm:w-auto bg-[#2d3538] hover:bg-[#2d3538]/90 text-white"
        >
          Back to Home
        </Button>
      </Link>
    );

    return buttons;
  };

  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {status === 'success' ? 'Thank You for Your Order!' : 'Order Status'}
          </h1>
          <p className="text-gray-600">
            {orderType === 'catering' 
              ? 'Your catering order has been received and is being processed.'
              : 'Thank you for your order. We&apos;ll send you updates about your order status.'
            }
          </p>
        </div>

        {/* Payment Success Alert */}
        {paymentDetails?.isSquareRedirect && paymentDetails.squareStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Your payment has been processed successfully!</span>
            </div>
            {paymentDetails.squareOrderId && (
              <p className="text-sm text-green-700 mt-1">
                Order ID: <code className="bg-green-200 px-2 py-1 rounded text-xs">{paymentDetails.squareOrderId}</code>
              </p>
            )}
          </div>
        )}

        {orderData && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Order Summary - Left Column (2/3 width) */}
            <div className="md:col-span-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Order Info Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Package className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Order ID</p>
                          <p className="text-gray-900 font-mono text-sm">{orderData.id}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600 font-medium">
                            {orderType === 'catering' ? 'Event Date' : 'Order Date'}
                          </p>
                          <p className="text-gray-900">
                            {orderType === 'catering' && isCateringOrder(orderData)
                              ? formatDate(new Date(orderData.eventDetails.eventDate))
                              : orderData.createdAt ? format(new Date(orderData.createdAt), 'PPP') : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Catering-specific: Special Requests */}
                    {orderType === 'catering' && isCateringOrder(orderData) && orderData.eventDetails.specialRequests && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Special Requests</p>
                          <p className="text-gray-900 text-sm">{orderData.eventDetails.specialRequests}</p>
                        </div>
                      </div>
                    )}

                    {/* Store-specific: Fulfillment Details */}
                    {orderType === 'store' && isStoreOrder(orderData) && orderData.fulfillment && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">{getFulfillmentTitle(orderData.fulfillment)}</h4>
                        
                        {/* Pickup Details */}
                        {orderData.fulfillment.type === 'pickup' && orderData.pickupTime && (
                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <CalendarDays className="h-5 w-5 text-gray-600 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-600 font-medium">Pickup Time</p>
                              <p className="text-gray-900">{safeFormat(orderData.pickupTime, 'PPP p')}</p>
                            </div>
                          </div>
                        )}

                        {/* Delivery/Shipping Address */}
                        {(orderData.fulfillment.type === 'delivery' || orderData.fulfillment.type === 'shipment') && (
                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-600 font-medium">
                                {orderData.fulfillment.type === 'delivery' ? 'Delivery Address' : 'Shipping Address'}
                              </p>
                              {/* Display address details */}
                              {/* ... address rendering logic ... */}
                            </div>
                          </div>
                        )}

                        {/* Tracking Information */}
                        {orderData.fulfillment?.trackingNumber && (
                          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm text-blue-600 font-medium">Tracking Number</p>
                              <p className="text-blue-900 font-mono">{orderData.fulfillment.trackingNumber}</p>
                              {orderData.fulfillment.shippingCarrier && (
                                <p className="text-sm text-blue-700">({orderData.fulfillment.shippingCarrier})</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Items Ordered</h4>
                      <div className="space-y-3">
                        {orderData.items.map((item, index) => {
                          const pricePerUnit = item.pricePerUnit || item.price || 0;
                          const totalPrice = item.totalPrice || item.finalPrice || (pricePerUnit * item.quantity);
                          
                          return (
                            <div key={item.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">
                                  {item.name || item.product?.name || 'Unknown Item'}
                                  {item.variant?.name && ` (${item.variant.name})`}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.metadata?.type && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.metadata.type === 'package' ? 'Package' : 'Item'}
                                    </Badge>
                                  )}
                                  <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(pricePerUnit)} each
                                </div>
                                <div className="font-semibold text-gray-900">
                                  {formatCurrency(totalPrice)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="border-t border-gray-200 mt-4 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">Total:</span>
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(isCateringOrder(orderData) ? orderData.totalAmount : orderData.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Info & Next Steps - Right Column (1/3 width) */}
            <div className="space-y-6">
              {/* Customer Information */}
              {customerData && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customerData.name && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{customerData.name}</span>
                        </div>
                      )}
                      {customerData.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{customerData.email}</span>
                        </div>
                      )}
                      {customerData.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{customerData.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* What's Next */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5" />
                    What&apos;s Next?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getNextStepsContent()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Error message if success but no data */}
        {status === 'success' && !orderData && (
          <Alert className="mb-8">
            <AlertDescription>
              Could not retrieve order details at this time. Please check your email for order confirmation.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
} 