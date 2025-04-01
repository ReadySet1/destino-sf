import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            const updatedItems = state.items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            );
            return {
              items: updatedItems,
              totalItems: updatedItems.reduce((total, item) => total + item.quantity, 0),
              totalPrice: updatedItems.reduce((total, item) => total + item.price * item.quantity, 0),
            };
          }
          const newItems = [...state.items, item];
          return {
            items: newItems,
            totalItems: newItems.reduce((total, item) => total + item.quantity, 0),
            totalPrice: newItems.reduce((total, item) => total + item.price * item.quantity, 0),
          };
        }),
      removeItem: (id) =>
        set((state) => {
          const updatedItems = state.items.filter((item) => item.id !== id);
          return {
            items: updatedItems,
            totalItems: updatedItems.reduce((total, item) => total + item.quantity, 0),
            totalPrice: updatedItems.reduce((total, item) => total + item.price * item.quantity, 0),
          };
        }),
      updateQuantity: (id, quantity) =>
        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          );
          return {
            items: updatedItems,
            totalItems: updatedItems.reduce((total, item) => total + item.quantity, 0),
            totalPrice: updatedItems.reduce((total, item) => total + item.price * item.quantity, 0),
          };
        }),
      clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0 }),
      totalPrice: 0,
      totalItems: 0
    }),
    {
      name: 'cart-storage',
    }
  )
);
