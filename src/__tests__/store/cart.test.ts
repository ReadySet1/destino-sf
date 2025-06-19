import { describe, it, expect, beforeEach } from '@jest/globals';
import { useCartStore, CartItem } from '@/store/cart';
import { act } from '@testing-library/react';

// Mock zustand persist to avoid localStorage issues in tests
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useCartStore.getState().clearCart();
    });
  });

  describe('Initial State', () => {
    it('should have empty cart initially', () => {
      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.totalPrice).toBe(0);
      expect(state.totalItems).toBe(0);
    });
  });

  describe('addItem', () => {
    it('should add a new item to the cart', () => {
      const testItem: CartItem = {
        id: '1',
        name: 'Test Empanada',
        price: 10.99,
        quantity: 1,
        image: '/test-image.jpg',
      };

      act(() => {
        useCartStore.getState().addItem(testItem);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(testItem);
      expect(state.totalPrice).toBe(10.99);
      expect(state.totalItems).toBe(1);
    });

    it('should merge quantities when adding existing item without variant', () => {
      const testItem: CartItem = {
        id: '1',
        name: 'Test Empanada',
        price: 10.99,
        quantity: 2,
      };

      act(() => {
        useCartStore.getState().addItem(testItem);
        useCartStore.getState().addItem({ ...testItem, quantity: 3 });
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(5);
      expect(state.totalPrice).toBe(54.95); // 10.99 * 5
      expect(state.totalItems).toBe(5);
    });

    it('should merge quantities when adding existing item with same variant', () => {
      const testItem: CartItem = {
        id: '1',
        name: 'Test Empanada',
        price: 10.99,
        quantity: 1,
        variantId: 'variant-1',
      };

      act(() => {
        useCartStore.getState().addItem(testItem);
        useCartStore.getState().addItem({ ...testItem, quantity: 2 });
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(3);
      expect(state.totalPrice).toBe(32.97); // 10.99 * 3
      expect(state.totalItems).toBe(3);
    });

    it('should add separate items for different variants', () => {
      const baseItem: CartItem = {
        id: '1',
        name: 'Test Empanada',
        price: 10.99,
        quantity: 1,
      };

      act(() => {
        useCartStore.getState().addItem({ ...baseItem, variantId: 'variant-1' });
        useCartStore.getState().addItem({ ...baseItem, variantId: 'variant-2' });
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalPrice).toBe(21.98); // 10.99 * 2
      expect(state.totalItems).toBe(2);
    });

    it('should handle adding multiple different items', () => {
      const item1: CartItem = {
        id: '1',
        name: 'Beef Empanada',
        price: 10.99,
        quantity: 2,
      };

      const item2: CartItem = {
        id: '2',
        name: 'Chicken Empanada',
        price: 9.99,
        quantity: 3,
      };

      act(() => {
        useCartStore.getState().addItem(item1);
        useCartStore.getState().addItem(item2);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalPrice).toBe(51.95); // (10.99 * 2) + (9.99 * 3)
      expect(state.totalItems).toBe(5);
    });
  });

  describe('removeItem', () => {
    beforeEach(() => {
      // Add some test items
      act(() => {
        useCartStore.getState().addItem({
          id: '1',
          name: 'Beef Empanada',
          price: 10.99,
          quantity: 2,
        });
        useCartStore.getState().addItem({
          id: '2',
          name: 'Chicken Empanada',
          price: 9.99,
          quantity: 1,
          variantId: 'variant-1',
        });
        useCartStore.getState().addItem({
          id: '2',
          name: 'Chicken Empanada Spicy',
          price: 11.99,
          quantity: 1,
          variantId: 'variant-2',
        });
      });
    });

    it('should remove item without variant', () => {
      act(() => {
        useCartStore.getState().removeItem('1');
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.items.find(item => item.id === '1')).toBeUndefined();
      expect(state.totalPrice).toBe(21.98); // 9.99 + 11.99
      expect(state.totalItems).toBe(2);
    });

    it('should remove item with specific variant', () => {
      act(() => {
        useCartStore.getState().removeItem('2', 'variant-1');
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.items.find(item => item.id === '2' && item.variantId === 'variant-1')).toBeUndefined();
      expect(state.items.find(item => item.id === '2' && item.variantId === 'variant-2')).toBeDefined();
      expect(state.totalPrice).toBe(33.97); // 21.98 + 11.99
      expect(state.totalItems).toBe(3);
    });

    it('should not remove item if variant does not match', () => {
      act(() => {
        useCartStore.getState().removeItem('2', 'non-existent-variant');
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(3); // No change
    });

    it('should not remove item if id does not exist', () => {
      act(() => {
        useCartStore.getState().removeItem('non-existent-id');
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(3); // No change
    });
  });

  describe('updateQuantity', () => {
    beforeEach(() => {
      // Add test items
      act(() => {
        useCartStore.getState().addItem({
          id: '1',
          name: 'Beef Empanada',
          price: 10.99,
          quantity: 2,
        });
        useCartStore.getState().addItem({
          id: '2',
          name: 'Chicken Empanada',
          price: 9.99,
          quantity: 1,
          variantId: 'variant-1',
        });
      });
    });

    it('should update quantity for item without variant', () => {
      act(() => {
        useCartStore.getState().updateQuantity('1', 5);
      });

      const state = useCartStore.getState();
      const item = state.items.find(item => item.id === '1');
      expect(item?.quantity).toBe(5);
      expect(state.totalPrice).toBe(64.94); // (10.99 * 5) + (9.99 * 1)
      expect(state.totalItems).toBe(6);
    });

    it('should update quantity for item with variant', () => {
      act(() => {
        useCartStore.getState().updateQuantity('2', 3, 'variant-1');
      });

      const state = useCartStore.getState();
      const item = state.items.find(item => item.id === '2' && item.variantId === 'variant-1');
      expect(item?.quantity).toBe(3);
      expect(state.totalPrice).toBe(51.95); // (10.99 * 2) + (9.99 * 3)
      expect(state.totalItems).toBe(5);
    });

    it('should prevent negative quantities', () => {
      act(() => {
        useCartStore.getState().updateQuantity('1', -5);
      });

      const state = useCartStore.getState();
      const item = state.items.find(item => item.id === '1');
      expect(item).toBeUndefined(); // Item should be removed when quantity becomes 0
      expect(state.items).toHaveLength(1); // Only the second item remains
    });

    it('should remove item when quantity is set to 0', () => {
      act(() => {
        useCartStore.getState().updateQuantity('1', 0);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items.find(item => item.id === '1')).toBeUndefined();
    });

    it('should not update quantity for non-existent item', () => {
      const initialState = useCartStore.getState();
      
      act(() => {
        useCartStore.getState().updateQuantity('non-existent', 5);
      });

      const state = useCartStore.getState();
      expect(state.items).toEqual(initialState.items);
    });

    it('should not update quantity for wrong variant', () => {
      const initialState = useCartStore.getState();
      
      act(() => {
        useCartStore.getState().updateQuantity('2', 5, 'wrong-variant');
      });

      const state = useCartStore.getState();
      expect(state.items).toEqual(initialState.items);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      // Add some items first
      act(() => {
        useCartStore.getState().addItem({
          id: '1',
          name: 'Test Item 1',
          price: 10.99,
          quantity: 2,
        });
        useCartStore.getState().addItem({
          id: '2',
          name: 'Test Item 2',
          price: 15.99,
          quantity: 1,
        });
      });

      // Verify items were added
      let state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalPrice).toBeGreaterThan(0);
      expect(state.totalItems).toBeGreaterThan(0);

      // Clear the cart
      act(() => {
        useCartStore.getState().clearCart();
      });

      // Verify cart is empty
      state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.totalPrice).toBe(0);
      expect(state.totalItems).toBe(0);
    });

    it('should work when cart is already empty', () => {
      act(() => {
        useCartStore.getState().clearCart();
      });

      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.totalPrice).toBe(0);
      expect(state.totalItems).toBe(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complex cart operations correctly', () => {
      // Add different items with different variants
      act(() => {
        useCartStore.getState().addItem({
          id: '1',
          name: 'Beef Empanada',
          price: 10.99,
          quantity: 2,
        });
        
        useCartStore.getState().addItem({
          id: '2',
          name: 'Chicken Empanada Small',
          price: 8.99,
          quantity: 1,
          variantId: 'small',
        });
        
        useCartStore.getState().addItem({
          id: '2',
          name: 'Chicken Empanada Large',
          price: 12.99,
          quantity: 1,
          variantId: 'large',
        });
      });

      let state = useCartStore.getState();
      expect(state.items).toHaveLength(3);
      expect(state.totalPrice).toBe(43.96); // 21.98 + 8.99 + 12.99
      expect(state.totalItems).toBe(4);

      // Update quantities
      act(() => {
        useCartStore.getState().updateQuantity('1', 3);
        useCartStore.getState().updateQuantity('2', 2, 'small');
      });

      state = useCartStore.getState();
      expect(state.totalPrice).toBeCloseTo(63.93, 1); // (10.99 * 3) + (8.99 * 2) + (12.99 * 1)
      expect(state.totalItems).toBe(6);

      // Remove one variant
      act(() => {
        useCartStore.getState().removeItem('2', 'large');
      });

      state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalPrice).toBeCloseTo(50.94, 1); // (10.99 * 3) + (8.99 * 2)
      expect(state.totalItems).toBe(5);
    });

    it('should maintain correct totals with decimal prices', () => {
      act(() => {
        useCartStore.getState().addItem({
          id: '1',
          name: 'Item 1',
          price: 10.33,
          quantity: 3,
        });
        
        useCartStore.getState().addItem({
          id: '2',
          name: 'Item 2',
          price: 7.77,
          quantity: 2,
        });
      });

      const state = useCartStore.getState();
      expect(state.totalPrice).toBe(46.53); // (10.33 * 3) + (7.77 * 2)
      expect(state.totalItems).toBe(5);
    });
  });
}); 