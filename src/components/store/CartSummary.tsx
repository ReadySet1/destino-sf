import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CartSummaryProps {
  subtotal: number;
  totalItems: number;
}

export function CartSummary({ subtotal, totalItems }: CartSummaryProps) {
  const tax = subtotal * 0.0825; // 8.25% tax
  const total = subtotal + tax;

  return (
    <Card className="border-0 lg:border shadow-none lg:shadow-sm">
      <CardHeader className="px-0 lg:px-6 py-2 lg:py-4">
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 lg:space-y-2 px-0 lg:px-6 py-1 lg:py-2">
        <div className="flex justify-between text-sm lg:text-base">
          <span>Subtotal ({totalItems} items)</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm lg:text-base">
          <span>Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base lg:text-lg font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
