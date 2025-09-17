/**
 * Catering cart store for state management
 * Placeholder implementation for test compatibility
 */

export interface CateringCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type?: string;
  variantId?: string;
  category?: string;
  customizations?: any;
}

export interface CateringCartStore {
  items: CateringCartItem[];
  totalPrice: number;
  totalItems: number;
  addItem: (item: CateringCartItem) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
}

// Mock store for testing
export const useCateringCartStore = (): CateringCartStore => ({
  items: [] as CateringCartItem[],
  totalPrice: 0,
  totalItems: 0,
  addItem: (item: CateringCartItem) => {},
  removeItem: (id: string, variantId?: string) => {},
  updateQuantity: (id: string, quantity: number, variantId?: string) => {},
  clearCart: () => {},
});