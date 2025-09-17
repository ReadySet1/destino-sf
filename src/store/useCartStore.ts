/**
 * Cart store for state management
 * Placeholder implementation for test compatibility
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

// Mock store for testing
export const useCartStore = () => ({
  items: [] as CartItem[],
  total: 0,
  addItem: (item: CartItem) => {},
  removeItem: (id: string) => {},
  clearCart: () => {},
});
