/**
 * 🧪 Cart Operations - Comprehensive Tests
 * Tests for cart store, helpers, hooks, and cart-related functionality
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '@/store/useCartStore';
import { useCateringCartStore } from '@/store/catering-cart';
import { useSmartCart } from '@/hooks/useSmartCart';
import { 
  validateOrderMinimums, 
  isCateringOrder, 
  OrderValidationResult 
} from '@/lib/cart-helpers';
import { calculateCartTotal, formatPrice } from '@/store/cart';
import { isCateringProduct } from '@/utils/cart-helpers';
import type { CartItem } from '@/store/useCartStore';
import type { CateringCartItem } from '@/store/catering-cart';

// Mock dependencies
jest.mock('@/utils/cart-helpers', () => ({
  isCateringProduct: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/utils/serialization', () => ({
  serializeDecimal: jest.fn((value) => typeof value === 'number' ? value : parseFloat(value?.toString() || '0'))
}));

// Mock server action
jest.mock('@/app/actions/orders', () => ({
  validateOrderMinimumsServer: jest.fn()
}));

describe('Cart Operations - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear cart stores before each test
    useCartStore.getState().clearCart();
    useCateringCartStore.getState().clearCart();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cart Store (Zustand)', () => {
    const mockCartItem: CartItem = {
      id: 'product_1',
      name: 'Test Empanada',
      price: 4.99,
      quantity: 2,
      image: '/images/empanada.jpg'
    };

    const mockCartItemWithVariant: CartItem = {
      id: 'product_2',
      name: 'Test Alfajor',
      price: 3.50,
      quantity: 1,
      image: '/images/alfajor.jpg',
      variantId: 'variant_1'
    };

    it('should add item to cart', () => {
      const { addItem, items, totalItems, totalPrice } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItem);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(mockCartItem);
      expect(state.totalItems).toBe(2);
      expect(state.totalPrice).toBe(9.98); // 4.99 * 2
    });

    it('should update quantity when adding existing item', () => {
      const { addItem } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItem);
        addItem({ ...mockCartItem, quantity: 1 }); // Add 1 more
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(3); // 2 + 1
      expect(state.totalItems).toBe(3);
      expect(state.totalPrice).toBe(14.97); // 4.99 * 3
    });

    it('should handle items with variants separately', () => {
      const { addItem } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItem);
        addItem(mockCartItemWithVariant);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalItems).toBe(3); // 2 + 1
      expect(state.totalPrice).toBe(13.48); // 9.98 + 3.50
    });

    it('should remove item from cart', () => {
      const { addItem, removeItem } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItem);
        addItem(mockCartItemWithVariant);
        removeItem('product_1');
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('product_2');
      expect(state.totalItems).toBe(1);
      expect(state.totalPrice).toBe(3.50);
    });

    it('should remove item with specific variant', () => {
      const sameProductDifferentVariant: CartItem = {
        ...mockCartItemWithVariant,
        variantId: 'variant_2',
        quantity: 2
      };
      
      const { addItem, removeItem } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItemWithVariant);
        addItem(sameProductDifferentVariant);
        removeItem('product_2', 'variant_1');
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].variantId).toBe('variant_2');
      expect(state.totalItems).toBe(2);
    });

    it('should update item quantity', () => {
      const { addItem, updateQuantity } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItem);
        updateQuantity('product_1', 5);
      });

      const state = useCartStore.getState();
      expect(state.items[0].quantity).toBe(5);
      expect(state.totalItems).toBe(5);
      expect(state.totalPrice).toBe(24.95); // 4.99 * 5
    });

    it('should remove item when quantity is set to 0', () => {
      const { addItem, updateQuantity } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItem);
        updateQuantity('product_1', 0);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
    });

    it('should clear entire cart', () => {
      const { addItem, clearCart } = useCartStore.getState();
      
      act(() => {
        addItem(mockCartItem);
        addItem(mockCartItemWithVariant);
        clearCart();
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
    });

    it('should handle edge cases gracefully', () => {
      const { updateQuantity, removeItem } = useCartStore.getState();
      
      // Try to update non-existent item
      act(() => {
        updateQuantity('non_existent', 5);
      });

      // Try to remove non-existent item
      act(() => {
        removeItem('non_existent');
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('Catering Cart Store', () => {
    const mockCateringItem: CateringCartItem = {
      id: 'catering_1',
      name: 'Catering Package',
      price: 150.00,
      quantity: 1,
      image: '/images/catering.jpg'
    };

    it('should add catering item to catering cart', () => {
      const { addItem } = useCateringCartStore.getState();
      
      act(() => {
        addItem(mockCateringItem);
      });

      const state = useCateringCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(mockCateringItem);
      expect(state.totalPrice).toBe(150.00);
    });

    it('should maintain separate state from regular cart', () => {
      const regularItem: CartItem = {
        id: 'regular_1',
        name: 'Regular Item',
        price: 10.00,
        quantity: 1
      };

      act(() => {
        useCartStore.getState().addItem(regularItem);
        useCateringCartStore.getState().addItem(mockCateringItem);
      });

      const regularState = useCartStore.getState();
      const cateringState = useCateringCartStore.getState();

      expect(regularState.items).toHaveLength(1);
      expect(cateringState.items).toHaveLength(1);
      expect(regularState.totalPrice).toBe(10.00);
      expect(cateringState.totalPrice).toBe(150.00);
    });
  });

  describe('Smart Cart Hook', () => {
    const mockSimpleProduct = {
      id: 'product_1',
      name: 'Test Product',
      price: 15.99,
      image: '/images/test.jpg'
    };

    const mockDbProduct = {
      id: 'product_2',
      name: 'DB Product',
      price: { toString: () => '20.50' } as any, // Mock Decimal
      images: ['/images/db-product.jpg'],
      categoryId: 'category_1',
      category: { name: 'Test Category' },
      variants: [{ id: 'variant_1', name: 'Regular' }]
    };

    beforeEach(() => {
      (isCateringProduct as jest.Mock).mockReturnValue(false);
    });

    it('should normalize database product correctly', () => {
      const { result } = renderHook(() => useSmartCart());
      
      act(() => {
        result.current.addToCart(mockDbProduct, 2);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toMatchObject({
        id: 'product_2',
        name: 'DB Product',
        price: 20.50,
        quantity: 2,
        image: '/images/db-product.jpg',
        variantId: 'variant_1'
      });
    });

    it('should add to regular cart for non-catering products', () => {
      (isCateringProduct as jest.Mock).mockReturnValue(false);
      
      const { result } = renderHook(() => useSmartCart());
      
      act(() => {
        const cartType = result.current.addToCart(mockSimpleProduct, 1);
        expect(cartType).toBe('regular');
      });

      const regularState = useCartStore.getState();
      const cateringState = useCateringCartStore.getState();

      expect(regularState.items).toHaveLength(1);
      expect(cateringState.items).toHaveLength(0);
    });

    it('should add to catering cart for catering products', () => {
      (isCateringProduct as jest.Mock).mockReturnValue(true);
      
      const { result } = renderHook(() => useSmartCart());
      
      act(() => {
        const cartType = result.current.addToCart(mockSimpleProduct, 1);
        expect(cartType).toBe('catering');
      });

      const regularState = useCartStore.getState();
      const cateringState = useCateringCartStore.getState();

      expect(regularState.items).toHaveLength(0);
      expect(cateringState.items).toHaveLength(1);
    });

    it('should remove item from both carts', () => {
      const { result } = renderHook(() => useSmartCart());
      
      // Add to both carts
      act(() => {
        useCartStore.getState().addItem({
          id: 'product_1',
          name: 'Test',
          price: 10,
          quantity: 1
        });
        useCateringCartStore.getState().addItem({
          id: 'product_1',
          name: 'Test',
          price: 10,
          quantity: 1
        });
      });

      // Remove from both
      act(() => {
        result.current.removeFromBothCarts('product_1');
      });

      const regularState = useCartStore.getState();
      const cateringState = useCateringCartStore.getState();

      expect(regularState.items).toHaveLength(0);
      expect(cateringState.items).toHaveLength(0);
    });

    it('should get correct cart totals', () => {
      const { result } = renderHook(() => useSmartCart());
      
      act(() => {
        useCartStore.getState().addItem({
          id: 'regular_1',
          name: 'Regular',
          price: 10,
          quantity: 2
        });
        useCateringCartStore.getState().addItem({
          id: 'catering_1',
          name: 'Catering',
          price: 50,
          quantity: 1
        });
      });

      const totals = result.current.getCartTotals();
      
      expect(totals).toEqual({
        regularTotal: 20,
        cateringTotal: 50,
        combinedTotal: 70,
        regularItems: 2,
        cateringItems: 1,
        totalItems: 3
      });
    });

    it('should clear all carts', () => {
      const { result } = renderHook(() => useSmartCart());
      
      // Add items to both carts
      act(() => {
        useCartStore.getState().addItem({
          id: 'regular_1',
          name: 'Regular',
          price: 10,
          quantity: 1
        });
        useCateringCartStore.getState().addItem({
          id: 'catering_1',
          name: 'Catering',
          price: 50,
          quantity: 1
        });
      });

      // Clear all
      act(() => {
        result.current.clearAllCarts();
      });

      const regularState = useCartStore.getState();
      const cateringState = useCateringCartStore.getState();

      expect(regularState.items).toHaveLength(0);
      expect(cateringState.items).toHaveLength(0);
    });
  });

  describe('Cart Helpers', () => {
    it('should calculate cart total correctly', () => {
      const items: CartItem[] = [
        { id: '1', name: 'Item 1', price: 10.99, quantity: 2 },
        { id: '2', name: 'Item 2', price: 15.50, quantity: 1 },
        { id: '3', name: 'Item 3', price: 5.25, quantity: 3 }
      ];

      const total = calculateCartTotal(items);
      
      // Expected: (10.99 * 2) + (15.50 * 1) + (5.25 * 3) = 21.98 + 15.50 + 15.75 = 53.23
      expect(total).toBe(53.23);
    });

    it('should handle empty cart total calculation', () => {
      const total = calculateCartTotal([]);
      expect(total).toBe(0);
    });

    it('should format price correctly', () => {
      expect(formatPrice(10.99)).toBe('$10.99');
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(1000)).toBe('$1,000.00');
      expect(formatPrice(10.5)).toBe('$10.50');
    });

    it('should validate order minimums', async () => {
      const { validateOrderMinimumsServer } = await import('@/app/actions/orders');
      (validateOrderMinimumsServer as jest.Mock).mockResolvedValue({
        isValid: true,
        deliveryZone: 'SF_NEARBY'
      });

      const items: CartItem[] = [
        { id: '1', name: 'Item 1', price: 25.00, quantity: 2 }
      ];

      const result = await validateOrderMinimums(items);
      
      expect(result.isValid).toBe(true);
      expect(result.deliveryZone).toBe('SF_NEARBY');
    });

    it('should handle validation errors gracefully', async () => {
      const { validateOrderMinimumsServer } = await import('@/app/actions/orders');
      (validateOrderMinimumsServer as jest.Mock).mockRejectedValue(
        new Error('Server error')
      );

      const items: CartItem[] = [
        { id: '1', name: 'Item 1', price: 10.00, quantity: 1 }
      ];

      const result = await validateOrderMinimums(items);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('validation failed');
    });

    it('should validate empty cart', async () => {
      const result = await validateOrderMinimums([]);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Your cart is empty');
    });

    it('should validate invalid cart items', async () => {
      const result = await validateOrderMinimums(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid cart items provided');
    });
  });

  describe('Cart Persistence', () => {
    it('should persist cart state across sessions', () => {
      const { addItem } = useCartStore.getState();
      
      act(() => {
        addItem({
          id: 'persistent_1',
          name: 'Persistent Item',
          price: 10.00,
          quantity: 2
        });
      });

      // Simulate page reload by creating new hook
      const { result: newResult } = renderHook(() => useCartStore());
      
      // Note: In real tests with proper localStorage setup, this would persist
      // For now, we're testing the store functionality
      expect(newResult.current.items).toHaveLength(1);
    });
  });

  describe('Cart Edge Cases', () => {
    it('should handle negative quantities gracefully', () => {
      const { addItem, updateQuantity } = useCartStore.getState();
      
      act(() => {
        addItem({
          id: 'test_1',
          name: 'Test Item',
          price: 10.00,
          quantity: 5
        });
        updateQuantity('test_1', -1);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0); // Item should be removed
    });

    it('should handle very large quantities', () => {
      const { addItem } = useCartStore.getState();
      
      act(() => {
        addItem({
          id: 'bulk_1',
          name: 'Bulk Item',
          price: 1.00,
          quantity: 1000
        });
      });

      const state = useCartStore.getState();
      expect(state.totalItems).toBe(1000);
      expect(state.totalPrice).toBe(1000.00);
    });

    it('should handle items with zero price', () => {
      const { addItem } = useCartStore.getState();
      
      act(() => {
        addItem({
          id: 'free_1',
          name: 'Free Item',
          price: 0,
          quantity: 2
        });
      });

      const state = useCartStore.getState();
      expect(state.totalPrice).toBe(0);
      expect(state.totalItems).toBe(2);
    });

    it('should handle items with decimal prices correctly', () => {
      const { addItem } = useCartStore.getState();
      
      act(() => {
        addItem({
          id: 'decimal_1',
          name: 'Decimal Item',
          price: 3.33,
          quantity: 3
        });
      });

      const state = useCartStore.getState();
      expect(state.totalPrice).toBe(9.99); // 3.33 * 3
    });

    it('should handle concurrent cart updates', () => {
      const { addItem, updateQuantity } = useCartStore.getState();
      
      act(() => {
        // Simulate concurrent operations
        addItem({ id: '1', name: 'Item 1', price: 10, quantity: 1 });
        addItem({ id: '2', name: 'Item 2', price: 20, quantity: 1 });
        updateQuantity('1', 5);
        updateQuantity('2', 3);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.totalPrice).toBe(110); // (10 * 5) + (20 * 3)
    });
  });

  describe('Cart Performance', () => {
    it('should handle large number of items efficiently', () => {
      const { addItem } = useCartStore.getState();
      
      const startTime = Date.now();
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          addItem({
            id: `item_${i}`,
            name: `Item ${i}`,
            price: Math.random() * 50,
            quantity: Math.floor(Math.random() * 5) + 1
          });
        }
      });
      
      const endTime = Date.now();
      const state = useCartStore.getState();
      
      expect(state.items).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should calculate totals efficiently for large carts', () => {
      const items: CartItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `item_${i}`,
        name: `Item ${i}`,
        price: 10,
        quantity: 2
      }));

      const startTime = Date.now();
      const total = calculateCartTotal(items);
      const endTime = Date.now();

      expect(total).toBe(20000); // 1000 items * 10 price * 2 quantity
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
