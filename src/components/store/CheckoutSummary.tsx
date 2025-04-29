import Image from 'next/image';
import { CartItem } from '@/store/cart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CheckoutSummaryProps {
  items: CartItem[];
  /** Determines if the 3.5% service fee should be calculated and displayed. */
  includeServiceFee?: boolean; // Optional prop, defaults to false if not provided
}

// Define the service fee rate
const SERVICE_FEE_RATE = 0.035; // 3.5%

export function CheckoutSummary({ items, includeServiceFee = false }: CheckoutSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.0825; // 8.25% tax

  // Calculate the base total before service fee
  const totalBeforeFee = subtotal + tax;

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
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y">
            {items.map(item => (
              <div key={`${item.id}-${item.variantId || ''}`} className="flex py-3">
                <div className="relative mr-3 h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xs text-gray-500">No image</span>
                    </div>
                  )}

                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs text-white">
                    {item.quantity}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>

                <div className="text-right font-medium">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

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
        </div>
      </CardContent>
    </Card>
  );
}
