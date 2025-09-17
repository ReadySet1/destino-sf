/**
 * Cart utilities and helpers
 * Placeholder implementation for test compatibility
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}