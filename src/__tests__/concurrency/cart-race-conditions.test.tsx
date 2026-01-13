/**
 * DES-60 Phase 4: Cart Race Conditions Tests
 *
 * Tests concurrent cart operations to ensure state consistency
 * when multiple operations happen simultaneously.
 *
 * Scenarios tested:
 * 1. Concurrent cart additions (10 simultaneous addItem() calls)
 * 2. Race between add and remove
 * 3. Multi-tab cart sync scenario
 * 4. Rapid quantity updates (100 clicks in 1 second)
 *
 * NOTE: These tests use Zustand's getState()/setState() directly instead of
 * renderHook because the persist middleware hydrates asynchronously, which
 * causes result.current to be null in tests.
 */

import { useCartStore, CartItem } from '@/store/useCartStore';

// Get store methods directly
const getState = () => useCartStore.getState();

describe('Cart Race Conditions', () => {
  // Reset cart before each test using getState() directly
  beforeEach(() => {
    getState().clearCart();
  });

  describe('Concurrent Cart Additions', () => {
    it('should handle 10 simultaneous addItem() calls without data loss', async () => {
      const testItem: CartItem = {
        id: 'product-1',
        name: 'Alfajor',
        price: 4.5,
        quantity: 1,
      };

      // Create 10 promises that all add the same item concurrently
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve().then(() => {
          getState().addItem({ ...testItem, quantity: 1 });
        })
      );

      // Execute all additions concurrently
      await Promise.all(promises);

      // Verify final state: should have 10 total quantity
      const state = getState();
      expect(state.items.length).toBe(1);
      expect(state.items[0].quantity).toBe(10);
      expect(state.totalItems).toBe(10);
      expect(state.totalPrice).toBe(45); // 10 * 4.5
    });

    it('should handle concurrent additions of different products', async () => {
      const products: CartItem[] = [
        { id: 'prod-1', name: 'Alfajor', price: 4.5, quantity: 1 },
        { id: 'prod-2', name: 'Empanada', price: 5.0, quantity: 1 },
        { id: 'prod-3', name: 'Dulce de Leche', price: 8.0, quantity: 1 },
        { id: 'prod-4', name: 'Mate', price: 12.0, quantity: 1 },
        { id: 'prod-5', name: 'Chimichurri', price: 6.0, quantity: 1 },
      ];

      // Add all products concurrently
      const promises = products.map(product =>
        Promise.resolve().then(() => {
          getState().addItem(product);
        })
      );

      await Promise.all(promises);

      // Verify all products were added
      const state = getState();
      expect(state.items.length).toBe(5);
      expect(state.totalItems).toBe(5);
      expect(state.totalPrice).toBe(35.5);
    });

    it('should handle concurrent additions with variants', async () => {
      const variants: CartItem[] = [
        { id: 'emp-1', variantId: 'beef', name: 'Beef Empanada', price: 5.0, quantity: 1 },
        { id: 'emp-1', variantId: 'chicken', name: 'Chicken Empanada', price: 5.0, quantity: 1 },
        { id: 'emp-1', variantId: 'cheese', name: 'Cheese Empanada', price: 4.5, quantity: 1 },
      ];

      // Add all variants concurrently
      const promises = variants.map(variant =>
        Promise.resolve().then(() => {
          getState().addItem(variant);
        })
      );

      await Promise.all(promises);

      // Should have 3 separate items (different variants)
      const state = getState();
      expect(state.items.length).toBe(3);
      expect(state.totalItems).toBe(3);
      expect(state.totalPrice).toBe(14.5);
    });
  });

  describe('Race Between Add and Remove', () => {
    it('should handle concurrent add and remove of same item', async () => {
      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 10.0,
        quantity: 5,
      };

      // First add the item
      getState().addItem(item);

      expect(getState().items.length).toBe(1);
      expect(getState().items[0].quantity).toBe(5);

      // Now concurrently add more and remove
      const operations = [
        // Add operations
        Promise.resolve().then(() => getState().addItem({ ...item, quantity: 2 })),
        Promise.resolve().then(() => getState().addItem({ ...item, quantity: 3 })),
        // Remove operation
        Promise.resolve().then(() => getState().removeItem('product-1')),
      ];

      await Promise.all(operations);

      // Depending on timing, item may be removed or have increased quantity
      // The final state should be consistent (not corrupted)
      const finalState = getState();

      if (finalState.items.length === 0) {
        // Item was removed
        expect(finalState.totalItems).toBe(0);
        expect(finalState.totalPrice).toBe(0);
      } else {
        // Item still exists with updated quantity
        expect(finalState.items.length).toBe(1);
        expect(finalState.totalItems).toBeGreaterThan(0);
        expect(finalState.totalPrice).toBeGreaterThan(0);
        // Verify calculated totals match
        const expectedTotal = finalState.items[0].quantity * finalState.items[0].price;
        expect(finalState.totalPrice).toBe(expectedTotal);
      }
    });

    it('should handle rapid add-remove-add sequence', async () => {
      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 1,
      };

      // Perform rapid sequence
      for (let i = 0; i < 10; i++) {
        getState().addItem({ ...item, quantity: 1 });
        if (Math.random() > 0.5) {
          getState().removeItem('product-1');
        }
      }

      // Final state should be consistent
      const finalState = getState();
      const calculatedTotal = finalState.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      expect(finalState.totalPrice).toBe(calculatedTotal);
    });
  });

  describe('Multi-Tab Cart Sync Scenario', () => {
    it('should maintain consistency with store state', () => {
      // Both "tabs" access the same store singleton
      const tab1State = () => useCartStore.getState();
      const tab2State = () => useCartStore.getState();

      const item: CartItem = {
        id: 'product-1',
        name: 'Shared Product',
        price: 10.0,
        quantity: 1,
      };

      // Tab 1 adds item
      tab1State().addItem(item);

      // Tab 2 should see the same state (same store singleton)
      expect(tab1State().items.length).toBe(1);
      expect(tab2State().items.length).toBe(1);
      expect(tab1State().totalItems).toBe(1);
      expect(tab2State().totalItems).toBe(1);
    });

    it('should handle concurrent operations from multiple sources', async () => {
      const tab1State = () => useCartStore.getState();
      const tab2State = () => useCartStore.getState();

      const item1: CartItem = {
        id: 'product-1',
        name: 'Product 1',
        price: 5.0,
        quantity: 1,
      };

      const item2: CartItem = {
        id: 'product-2',
        name: 'Product 2',
        price: 7.0,
        quantity: 1,
      };

      // Concurrent operations from both tabs
      await Promise.all([
        Promise.resolve().then(() => tab1State().addItem(item1)),
        Promise.resolve().then(() => tab2State().addItem(item2)),
      ]);

      // Both tabs should have consistent state
      expect(tab1State().items.length).toBeGreaterThan(0);
      expect(tab2State().items.length).toBeGreaterThan(0);
    });
  });

  describe('Rapid Quantity Updates', () => {
    it('should handle 100 rapid quantity increment operations', () => {
      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 1,
      };

      // First add the item
      getState().addItem(item);

      // Perform 100 rapid increments (simulating rapid clicking)
      for (let i = 0; i < 100; i++) {
        const currentQuantity = getState().items[0]?.quantity || 0;
        getState().updateQuantity('product-1', currentQuantity + 1);
      }

      // Verify final state
      const state = getState();
      expect(state.items.length).toBe(1);
      expect(state.items[0].quantity).toBe(101); // Initial 1 + 100 increments
      expect(state.totalItems).toBe(101);
      expect(state.totalPrice).toBe(505); // 101 * 5
    });

    it('should handle concurrent quantity updates from multiple sources', async () => {
      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 10.0,
        quantity: 5,
      };

      // Add initial item
      getState().addItem(item);

      // Create 20 concurrent update operations
      const updates = Array.from({ length: 20 }, (_, i) =>
        Promise.resolve().then(() => {
          getState().updateQuantity('product-1', 5 + i + 1);
        })
      );

      await Promise.all(updates);

      // Final state should be consistent
      const state = getState();
      expect(state.items.length).toBe(1);
      const finalQuantity = state.items[0].quantity;
      expect(finalQuantity).toBeGreaterThan(0);
      expect(state.totalPrice).toBe(finalQuantity * 10);
    });

    it('should handle rapid alternating increment and decrement', () => {
      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 50,
      };

      // Add initial item
      getState().addItem(item);

      // Rapidly alternate between increment and decrement
      for (let i = 0; i < 50; i++) {
        const currentQuantity = getState().items[0]?.quantity || 0;

        if (i % 2 === 0) {
          // Increment
          getState().updateQuantity('product-1', currentQuantity + 1);
        } else {
          // Decrement
          getState().updateQuantity('product-1', currentQuantity - 1);
        }
      }

      // Final state should be consistent
      const state = getState();
      expect(state.items.length).toBe(1);
      const finalQuantity = state.items[0].quantity;
      expect(state.totalPrice).toBe(finalQuantity * 5);
      expect(state.totalItems).toBe(finalQuantity);
    });

    it('should handle quantity update to zero (auto-removal)', () => {
      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 10,
      };

      // Add item
      getState().addItem(item);

      expect(getState().items.length).toBe(1);

      // Update quantity to 0
      getState().updateQuantity('product-1', 0);

      // Item should be removed from cart
      const state = getState();
      expect(state.items.length).toBe(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
    });

    it('should handle negative quantity updates gracefully', () => {
      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 5,
      };

      // Add item
      getState().addItem(item);

      // Try to set negative quantity
      getState().updateQuantity('product-1', -5);

      // Should clamp to 0 and remove item
      const state = getState();
      expect(state.items.length).toBe(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    it('should handle clearing cart during concurrent operations', async () => {
      const items: CartItem[] = [
        { id: 'prod-1', name: 'Item 1', price: 5.0, quantity: 1 },
        { id: 'prod-2', name: 'Item 2', price: 7.0, quantity: 1 },
        { id: 'prod-3', name: 'Item 3', price: 3.0, quantity: 1 },
      ];

      // Start adding items and clear cart concurrently
      const operations = [
        ...items.map(item => Promise.resolve().then(() => getState().addItem(item))),
        new Promise<void>(resolve => {
          // Small delay to let some adds happen
          setTimeout(() => {
            getState().clearCart();
            resolve();
          }, 10);
        }),
      ];

      await Promise.all(operations);

      // After clear, state should be empty (or have items added after clear)
      const finalState = getState();
      expect(finalState.totalPrice).toBe(
        finalState.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      );
    });

    it('should maintain cart integrity under heavy load', async () => {
      // Create 50 different products
      const products: CartItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        price: Math.random() * 20 + 5, // Random price between 5 and 25
        quantity: 1,
      }));

      // Add all products concurrently
      await Promise.all(
        products.map(product => Promise.resolve().then(() => getState().addItem(product)))
      );

      // Verify all products were added
      const state = getState();
      expect(state.items.length).toBe(50);

      // Calculate expected totals
      const expectedTotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      expect(state.totalPrice).toBeCloseTo(expectedTotal, 2);
      expect(state.totalItems).toBe(50);
    });

    it('should handle concurrent operations with mixed item types', async () => {
      const operations = [
        // Add regular items
        Promise.resolve().then(() =>
          getState().addItem({
            id: 'prod-1',
            name: 'Regular Item',
            price: 10,
            quantity: 1,
          })
        ),
        // Add variant items
        Promise.resolve().then(() =>
          getState().addItem({
            id: 'prod-2',
            variantId: 'var-1',
            name: 'Variant Item 1',
            price: 15,
            quantity: 1,
          })
        ),
        Promise.resolve().then(() =>
          getState().addItem({
            id: 'prod-2',
            variantId: 'var-2',
            name: 'Variant Item 2',
            price: 15,
            quantity: 1,
          })
        ),
        // Update quantities
        Promise.resolve().then(() => getState().updateQuantity('prod-1', 3)),
        // Remove items
        Promise.resolve().then(() => getState().removeItem('prod-2', 'var-1')),
      ];

      await Promise.all(operations);

      // Final state should be consistent
      const finalState = getState();
      const calculatedTotal = finalState.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      expect(finalState.totalPrice).toBeCloseTo(calculatedTotal, 2);
    });
  });

  describe('State Consistency Validation', () => {
    it('should always maintain totalPrice = sum of (item.price * item.quantity)', () => {
      // Perform random operations
      getState().addItem({
        id: 'p1',
        name: 'Product 1',
        price: 10,
        quantity: 5,
      });

      // Verify consistency after each operation
      let calculatedTotal = getState().items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      expect(getState().totalPrice).toBeCloseTo(calculatedTotal, 2);

      getState().addItem({
        id: 'p2',
        name: 'Product 2',
        price: 15,
        quantity: 3,
      });

      calculatedTotal = getState().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(getState().totalPrice).toBeCloseTo(calculatedTotal, 2);

      getState().updateQuantity('p1', 10);

      calculatedTotal = getState().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(getState().totalPrice).toBeCloseTo(calculatedTotal, 2);

      getState().removeItem('p2');

      calculatedTotal = getState().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(getState().totalPrice).toBeCloseTo(calculatedTotal, 2);
    });

    it('should always maintain totalItems = sum of item.quantity', () => {
      getState().addItem({ id: 'p1', name: 'P1', price: 5, quantity: 3 });

      let calculatedItems = getState().items.reduce((sum, item) => sum + item.quantity, 0);
      expect(getState().totalItems).toBe(calculatedItems);

      getState().addItem({ id: 'p2', name: 'P2', price: 7, quantity: 2 });

      calculatedItems = getState().items.reduce((sum, item) => sum + item.quantity, 0);
      expect(getState().totalItems).toBe(calculatedItems);

      getState().updateQuantity('p1', 5);

      calculatedItems = getState().items.reduce((sum, item) => sum + item.quantity, 0);
      expect(getState().totalItems).toBe(calculatedItems);
    });
  });
});
