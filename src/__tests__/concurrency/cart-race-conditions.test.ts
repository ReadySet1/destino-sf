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
 */

import { renderHook, act } from '@testing-library/react';
import { useCartStore, CartItem } from '@/store/useCartStore';

describe('Cart Race Conditions', () => {
  // Reset cart before each test
  beforeEach(() => {
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.clearCart();
    });
  });

  describe('Concurrent Cart Additions', () => {
    it('should handle 10 simultaneous addItem() calls without data loss', async () => {
      const { result } = renderHook(() => useCartStore());

      const testItem: CartItem = {
        id: 'product-1',
        name: 'Alfajor',
        price: 4.5,
        quantity: 1,
      };

      // Create 10 promises that all add the same item concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        act(async () => {
          result.current.addItem({ ...testItem, quantity: 1 });
        })
      );

      // Execute all additions concurrently
      await Promise.all(promises);

      // Verify final state: should have 10 total quantity
      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.totalItems).toBe(10);
      expect(result.current.totalPrice).toBe(45); // 10 * 4.5
    });

    it('should handle concurrent additions of different products', async () => {
      const { result } = renderHook(() => useCartStore());

      const products: CartItem[] = [
        { id: 'prod-1', name: 'Alfajor', price: 4.5, quantity: 1 },
        { id: 'prod-2', name: 'Empanada', price: 5.0, quantity: 1 },
        { id: 'prod-3', name: 'Dulce de Leche', price: 8.0, quantity: 1 },
        { id: 'prod-4', name: 'Mate', price: 12.0, quantity: 1 },
        { id: 'prod-5', name: 'Chimichurri', price: 6.0, quantity: 1 },
      ];

      // Add all products concurrently
      const promises = products.map(product =>
        act(async () => {
          result.current.addItem(product);
        })
      );

      await Promise.all(promises);

      // Verify all products were added
      expect(result.current.items.length).toBe(5);
      expect(result.current.totalItems).toBe(5);
      expect(result.current.totalPrice).toBe(35.5);
    });

    it('should handle concurrent additions with variants', async () => {
      const { result } = renderHook(() => useCartStore());

      const variants: CartItem[] = [
        { id: 'emp-1', variantId: 'beef', name: 'Beef Empanada', price: 5.0, quantity: 1 },
        { id: 'emp-1', variantId: 'chicken', name: 'Chicken Empanada', price: 5.0, quantity: 1 },
        { id: 'emp-1', variantId: 'cheese', name: 'Cheese Empanada', price: 4.5, quantity: 1 },
      ];

      // Add all variants concurrently
      const promises = variants.map(variant =>
        act(async () => {
          result.current.addItem(variant);
        })
      );

      await Promise.all(promises);

      // Should have 3 separate items (different variants)
      expect(result.current.items.length).toBe(3);
      expect(result.current.totalItems).toBe(3);
      expect(result.current.totalPrice).toBe(14.5);
    });
  });

  describe('Race Between Add and Remove', () => {
    it('should handle concurrent add and remove of same item', async () => {
      const { result } = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 10.0,
        quantity: 5,
      };

      // First add the item
      await act(async () => {
        result.current.addItem(item);
      });

      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].quantity).toBe(5);

      // Now concurrently add more and remove
      const operations = [
        // Add operations
        act(async () => result.current.addItem({ ...item, quantity: 2 })),
        act(async () => result.current.addItem({ ...item, quantity: 3 })),
        // Remove operation
        act(async () => result.current.removeItem('product-1')),
      ];

      await Promise.all(operations);

      // Depending on timing, item may be removed or have increased quantity
      // The final state should be consistent (not corrupted)
      const finalState = result.current;

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
      const { result } = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 1,
      };

      // Perform rapid sequence
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          result.current.addItem({ ...item, quantity: 1 });
        });
        await act(async () => {
          if (Math.random() > 0.5) {
            result.current.removeItem('product-1');
          }
        });
      }

      // Final state should be consistent
      const finalState = result.current;
      const calculatedTotal = finalState.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      expect(finalState.totalPrice).toBe(calculatedTotal);
    });
  });

  describe('Multi-Tab Cart Sync Scenario', () => {
    it('should maintain consistency across multiple store instances', async () => {
      // Simulate two tabs accessing the same persisted cart
      const tab1 = renderHook(() => useCartStore());
      const tab2 = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Shared Product',
        price: 10.0,
        quantity: 1,
      };

      // Tab 1 adds item
      await act(async () => {
        tab1.result.current.addItem(item);
      });

      // Tab 2 should eventually see the same state (due to persistence)
      // In real scenario, this would be synced via localStorage events
      expect(tab1.result.current.items.length).toBe(1);
      expect(tab1.result.current.totalItems).toBe(1);
    });

    it('should handle concurrent operations from multiple tabs', async () => {
      const tab1 = renderHook(() => useCartStore());
      const tab2 = renderHook(() => useCartStore());

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
        act(async () => tab1.result.current.addItem(item1)),
        act(async () => tab2.result.current.addItem(item2)),
      ]);

      // Both tabs should have consistent state
      expect(tab1.result.current.items.length).toBeGreaterThan(0);
      expect(tab2.result.current.items.length).toBeGreaterThan(0);
    });
  });

  describe('Rapid Quantity Updates', () => {
    it('should handle 100 rapid quantity increment operations', async () => {
      const { result } = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 1,
      };

      // First add the item
      await act(async () => {
        result.current.addItem(item);
      });

      // Perform 100 rapid increments (simulating rapid clicking)
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          const currentQuantity = result.current.items[0]?.quantity || 0;
          result.current.updateQuantity('product-1', currentQuantity + 1);
        });
      }

      // Verify final state
      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].quantity).toBe(101); // Initial 1 + 100 increments
      expect(result.current.totalItems).toBe(101);
      expect(result.current.totalPrice).toBe(505); // 101 * 5
    });

    it('should handle concurrent quantity updates from multiple sources', async () => {
      const { result } = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 10.0,
        quantity: 5,
      };

      // Add initial item
      await act(async () => {
        result.current.addItem(item);
      });

      // Create 20 concurrent update operations
      const updates = Array.from({ length: 20 }, (_, i) =>
        act(async () => {
          result.current.updateQuantity('product-1', 5 + i + 1);
        })
      );

      await Promise.all(updates);

      // Final state should be consistent
      expect(result.current.items.length).toBe(1);
      const finalQuantity = result.current.items[0].quantity;
      expect(finalQuantity).toBeGreaterThan(0);
      expect(result.current.totalPrice).toBe(finalQuantity * 10);
    });

    it('should handle rapid alternating increment and decrement', async () => {
      const { result } = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 50,
      };

      // Add initial item
      await act(async () => {
        result.current.addItem(item);
      });

      // Rapidly alternate between increment and decrement
      for (let i = 0; i < 50; i++) {
        const currentQuantity = result.current.items[0]?.quantity || 0;

        if (i % 2 === 0) {
          // Increment
          await act(async () => {
            result.current.updateQuantity('product-1', currentQuantity + 1);
          });
        } else {
          // Decrement
          await act(async () => {
            result.current.updateQuantity('product-1', currentQuantity - 1);
          });
        }
      }

      // Final state should be consistent
      expect(result.current.items.length).toBe(1);
      const finalQuantity = result.current.items[0].quantity;
      expect(result.current.totalPrice).toBe(finalQuantity * 5);
      expect(result.current.totalItems).toBe(finalQuantity);
    });

    it('should handle quantity update to zero (auto-removal)', async () => {
      const { result } = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 10,
      };

      // Add item
      await act(async () => {
        result.current.addItem(item);
      });

      expect(result.current.items.length).toBe(1);

      // Update quantity to 0
      await act(async () => {
        result.current.updateQuantity('product-1', 0);
      });

      // Item should be removed from cart
      expect(result.current.items.length).toBe(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });

    it('should handle negative quantity updates gracefully', async () => {
      const { result } = renderHook(() => useCartStore());

      const item: CartItem = {
        id: 'product-1',
        name: 'Test Product',
        price: 5.0,
        quantity: 5,
      };

      // Add item
      await act(async () => {
        result.current.addItem(item);
      });

      // Try to set negative quantity
      await act(async () => {
        result.current.updateQuantity('product-1', -5);
      });

      // Should clamp to 0 and remove item
      expect(result.current.items.length).toBe(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    it('should handle clearing cart during concurrent operations', async () => {
      const { result } = renderHook(() => useCartStore());

      const items: CartItem[] = [
        { id: 'prod-1', name: 'Item 1', price: 5.0, quantity: 1 },
        { id: 'prod-2', name: 'Item 2', price: 7.0, quantity: 1 },
        { id: 'prod-3', name: 'Item 3', price: 3.0, quantity: 1 },
      ];

      // Start adding items and clear cart concurrently
      const operations = [
        ...items.map(item =>
          act(async () => result.current.addItem(item))
        ),
        act(async () => {
          // Small delay to let some adds happen
          await new Promise(resolve => setTimeout(resolve, 10));
          result.current.clearCart();
        }),
      ];

      await Promise.all(operations);

      // After clear, state should be empty (or have items added after clear)
      const finalState = result.current;
      expect(finalState.totalPrice).toBe(
        finalState.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      );
    });

    it('should maintain cart integrity under heavy load', async () => {
      const { result } = renderHook(() => useCartStore());

      // Create 50 different products
      const products: CartItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        price: Math.random() * 20 + 5, // Random price between 5 and 25
        quantity: 1,
      }));

      // Add all products concurrently
      await Promise.all(
        products.map(product =>
          act(async () => result.current.addItem(product))
        )
      );

      // Verify all products were added
      expect(result.current.items.length).toBe(50);

      // Calculate expected totals
      const expectedTotal = result.current.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      expect(result.current.totalPrice).toBeCloseTo(expectedTotal, 2);
      expect(result.current.totalItems).toBe(50);
    });

    it('should handle concurrent operations with mixed item types', async () => {
      const { result } = renderHook(() => useCartStore());

      const operations = [
        // Add regular items
        act(async () =>
          result.current.addItem({
            id: 'prod-1',
            name: 'Regular Item',
            price: 10,
            quantity: 1,
          })
        ),
        // Add variant items
        act(async () =>
          result.current.addItem({
            id: 'prod-2',
            variantId: 'var-1',
            name: 'Variant Item 1',
            price: 15,
            quantity: 1,
          })
        ),
        act(async () =>
          result.current.addItem({
            id: 'prod-2',
            variantId: 'var-2',
            name: 'Variant Item 2',
            price: 15,
            quantity: 1,
          })
        ),
        // Update quantities
        act(async () => result.current.updateQuantity('prod-1', 3)),
        // Remove items
        act(async () => result.current.removeItem('prod-2', 'var-1')),
      ];

      await Promise.all(operations);

      // Final state should be consistent
      const finalState = result.current;
      const calculatedTotal = finalState.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      expect(finalState.totalPrice).toBeCloseTo(calculatedTotal, 2);
    });
  });

  describe('State Consistency Validation', () => {
    it('should always maintain totalPrice = sum of (item.price * item.quantity)', async () => {
      const { result } = renderHook(() => useCartStore());

      // Perform random operations
      const operations = [
        act(async () =>
          result.current.addItem({
            id: 'p1',
            name: 'Product 1',
            price: 10,
            quantity: 5,
          })
        ),
        act(async () =>
          result.current.addItem({
            id: 'p2',
            name: 'Product 2',
            price: 15,
            quantity: 3,
          })
        ),
        act(async () => result.current.updateQuantity('p1', 10)),
        act(async () => result.current.removeItem('p2')),
      ];

      for (const op of operations) {
        await op;

        // Verify consistency after each operation
        const calculatedTotal = result.current.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        expect(result.current.totalPrice).toBeCloseTo(calculatedTotal, 2);
      }
    });

    it('should always maintain totalItems = sum of item.quantity', async () => {
      const { result } = renderHook(() => useCartStore());

      const operations = [
        act(async () =>
          result.current.addItem({ id: 'p1', name: 'P1', price: 5, quantity: 3 })
        ),
        act(async () =>
          result.current.addItem({ id: 'p2', name: 'P2', price: 7, quantity: 2 })
        ),
        act(async () => result.current.updateQuantity('p1', 5)),
      ];

      for (const op of operations) {
        await op;

        // Verify consistency
        const calculatedItems = result.current.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        expect(result.current.totalItems).toBe(calculatedItems);
      }
    });
  });
});
