import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package, AlertCircle, Box } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateTaxForItems } from '@/utils/tax-exemption';

interface CheckoutSummaryProps {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: { name?: string } | null;
  }>;
  includeServiceFee?: boolean;
  deliveryFee?: {
    fee: number;
    isFreeDelivery?: boolean;
    zone?: string;
    minOrderForFreeDelivery?: number;
  } | null;
  shippingRate?: {
    amount: number;
    carrier: string;
    name: string;
    estimatedDays?: number;
    /** Selected box information */
    selectedBox?: {
      displayName: string;
      boxSize: string;
    };
    /** Calculated weight in pounds */
    calculatedWeight?: number;
  } | null;
  fulfillmentMethod?: 'pickup' | 'local_delivery' | 'nationwide_shipping';
  taxRate?: number; // Allow custom tax rate, default to 8.25%
}

// Define the convenience fee rate
const SERVICE_FEE_RATE = 0.035; // 3.5%

export function CheckoutSummary({
  items,
  includeServiceFee = false,
  deliveryFee,
  shippingRate,
  fulfillmentMethod,
  taxRate = 0.0825, // Default to 8.25% tax
}: CheckoutSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Calculate tax with exemptions - only catering items are taxable
  const itemsForTaxCalculation = items.map(item => ({
    product: {
      category: item.category,
      name: item.name,
    },
    price: item.price,
    quantity: item.quantity,
  }));

  const taxCalculation = calculateTaxForItems(itemsForTaxCalculation, taxRate);
  const tax = taxCalculation.taxAmount;

  // Calculate the delivery fee amount
  const deliveryFeeAmount = deliveryFee ? deliveryFee.fee : 0;

  // Calculate shipping cost
  const shippingCost = shippingRate ? shippingRate.amount : 0;

  // Calculate the base total before convenience fee
  const totalBeforeFee = subtotal + tax + deliveryFeeAmount + shippingCost;

  // Calculate convenience fee only if includeServiceFee is true
  const serviceFee = includeServiceFee ? totalBeforeFee * SERVICE_FEE_RATE : 0;

  // Calculate the final total including the convenience fee
  const total = totalBeforeFee + serviceFee;

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-destino-yellow/30 shadow-lg lg:shadow-xl">
      <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-yellow/20">
        <CardTitle className="text-destino-charcoal font-bold">Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm hover:bg-destino-cream/20 rounded-lg p-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-destino-orange" />
                <span className="text-destino-charcoal">
                  {item.quantity} × {item.name}
                </span>
              </div>
              <span className="font-semibold text-destino-charcoal">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-destino-yellow/30 pt-4">
          <div className="flex justify-between text-sm text-destino-charcoal/80">
            <span>Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          {/* Delivery Fee row */}
          {deliveryFee !== undefined && fulfillmentMethod === 'local_delivery' && (
            <div className="flex justify-between text-sm text-destino-charcoal/80">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-destino-orange" />
                <span>
                  Delivery{' '}
                  {deliveryFee && deliveryFee.isFreeDelivery && (
                    <span className="text-green-600 font-medium">(Free)</span>
                  )}
                </span>
              </div>
              <span className="font-semibold">${deliveryFeeAmount.toFixed(2)}</span>
            </div>
          )}

          {/* Shipping Cost row - Enhanced visibility */}
          {shippingRate && fulfillmentMethod === 'nationwide_shipping' && (
            <div className="bg-gradient-to-r from-destino-yellow/20 to-yellow-100/30 border border-destino-yellow/40 rounded-lg p-3 my-2 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-destino-orange" />
                  <div>
                    <span className="font-medium text-sm text-destino-charcoal">
                      Shipping ({shippingRate.carrier})
                    </span>
                    <div className="text-xs text-destino-charcoal/70">
                      {shippingRate.name}
                      {shippingRate.estimatedDays != null && shippingRate.estimatedDays > 0 && (
                        <span> • {shippingRate.estimatedDays} days</span>
                      )}
                    </div>
                    {/* Box info display */}
                    {shippingRate.selectedBox && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                        <Box className="h-3 w-3" />
                        <span>{shippingRate.selectedBox.displayName}</span>
                        {shippingRate.calculatedWeight && (
                          <span className="text-destino-charcoal/60">
                            ({shippingRate.calculatedWeight.toFixed(1)} lb)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-bold text-destino-charcoal">${shippingCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Alert when shipping is required but not selected */}
          {fulfillmentMethod === 'nationwide_shipping' && !shippingRate && (
            <Alert className="bg-gradient-to-r from-amber-50 to-destino-cream/30 border-amber-300/50">
              <AlertCircle className="h-4 w-4 text-destino-orange" />
              <AlertDescription className="text-destino-charcoal">
                Please select a shipping method to see the total cost.
              </AlertDescription>
            </Alert>
          )}

          {tax > 0 ? (
            <div className="flex justify-between text-sm text-destino-charcoal/80">
              <span>Tax ({(taxRate * 100).toFixed(2)}% on catering items)</span>
              <span className="font-semibold">${tax.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm text-destino-charcoal/80">
              <span>Tax (No tax on selected items)</span>
              <span className="font-semibold">$0.00</span>
            </div>
          )}

          {/* Conditionally display the convenience fee */}
          {includeServiceFee && serviceFee > 0 && (
            <div className="flex justify-between text-sm text-destino-charcoal/70">
              <span>Convenience Fee (3.5%)</span>
              <span className="font-semibold">${serviceFee.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-destino-yellow/40 pt-2 text-lg font-bold text-destino-charcoal">
            <span>Total</span>
            <span className="text-xl">${total.toFixed(2)}</span>
          </div>

          {/* Enhanced messaging for different fulfillment methods */}
          {fulfillmentMethod === 'nationwide_shipping' && shippingRate && (
            <div className="mt-2 text-xs text-destino-charcoal bg-gradient-to-r from-destino-cream/50 to-gray-50 p-2 rounded-lg border border-destino-yellow/20">
              <Truck className="inline h-3 w-3 mr-1 text-destino-orange" />
              Shipping included: {shippingRate.carrier} {shippingRate.name}
              {shippingRate.estimatedDays && ` (${shippingRate.estimatedDays} business days)`}
            </div>
          )}

          {/* Delivery fee message */}
          {deliveryFee && deliveryFee.zone === 'nearby' && !deliveryFee.isFreeDelivery && (
            <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
              Orders over ${deliveryFee.minOrderForFreeDelivery?.toFixed(2)} qualify for free
              delivery!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
