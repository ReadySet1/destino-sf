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
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const { items } = get();
        const existingItemIndex = items.findIndex(
          (i) => i.id === item.id && i.variantId === item.variantId
        );
        
        if (existingItemIndex !== -1) {
          // Item exists, update quantity
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += 1;
          
          set({ items: updatedItems });
        } else {
          // New item
          set({ items: [...items, { ...item, quantity: 1 }] });
        }
      },
      
      removeItem: (id, variantId) => {
        const { items } = get();
        const updatedItems = items.filter(
          (item) => !(item.id === id && item.variantId === variantId)
        );
        
        set({ items: updatedItems });
      },
      
      updateQuantity: (id, quantity, variantId) => {
        const { items } = get();
        const updatedItems = items.map((item) => {
          if (item.id === id && item.variantId === variantId) {
            return { ...item, quantity };
          }
          return item;
        });
        
        set({ items: updatedItems });
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      get totalItems() {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      get totalPrice() {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity, 
          0
        );
      },
    }),
    {
      name: 'destino-cart',
    }
  )
);
