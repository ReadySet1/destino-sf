import { formatCurrency } from '@/utils/formatting';

export interface CartSummaryProps {
  subtotal: number;
  totalItems: number;
  cartType?: 'regular' | 'catering';
}

export function CartSummary({ subtotal, totalItems, cartType = 'regular' }: CartSummaryProps) {
  // Consider different tax rates or service fees based on cart type
  const taxRate = 0.0825; // 8.25%
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div
      className={`rounded-lg border p-4 bg-white shadow-sm ${cartType === 'catering' ? 'border-amber-200' : ''}`}
      data-testid="cart-summary"
    >
      <h2
        className={`text-lg font-semibold mb-4 ${cartType === 'catering' ? 'text-amber-700' : ''}`}
      >
        {cartType === 'catering' ? 'Catering' : 'Order'} Summary
      </h2>
      <div className="space-y-1">
        <div className="flex justify-between" data-testid="order-subtotal">
          <span>Subtotal ({totalItems} items)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between" data-testid="order-tax">
          <span>Tax</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div
          className="border-t mt-2 pt-2 font-bold flex justify-between"
          data-testid="order-total"
        >
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
