/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { useCateringCartStore } from '@/store/catering-cart';
import { act, renderHook } from '@testing-library/react';

// Mock localStorage for persistence testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Catering Cart Management', () => {
  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorageMock.clear();
    jest.clearAllMocks();
    
    // Reset the store state
    const { result } = renderHook(() => useCateringCartStore());
    act(() => {
      result.current.clearCart();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Cart State Management', () => {
    test('should start with empty cart', () => {
      const { result } = renderHook(() => useCateringCartStore());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });

    test('should add items to cart successfully', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const cateringItem = {
        id: 'catering-package-1',
        name: 'Executive Catering Package',
        price: 45.00,
        quantity: 20, // 20 people
        image: '/images/catering/executive.jpg',
        variantId: JSON.stringify({
          type: 'package',
          minPeople: 10,
          packageId: 'catering-package-1'
        })
      };

      act(() => {
        result.current.addItem(cateringItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe('Executive Catering Package');
      expect(result.current.items[0].price).toBe(45.00);
      expect(result.current.items[0].quantity).toBe(20);
      expect(result.current.totalItems).toBe(1); // 1 unique item
      expect(result.current.totalPrice).toBe(900.00); // 45 * 20
    });

    test('should update existing item quantity when adding same item', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const cateringItem = {
        id: 'appetizer-tray-1',
        name: 'Gourmet Appetizer Tray',
        price: 85.00,
        quantity: 2,
        image: '/images/catering/appetizers.jpg',
        variantId: JSON.stringify({
          type: 'item',
          itemId: 'appetizer-tray-1'
        })
      };

      // Add item first time
      act(() => {
        result.current.addItem(cateringItem);
      });

      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.totalPrice).toBe(170.00); // 85 * 2

      // Add same item again
      act(() => {
        result.current.addItem({ ...cateringItem, quantity: 3 });
      });

      expect(result.current.items).toHaveLength(1); // Still one unique item
      expect(result.current.items[0].quantity).toBe(5); // 2 + 3
      expect(result.current.totalPrice).toBe(425.00); // 85 * 5
    });

    test('should handle mixed package and item types', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const package1 = {
        id: 'pkg-executive',
        name: 'Executive Package',
        price: 45.00,
        quantity: 25,
        image: '/images/catering/executive.jpg',
        variantId: JSON.stringify({ type: 'package', packageId: 'pkg-executive' })
      };

      const item1 = {
        id: 'app-tray-1',
        name: 'Appetizer Tray',
        price: 85.00,
        quantity: 3,
        image: '/images/catering/appetizers.jpg',
        variantId: JSON.stringify({ type: 'item', itemId: 'app-tray-1' })
      };

      const item2 = {
        id: 'dessert-platter',
        name: 'Dessert Platter',
        price: 120.00,
        quantity: 2,
        image: '/images/catering/desserts.jpg',
        variantId: JSON.stringify({ type: 'item', itemId: 'dessert-platter' })
      };

      act(() => {
        result.current.addItem(package1);
        result.current.addItem(item1);
        result.current.addItem(item2);
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.totalItems).toBe(3);
      
      // Calculate expected total: (45 * 25) + (85 * 3) + (120 * 2)
      const expectedTotal = 1125 + 255 + 240;
      expect(result.current.totalPrice).toBe(expectedTotal);

      // Verify item types are preserved
      const packageItem = result.current.items.find(item => item.id === 'pkg-executive');
      const metadata = JSON.parse(packageItem?.variantId || '{}');
      expect(metadata.type).toBe('package');
    });
  });

  describe('Cart Item Operations', () => {
    test('should remove specific item from cart', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item1 = {
        id: 'item-1',
        name: 'Item 1',
        price: 50.00,
        quantity: 2,
        image: '/images/catering/item1.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      const item2 = {
        id: 'item-2',
        name: 'Item 2',
        price: 75.00,
        quantity: 1,
        image: '/images/catering/item2.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      // Add both items
      act(() => {
        result.current.addItem(item1);
        result.current.addItem(item2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.totalPrice).toBe(175.00); // (50 * 2) + (75 * 1)

      // Remove item1
      act(() => {
        result.current.removeItem('item-1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('item-2');
      expect(result.current.totalPrice).toBe(75.00);
    });

    test('should update item quantity', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item = {
        id: 'package-1',
        name: 'Catering Package',
        price: 30.00,
        quantity: 10,
        image: '/images/catering/package.jpg',
        variantId: JSON.stringify({ type: 'package' })
      };

      act(() => {
        result.current.addItem(item);
      });

      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.totalPrice).toBe(300.00);

      // Update quantity
      act(() => {
        result.current.updateQuantity('package-1', 15);
      });

      expect(result.current.items[0].quantity).toBe(15);
      expect(result.current.totalPrice).toBe(450.00);

      // Test quantity reduction
      act(() => {
        result.current.updateQuantity('package-1', 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.totalPrice).toBe(150.00);
    });

    test('should remove item when quantity is set to 0', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item = {
        id: 'remove-test',
        name: 'Remove Test Item',
        price: 100.00,
        quantity: 3,
        image: '/images/catering/test.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      act(() => {
        result.current.addItem(item);
      });

      expect(result.current.items).toHaveLength(1);

      // Set quantity to 0
      act(() => {
        result.current.updateQuantity('remove-test', 0);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalPrice).toBe(0);
    });

    test('should clear entire cart', () => {
      const { result } = renderHook(() => useCateringCartStore());

      // Add multiple items
      const items = [
        {
          id: 'item-1',
          name: 'Item 1',
          price: 50.00,
          quantity: 2,
          image: '/images/catering/item1.jpg',
          variantId: JSON.stringify({ type: 'item' })
        },
        {
          id: 'item-2',
          name: 'Item 2',
          price: 75.00,
          quantity: 3,
          image: '/images/catering/item2.jpg',
          variantId: JSON.stringify({ type: 'item' })
        },
        {
          id: 'package-1',
          name: 'Package 1',
          price: 100.00,
          quantity: 10,
          image: '/images/catering/package1.jpg',
          variantId: JSON.stringify({ type: 'package' })
        },
      ];

      act(() => {
        items.forEach(item => result.current.addItem(item));
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.totalPrice).toBe(1325.00); // (50*2) + (75*3) + (100*10)

      // Clear cart
      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPrice).toBe(0);
    });
  });

  describe('Pricing Calculations', () => {
    test('should calculate total price accurately for multiple items', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const items = [
        {
          id: 'luxury-package',
          name: 'Luxury Catering Package',
          price: 65.00,
          quantity: 30, // 30 people
          image: '/images/catering/luxury.jpg',
          variantId: JSON.stringify({ type: 'package' })
        },
        {
          id: 'wine-service',
          name: 'Wine Service Add-on',
          price: 25.00,
          quantity: 30, // 30 people
          image: '/images/catering/wine.jpg',
          variantId: JSON.stringify({ type: 'item' })
        },
        {
          id: 'appetizer-upgrade',
          name: 'Premium Appetizer Upgrade',
          price: 15.00,
          quantity: 30,
          image: '/images/catering/appetizer-upgrade.jpg',
          variantId: JSON.stringify({ type: 'item' })
        },
      ];

      act(() => {
        items.forEach(item => result.current.addItem(item));
      });

      // Expected: (65 * 30) + (25 * 30) + (15 * 30) = 1950 + 750 + 450 = 3150
      expect(result.current.totalPrice).toBe(3150.00);
      expect(result.current.totalItems).toBe(3);
    });

    test('should handle decimal pricing correctly', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item = {
        id: 'decimal-test',
        name: 'Decimal Price Test',
        price: 12.99,
        quantity: 7,
        image: '/images/catering/decimal.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      act(() => {
        result.current.addItem(item);
      });

      // 12.99 * 7 = 90.93
      expect(result.current.totalPrice).toBe(90.93);
    });

    test('should handle zero-price items (promotional/free items)', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const freeItem = {
        id: 'free-dessert',
        name: 'Complimentary Dessert',
        price: 0.00,
        quantity: 1,
        image: '/images/catering/free-dessert.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      const paidItem = {
        id: 'main-course',
        name: 'Main Course',
        price: 35.00,
        quantity: 20,
        image: '/images/catering/main.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      act(() => {
        result.current.addItem(freeItem);
        result.current.addItem(paidItem);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.totalPrice).toBe(700.00); // Only the paid item
      expect(result.current.items.find(item => item.id === 'free-dessert')?.price).toBe(0);
    });
  });

  describe('Cart Persistence', () => {
    test('should persist cart state to localStorage', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item = {
        id: 'persist-test',
        name: 'Persistence Test Item',
        price: 50.00,
        quantity: 2,
        image: '/images/catering/persist.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      act(() => {
        result.current.addItem(item);
      });

      // Check if localStorage was called to persist the cart
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'catering-cart-storage',
        expect.stringContaining('persist-test')
      );
    });

    test('should load cart state from localStorage on initialization', () => {
      // Set up localStorage with existing cart data
      const existingCartData = {
        state: {
          items: [
            {
              id: 'loaded-item',
              name: 'Loaded Item',
              price: 75.00,
              quantity: 3,
              image: '/images/catering/loaded.jpg',
              variantId: JSON.stringify({ type: 'item' })
            }
          ]
        },
        version: 0
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingCartData));

      // Create new hook instance (simulating page reload)
      const { result } = renderHook(() => useCateringCartStore());

      // Should load the existing item
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe('Loaded Item');
      expect(result.current.totalPrice).toBe(225.00); // 75 * 3
    });

    test('should handle corrupted localStorage data gracefully', () => {
      // Set up corrupted data in localStorage
      localStorageMock.getItem.mockReturnValue('invalid-json-data');

      // Should not crash and should start with empty cart
      const { result } = renderHook(() => useCateringCartStore());

      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalPrice).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative quantities gracefully', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item = {
        id: 'negative-test',
        name: 'Negative Quantity Test',
        price: 50.00,
        quantity: 5,
        image: '/images/catering/negative.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      act(() => {
        result.current.addItem(item);
      });

      // Try to set negative quantity
      act(() => {
        result.current.updateQuantity('negative-test', -2);
      });

      // Should either remove the item or set to minimum quantity (implementation dependent)
      const updatedItem = result.current.items.find(item => item.id === 'negative-test');
      if (updatedItem) {
        expect(updatedItem.quantity).toBeGreaterThanOrEqual(0);
      } else {
        // Item was removed due to invalid quantity
        expect(result.current.items).toHaveLength(0);
      }
    });

    test('should handle non-existent item operations', () => {
      const { result } = renderHook(() => useCateringCartStore());

      // Try to remove non-existent item
      expect(() => {
        act(() => {
          result.current.removeItem('non-existent-id');
        });
      }).not.toThrow();

      // Try to update quantity of non-existent item
      expect(() => {
        act(() => {
          result.current.updateQuantity('non-existent-id', 5);
        });
      }).not.toThrow();

      expect(result.current.items).toHaveLength(0);
    });

    test('should handle items with missing or invalid metadata', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const itemWithoutVariantId = {
        id: 'no-variant',
        name: 'No Variant ID',
        price: 25.00,
        quantity: 1,
        image: '/images/catering/no-variant.jpg',
        // Missing variantId
      };

      const itemWithInvalidVariantId = {
        id: 'invalid-variant',
        name: 'Invalid Variant ID',
        price: 35.00,
        quantity: 2,
        image: '/images/catering/invalid-variant.jpg',
        variantId: 'invalid-json-string'
      };

      expect(() => {
        act(() => {
          result.current.addItem(itemWithoutVariantId as any);
          result.current.addItem(itemWithInvalidVariantId);
        });
      }).not.toThrow();

      // Should handle gracefully and still add items
      expect(result.current.items.length).toBeGreaterThan(0);
    });

    test('should handle extremely large quantities', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item = {
        id: 'large-quantity',
        name: 'Large Quantity Test',
        price: 10.00,
        quantity: 999999,
        image: '/images/catering/large.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      act(() => {
        result.current.addItem(item);
      });

      expect(result.current.items[0].quantity).toBe(999999);
      expect(result.current.totalPrice).toBe(9999990.00);
    });

    test('should maintain cart integrity during rapid operations', () => {
      const { result } = renderHook(() => useCateringCartStore());

      const item = {
        id: 'rapid-test',
        name: 'Rapid Operations Test',
        price: 20.00,
        quantity: 1,
        image: '/images/catering/rapid.jpg',
        variantId: JSON.stringify({ type: 'item' })
      };

      // Perform rapid add/remove operations
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addItem({ ...item, quantity: 1 });
          result.current.updateQuantity('rapid-test', i + 1);
        }
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(10);
      expect(result.current.totalPrice).toBe(200.00);
    });
  });
}); 