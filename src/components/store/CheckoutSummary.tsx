import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CheckoutSummaryProps {
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  includeServiceFee?: boolean;
  deliveryFee?: {
    fee: number;
    isFreeDelivery?: boolean;
    zone?: string;
    minOrderForFreeDelivery?: number;
  } | null;
  shippingRate?: { amount: number; carrier: string; name: string; estimatedDays?: number } | null;
  fulfillmentMethod?: 'pickup' | 'local_delivery' | 'nationwide_shipping';
}

// Define the service fee rate
const SERVICE_FEE_RATE = 0.035; // 3.5%

export function CheckoutSummary({
  items,
  includeServiceFee = false,
  deliveryFee,
  shippingRate,
  fulfillmentMethod,
}: CheckoutSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.0825; // 8.25% tax

  // Calculate the delivery fee amount
  const deliveryFeeAmount = deliveryFee ? deliveryFee.fee : 0;

  // Calculate shipping cost
  const shippingCost = shippingRate ? shippingRate.amount : 0;

  // Calculate the base total before service fee
  const totalBeforeFee = subtotal + tax + deliveryFeeAmount + shippingCost;

  // Calculate service fee only if includeServiceFee is true
  const serviceFee = includeServiceFee ? totalBeforeFee * SERVICE_FEE_RATE : 0;

  // Calculate the final total including the service fee
  const total = totalBeforeFee + serviceFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <span>
                  {item.quantity} × {item.name}
                </span>
              </div>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {/* Delivery Fee row */}
          {deliveryFee !== undefined && fulfillmentMethod === 'local_delivery' && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <span>
                  Delivery{' '}
                  {deliveryFee && deliveryFee.isFreeDelivery && (
                    <span className="text-green-600 font-medium">(Free)</span>
                  )}
                </span>
              </div>
              <span>${deliveryFeeAmount.toFixed(2)}</span>
            </div>
          )}

          {/* Shipping Cost row - Enhanced visibility */}
          {shippingRate && fulfillmentMethod === 'nationwide_shipping' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="font-medium text-sm">Shipping ({shippingRate.carrier})</span>
                    <div className="text-xs text-gray-600">
                      {shippingRate.name}
                      {shippingRate.estimatedDays && (
                        <span> • {shippingRate.estimatedDays} days</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="font-medium">${shippingCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Alert when shipping is required but not selected */}
          {fulfillmentMethod === 'nationwide_shipping' && !shippingRate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a shipping method to see the total cost.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between text-sm">
            <span>Tax (8.25%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          {/* Conditionally display the service fee */}
          {includeServiceFee && serviceFee > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Service Fee (3.5%)</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {/* Enhanced messaging for different fulfillment methods */}
          {fulfillmentMethod === 'nationwide_shipping' && shippingRate && (
            <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
              <Truck className="inline h-3 w-3 mr-1" />
              Shipping included: {shippingRate.carrier} {shippingRate.name}
              {shippingRate.estimatedDays && ` (${shippingRate.estimatedDays} business days)`}
            </div>
          )}

          {/* Delivery fee message */}
          {deliveryFee && deliveryFee.zone === 'nearby' && !deliveryFee.isFreeDelivery && (
            <div className="mt-2 text-xs text-green-600">
              Orders over ${deliveryFee.minOrderForFreeDelivery?.toFixed(2)} qualify for free
              delivery!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
