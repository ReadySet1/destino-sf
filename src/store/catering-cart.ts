/**
 * Catering cart store for state management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const calculateTotals = (items: CateringCartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return { totalItems, totalPrice };
};

export const useCateringCartStore = create<CateringCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      totalPrice: 0,
      totalItems: 0,

      addItem: (newItem: CateringCartItem) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.id === newItem.id && item.variantId === newItem.variantId
          );

          let updatedItems;
          if (existingItem) {
            // Update quantity of existing item
            updatedItems = state.items.map((item) =>
              item.id === newItem.id && item.variantId === newItem.variantId
                ? { ...item, quantity: item.quantity + newItem.quantity }
                : item
            );
          } else {
            // Add new item
            updatedItems = [...state.items, newItem];
          }

          const { totalItems, totalPrice } = calculateTotals(updatedItems);
          return {
            items: updatedItems,
            totalItems,
            totalPrice,
          };
        });
      },

      removeItem: (id: string, variantId?: string) => {
        set((state) => {
          const updatedItems = state.items.filter(
            (item) => !(item.id === id && item.variantId === variantId)
          );
          const { totalItems, totalPrice } = calculateTotals(updatedItems);
          return {
            items: updatedItems,
            totalItems,
            totalPrice,
          };
        });
      },

      updateQuantity: (id: string, quantity: number, variantId?: string) => {
        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.id === id && item.variantId === variantId
              ? { ...item, quantity: Math.max(0, quantity) }
              : item
          ).filter((item) => item.quantity > 0);

          const { totalItems, totalPrice } = calculateTotals(updatedItems);
          return {
            items: updatedItems,
            totalItems,
            totalPrice,
          };
        });
      },

      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0 });
      },
    }),
    {
      name: 'destino-catering-cart-storage',
      version: 1,
    }
  )
);