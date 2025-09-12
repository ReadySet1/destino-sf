import { formatCurrency } from '@/utils/formatting';

export interface CartSummaryProps {
  subtotal: number;
  totalItems: number;
  cartType?: 'regular' | 'catering';
}

export function CartSummary({ subtotal, totalItems, cartType = 'regular' }: CartSummaryProps) {
  // Apply tax only to catering items - empanadas, alfajores, sauces are NON-taxable
  const taxRate = 0.0825; // 8.25%
  const tax = cartType === 'catering' ? subtotal * taxRate : 0;
  const total = subtotal + tax;

  return (
    <div
      className={`rounded-xl border p-4 sm:p-6 bg-gradient-to-br from-white to-gray-50/30 shadow-sm lg:shadow-lg ${
        cartType === 'catering' 
          ? 'border-destino-orange/30 lg:border-destino-orange/40 shadow-destino-orange/10' 
          : 'border-destino-yellow/30 lg:border-destino-yellow/40 shadow-destino-yellow/10'
      }`}
      data-testid="cart-summary"
    >
      <h2
        className={`text-lg sm:text-xl font-bold mb-4 ${
          cartType === 'catering' ? 'text-destino-orange' : 'text-destino-charcoal'
        }`}
      >
        {cartType === 'catering' ? 'Catering' : 'Order'} Summary
      </h2>
      <div className="space-y-3">
        <div className="flex justify-between text-destino-charcoal/80" data-testid="order-subtotal">
          <span className="text-sm sm:text-base">Subtotal ({totalItems} items)</span>
          <span className="font-semibold text-sm sm:text-base">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-destino-charcoal/80" data-testid="order-tax">
          <span className="text-sm sm:text-base">
            {cartType === 'catering' ? `Tax (${(taxRate * 100).toFixed(2)}%)` : 'Tax (No tax on regular items)'}
          </span>
          <span className="font-semibold text-sm sm:text-base">{formatCurrency(tax)}</span>
        </div>
        <div
          className={`border-t-2 mt-3 pt-3 font-bold flex justify-between ${
            cartType === 'catering'
              ? 'border-destino-orange/40 text-destino-orange'
              : 'border-destino-yellow/40 text-destino-charcoal'
          }`}
          data-testid="order-total"
        >
          <span className="text-base sm:text-lg">Total</span>
          <span className="text-lg sm:text-xl">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
