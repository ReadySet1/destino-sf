/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSmartCart } from '@/hooks/useSmartCart';
import { useCartStore } from '@/store/cart';
import { useCateringCartStore } from '@/store/catering-cart';
import * as cartHelpers from '@/utils/cart-helpers';
import * as serialization from '@/utils/serialization';
import { Product as DbProduct } from '@/types/product';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@/store/cart');
jest.mock('@/store/catering-cart');
jest.mock('@/utils/cart-helpers');
jest.mock('@/utils/serialization');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

// Mock stores
const mockRegularCart = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
};

const mockCateringCart = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
};

const mockUseCartStore = useCartStore as jest.MockedFunction<typeof useCartStore>;
const mockUseCateringCartStore = useCateringCartStore as jest.MockedFunction<
  typeof useCateringCartStore
>;
const mockIsCateringProduct = cartHelpers.isCateringProduct as jest.MockedFunction<
  typeof cartHelpers.isCateringProduct
>;
const mockSerializeDecimal = serialization.serializeDecimal as jest.MockedFunction<
  typeof serialization.serializeDecimal
>;

describe.skip('useSmartCart', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseCartStore.mockReturnValue(mockRegularCart);
    mockUseCateringCartStore.mockReturnValue(mockCateringCart);
    mockIsCateringProduct.mockReturnValue(false);
    mockSerializeDecimal.mockImplementation(value => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && 'toNumber' in value) {
        return (value as Decimal).toNumber();
      }
      return 0;
    });
  });

  describe('normalizeProduct', () => {
    it('should normalize a simple product correctly', () => {
      const simpleProduct = {
        id: '1',
        name: 'Test Product',
        price: 10.99,
        image: '/test.jpg',
        variantId: 'variant-1',
        category: {
          id: 'cat-1',
          name: 'Test Category',
        },
      };

      const { result } = renderHook(() => useSmartCart());

      // Test by calling addToCart which internally uses normalizeProduct
      act(() => {
        result.current.addToCart(simpleProduct);
      });

      expect(mockRegularCart.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Test Product',
        price: 10.99,
        quantity: 1,
        image: '/test.jpg',
        variantId: 'variant-1',
      });
    });

    it('should normalize a database product correctly', () => {
      const dbProduct: DbProduct = {
        id: '1',
        name: 'Test DB Product',
        price: new Decimal(15.99),
        images: ['/db-test.jpg'],
        categoryId: 'cat-1',
        category: {
          id: 'cat-1',
          name: 'DB Category',
          // Add other required fields
        } as any,
        variants: [
          {
            id: 'var-1',
            name: 'Test Variant',
            price: new Decimal(15.99),
            // Add other required fields
          } as any,
        ],
        // Add other required fields
      } as DbProduct;

      mockSerializeDecimal.mockReturnValue(15.99);

      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.addToCart(dbProduct);
      });

      expect(mockSerializeDecimal).toHaveBeenCalledWith(dbProduct.price);
      expect(mockRegularCart.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Test DB Product',
        price: 15.99,
        quantity: 1,
        image: '/db-test.jpg',
        variantId: 'var-1',
      });
    });

    it('should handle database product with null price', () => {
      const dbProduct = {
        id: '1',
        name: 'Test Product',
        price: null as any,
        images: [],
        categoryId: 'cat-1',
        category: null,
        variants: null,
      } as unknown as DbProduct;

      mockSerializeDecimal.mockReturnValue(0);

      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.addToCart(dbProduct);
      });

      expect(mockRegularCart.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Test Product',
        price: 0,
        quantity: 1,
        image: undefined,
        variantId: undefined,
      });
    });
  });

  describe('addToCart', () => {
    it('should add regular product to regular cart', () => {
      mockIsCateringProduct.mockReturnValue(false);

      const product = {
        id: '1',
        name: 'Regular Product',
        price: 10.99,
      };

      const { result } = renderHook(() => useSmartCart());

      let cartType: string;
      act(() => {
        cartType = result.current.addToCart(product);
      });

      expect(mockIsCateringProduct).toHaveBeenCalled();
      expect(mockRegularCart.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Regular Product',
        price: 10.99,
        quantity: 1,
        image: undefined,
        variantId: undefined,
      });
      expect(mockCateringCart.addItem).not.toHaveBeenCalled();
      expect(cartType!).toBe('regular');
    });

    it('should add catering product to catering cart', () => {
      mockIsCateringProduct.mockReturnValue(true);

      const product = {
        id: '1',
        name: 'Catering Product',
        price: 25.99,
      };

      const { result } = renderHook(() => useSmartCart());

      let cartType: string;
      act(() => {
        cartType = result.current.addToCart(product);
      });

      expect(mockIsCateringProduct).toHaveBeenCalled();
      expect(mockCateringCart.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Catering Product',
        price: 25.99,
        quantity: 1,
        image: undefined,
        variantId: undefined,
      });
      expect(mockRegularCart.addItem).not.toHaveBeenCalled();
      expect(cartType!).toBe('catering');
    });

    it('should add product with custom quantity', () => {
      const product = {
        id: '1',
        name: 'Test Product',
        price: 10.99,
      };

      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.addToCart(product, 3);
      });

      expect(mockRegularCart.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Test Product',
        price: 10.99,
        quantity: 3,
        image: undefined,
        variantId: undefined,
      });
    });

    it('should default quantity to 1 when not provided', () => {
      const product = {
        id: '1',
        name: 'Test Product',
        price: 10.99,
      };

      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.addToCart(product);
      });

      expect(mockRegularCart.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 1 })
      );
    });
  });

  describe('removeFromAllCarts', () => {
    it('should remove item from both carts', () => {
      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.removeFromAllCarts('test-id');
      });

      expect(mockRegularCart.removeItem).toHaveBeenCalledWith('test-id', undefined);
      expect(mockCateringCart.removeItem).toHaveBeenCalledWith('test-id', undefined);
    });

    it('should remove item with variant from both carts', () => {
      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.removeFromAllCarts('test-id', 'variant-1');
      });

      expect(mockRegularCart.removeItem).toHaveBeenCalledWith('test-id', 'variant-1');
      expect(mockCateringCart.removeItem).toHaveBeenCalledWith('test-id', 'variant-1');
    });
  });

  describe('getTotalItemCount', () => {
    it('should return combined total from both carts', () => {
      // Mock cart states with different totals
      mockUseCartStore.mockReturnValue({
        ...mockRegularCart,
        totalItems: 5,
      });

      mockUseCateringCartStore.mockReturnValue({
        ...mockCateringCart,
        totalItems: 3,
      });

      const { result } = renderHook(() => useSmartCart());

      const totalCount = result.current.getTotalItemCount();

      expect(totalCount).toBe(8);
    });

    it('should return 0 when both carts are empty', () => {
      mockUseCartStore.mockReturnValue({
        ...mockRegularCart,
        totalItems: 0,
      });

      mockUseCateringCartStore.mockReturnValue({
        ...mockCateringCart,
        totalItems: 0,
      });

      const { result } = renderHook(() => useSmartCart());

      const totalCount = result.current.getTotalItemCount();

      expect(totalCount).toBe(0);
    });
  });

  describe('isInAnyCart', () => {
    beforeEach(() => {
      // Setup mock cart items
      mockUseCartStore.mockReturnValue({
        ...mockRegularCart,
        items: [
          { id: '1', name: 'Item 1', price: 10, quantity: 1 },
          { id: '2', name: 'Item 2', price: 15, quantity: 2, variantId: 'var-1' },
        ],
      });

      mockUseCateringCartStore.mockReturnValue({
        ...mockCateringCart,
        items: [
          { id: '3', name: 'Catering Item 1', price: 25, quantity: 1 },
          { id: '4', name: 'Catering Item 2', price: 30, quantity: 1, variantId: 'var-2' },
        ],
      });
    });

    it('should return true if item is in regular cart', () => {
      const { result } = renderHook(() => useSmartCart());

      const isInCart = result.current.isInAnyCart('1');

      expect(isInCart).toBe(true);
    });

    it('should return true if item is in catering cart', () => {
      const { result } = renderHook(() => useSmartCart());

      const isInCart = result.current.isInAnyCart('3');

      expect(isInCart).toBe(true);
    });

    it('should return true if item with variant is in regular cart', () => {
      const { result } = renderHook(() => useSmartCart());

      const isInCart = result.current.isInAnyCart('2', 'var-1');

      expect(isInCart).toBe(true);
    });

    it('should return true if item with variant is in catering cart', () => {
      const { result } = renderHook(() => useSmartCart());

      const isInCart = result.current.isInAnyCart('4', 'var-2');

      expect(isInCart).toBe(true);
    });

    it('should return false if item is not in any cart', () => {
      const { result } = renderHook(() => useSmartCart());

      const isInCart = result.current.isInAnyCart('nonexistent');

      expect(isInCart).toBe(false);
    });

    it('should return false if item exists but variant does not match', () => {
      const { result } = renderHook(() => useSmartCart());

      const isInCart = result.current.isInAnyCart('2', 'wrong-variant');

      expect(isInCart).toBe(false);
    });

    it('should return false if variant is provided but item has no variant', () => {
      const { result } = renderHook(() => useSmartCart());

      const isInCart = result.current.isInAnyCart('1', 'some-variant');

      expect(isInCart).toBe(false);
    });
  });

  describe('hook returns', () => {
    it('should return both cart stores and all methods', () => {
      const { result } = renderHook(() => useSmartCart());

      expect(result.current).toHaveProperty('regularCart');
      expect(result.current).toHaveProperty('cateringCart');
      expect(result.current).toHaveProperty('addToCart');
      expect(result.current).toHaveProperty('removeFromAllCarts');
      expect(result.current).toHaveProperty('getTotalItemCount');
      expect(result.current).toHaveProperty('isInAnyCart');

      expect(typeof result.current.addToCart).toBe('function');
      expect(typeof result.current.removeFromAllCarts).toBe('function');
      expect(typeof result.current.getTotalItemCount).toBe('function');
      expect(typeof result.current.isInAnyCart).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle product without category', () => {
      const product = {
        id: '1',
        name: 'Product without category',
        price: 10.99,
      };

      mockIsCateringProduct.mockReturnValue(false);

      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.addToCart(product);
      });

      expect(mockIsCateringProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Product without category',
          price: 10.99,
        })
      );
    });

    it('should handle database product with empty arrays', () => {
      const dbProduct = {
        id: '1',
        name: 'Empty arrays product',
        price: new Decimal(10.99),
        images: [],
        variants: [],
        categoryId: null,
        category: null,
      } as unknown as DbProduct;

      mockSerializeDecimal.mockReturnValue(10.99);

      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.addToCart(dbProduct);
      });

      expect(mockRegularCart.addItem).toHaveBeenCalledWith({
        id: '1',
        name: 'Empty arrays product',
        price: 10.99,
        quantity: 1,
        image: undefined,
        variantId: undefined,
      });
    });

    it('should handle zero quantity', () => {
      const product = {
        id: '1',
        name: 'Test Product',
        price: 10.99,
      };

      const { result } = renderHook(() => useSmartCart());

      act(() => {
        result.current.addToCart(product, 0);
      });

      expect(mockRegularCart.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 0 })
      );
    });
  });
});
