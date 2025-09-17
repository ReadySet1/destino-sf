/**
 * Cart store for state management
 * Placeholder implementation for test compatibility
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
}

export interface CartStore {
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
}

// Mock store for testing
export const useCartStore = (): CartStore => ({
  items: [] as CartItem[],
  totalPrice: 0,
  totalItems: 0,
  addItem: (item: CartItem) => {},
  removeItem: (id: string, variantId?: string) => {},
  updateQuantity: (id: string, quantity: number, variantId?: string) => {},
  clearCart: () => {},
});
