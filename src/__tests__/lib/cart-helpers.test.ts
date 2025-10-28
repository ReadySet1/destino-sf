// First, clear any existing mocks on the cart-helpers module
jest.unmock('@/lib/cart-helpers');

import { validateOrderMinimums, isCateringOrder } from '@/lib/cart-helpers';
import { CartItem } from '@/types/cart';

// Mock the server action
const mockValidateOrderMinimumsServer = jest.fn();
jest.mock('@/app/actions/orders', () => ({
  validateOrderMinimumsServer: mockValidateOrderMinimumsServer,
}));

import { validateOrderMinimumsServer } from '@/app/actions/orders';

const mockedValidateOrderMinimumsServer = mockValidateOrderMinimumsServer;

// Shared test data
const validCartItems: CartItem[] = [
  {
    id: 'product-1',
    name: 'Dulce de Leche Alfajores',
    price: 25.0,
    quantity: 2,
    variantId: 'variant-1',
  },
  {
    id: 'product-2',
    name: 'Beef Empanadas',
    price: 15.0,
    quantity: 1,
  },
];

describe.skip('cart-helpers', () => {
  beforeEach(() => {
    mockedValidateOrderMinimumsServer.mockClear();
    // Set up default mock response to avoid undefined behavior
    mockedValidateOrderMinimumsServer.mockResolvedValue({
      isValid: true,
      minimumRequired: 25,
      currentAmount: 65,
    });
    // Suppress console.warn for isCateringOrder tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateOrderMinimums', () => {
    const validCartItems: CartItem[] = [
      { id: '1', name: 'Product 1', price: 10, quantity: 2 },
      { id: '2', name: 'Product 2', price: 15, quantity: 3 },
    ];

    test('should return valid result when server validation passes', async () => {
      mockedValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        minimumRequired: 25,
        currentAmount: 65,
      });

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: true,
        errorMessage: undefined,
        minimumRequired: 25,
        currentAmount: 65,
      });
    });

    test('should return error when server validation fails', async () => {
      const errorMessage = 'Order minimum of $50 not met';
      mockedValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage,
        minimumRequired: 50,
        currentAmount: 25,
      });

      const result = await validateOrderMinimums(validCartItems);
      expect(result).toEqual({
        isValid: false,
        errorMessage,
        minimumRequired: 50,
        currentAmount: 25,
      });
    });

    test('should handle invalid input - null items', async () => {
      const result = await validateOrderMinimums(null as any);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Invalid cart items provided',
      });
      expect(mockedValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle invalid input - undefined items', async () => {
      const result = await validateOrderMinimums(undefined as any);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Invalid cart items provided',
      });
      expect(mockedValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle invalid input - non-array items', async () => {
      const result = await validateOrderMinimums({} as any);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Invalid cart items provided',
      });
      expect(mockedValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle empty cart', async () => {
      const result = await validateOrderMinimums([]);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Your cart is empty',
      });
      expect(mockedValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle server action throwing error', async () => {
      mockedValidateOrderMinimumsServer.mockRejectedValue(new Error('Server error'));

      const result = await validateOrderMinimums(validCartItems);
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Unable to validate order requirements. Please try again.',
      });
    });

    test('should handle malformed server response', async () => {
      mockedValidateOrderMinimumsServer.mockResolvedValue(null);
      const result = await validateOrderMinimums(validCartItems);
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Order does not meet minimum requirements',
      });
    });

    test('should handle server response without error message', async () => {
      mockedValidateOrderMinimumsServer.mockResolvedValue({ isValid: false });
      const result = await validateOrderMinimums(validCartItems);
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Order does not meet minimum requirements',
      });
    });

    test('should handle server response with empty error message', async () => {
      mockedValidateOrderMinimumsServer.mockResolvedValue({ isValid: false, errorMessage: '' });
      const result = await validateOrderMinimums(validCartItems);
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Order does not meet minimum requirements',
      });
    });

    test('should preserve specific error messages from server', async () => {
      const specificError = 'Catering orders require a minimum of $350 for this delivery zone';
      mockedValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: specificError,
        deliveryZone: 'SOUTH_BAY',
        minimumRequired: 350,
        currentAmount: 200,
      });

      const result = await validateOrderMinimums(validCartItems);
      expect(result).toEqual({
        isValid: false,
        errorMessage: specificError,
        deliveryZone: 'SOUTH_BAY',
        minimumRequired: 350,
        currentAmount: 200,
      });
    });

    test('should handle successful validation with additional data', async () => {
      mockedValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        deliveryZone: 'SAN_FRANCISCO',
        minimumRequired: 25,
        currentAmount: 65,
      });

      const result = await validateOrderMinimums(validCartItems);
      expect(result).toEqual({
        isValid: true,
        errorMessage: undefined,
        deliveryZone: 'SAN_FRANCISCO',
        minimumRequired: 25,
        currentAmount: 65,
      });
    });
  });

  describe('isCateringOrder', () => {
    test('should return false and warn about server-side handling', async () => {
      const result = await isCateringOrder(validCartItems);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'isCateringOrder called from client - this is now handled server-side'
      );
    });

    test('should handle empty cart items', async () => {
      const result = await isCateringOrder([]);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'isCateringOrder called from client - this is now handled server-side'
      );
    });
  });
});
