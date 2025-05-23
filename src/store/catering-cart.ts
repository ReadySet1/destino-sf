import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CateringCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
}

interface CateringCartStore {
  items: CateringCartItem[];
  addItem: (item: CateringCartItem) => void;
  removeItem: (itemId: string, variantId?: string) => void;
  updateQuantity: (itemId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

export const useCateringCartStore = create<CateringCartStore>()(
  persist(
    set => ({
      items: [],
      addItem: item =>
        set(state => {
          const existingItem = state.items.find(
            i => i.id === item.id && i.variantId === item.variantId
          );

          let updatedItems;
          if (existingItem) {
            updatedItems = state.items.map(i =>
              i.id === item.id && i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            );
          } else {
            updatedItems = [...state.items, item];
          }
          
          const totalItems = updatedItems.reduce((total, item) => total + item.quantity, 0);
          const totalPrice = updatedItems.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          );

          return {
            items: updatedItems,
            totalItems,
            totalPrice,
          };
        }),
      removeItem: (itemId, variantId) =>
        set(state => {
          const updatedItems = state.items.filter(
            item => !(item.id === itemId && item.variantId === variantId)
          );
          const totalItems = updatedItems.reduce((total, item) => total + item.quantity, 0);
          const totalPrice = updatedItems.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          );
          return {
            items: updatedItems,
            totalItems,
            totalPrice,
          };
        }),
      updateQuantity: (itemId, quantity, variantId) =>
        set(state => {
          const updatedItems = state.items.map(item =>
            item.id === itemId && item.variantId === variantId
              ? { ...item, quantity: Math.max(0, quantity) }
              : item
          ).filter(item => item.quantity > 0);
          
          const totalItems = updatedItems.reduce((total, item) => total + item.quantity, 0);
          const totalPrice = updatedItems.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          );
          return {
            items: updatedItems,
            totalItems,
            totalPrice,
          };
        }),
      clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0 }),
      totalPrice: 0,
      totalItems: 0,
    }),
    {
      name: 'catering-cart-storage',
    }
  )
); 