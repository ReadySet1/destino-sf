import { validateOrderMinimums, isCateringOrder } from '@/lib/cart-helpers';
import { validateOrderMinimumsServer } from '@/app/actions/orders';
import { CartItem } from '@/types/cart';

// Mock the server action
jest.mock('@/app/actions/orders', () => ({
  validateOrderMinimumsServer: jest.fn(),
}));

const mockValidateOrderMinimumsServer = validateOrderMinimumsServer as jest.MockedFunction<typeof validateOrderMinimumsServer>;

// Shared test data
const validCartItems: CartItem[] = [
  {
    id: 'product-1',
    name: 'Dulce de Leche Alfajores',
    price: 25.00,
    quantity: 2,
    variantId: 'variant-1',
  },
  {
    id: 'product-2',
    name: 'Beef Empanadas',
    price: 15.00,
    quantity: 1,
  },
];

describe('cart-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.warn for isCateringOrder tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateOrderMinimums', () => {

    test('should return valid result when server validation passes', async () => {
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        minimumRequired: 25,
        currentAmount: 65,
      });

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: true,
        errorMessage: undefined,
      });
      expect(mockValidateOrderMinimumsServer).toHaveBeenCalledWith(validCartItems);
    });

    test('should return error when server validation fails', async () => {
      const errorMessage = 'Order minimum of $50 not met';
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage,
        minimumRequired: 50,
        currentAmount: 25,
      });

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: false,
        errorMessage,
      });
    });

    test('should handle invalid input - null items', async () => {
      const result = await validateOrderMinimums(null as any);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Invalid cart items provided',
      });
      expect(mockValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle invalid input - undefined items', async () => {
      const result = await validateOrderMinimums(undefined as any);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Invalid cart items provided',
      });
      expect(mockValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle invalid input - non-array items', async () => {
      const result = await validateOrderMinimums({} as any);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Invalid cart items provided',
      });
      expect(mockValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle empty cart', async () => {
      const result = await validateOrderMinimums([]);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Your cart is empty',
      });
      expect(mockValidateOrderMinimumsServer).not.toHaveBeenCalled();
    });

    test('should handle server action throwing error', async () => {
      mockValidateOrderMinimumsServer.mockRejectedValue(new Error('Network error'));

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Unable to validate order requirements. Please try again.',
      });
      expect(console.error).toHaveBeenCalledWith('Error validating order minimums:', expect.any(Error));
    });

    test('should handle malformed server response', async () => {
      mockValidateOrderMinimumsServer.mockResolvedValue(null as any);

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Order does not meet minimum requirements',
      });
    });

    test('should handle server response without error message', async () => {
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: null,
      });

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Order does not meet minimum requirements',
      });
    });

    test('should handle server response with empty error message', async () => {
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: '',
      });

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Order does not meet minimum requirements',
      });
    });

    test('should preserve specific error messages from server', async () => {
      const specificError = 'Catering orders require a minimum of $350 for this delivery zone';
      mockValidateOrderMinimumsServer.mockResolvedValue({
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
      });
    });

    test('should handle successful validation with additional data', async () => {
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        deliveryZone: 'SAN_FRANCISCO',
        minimumRequired: 25,
        currentAmount: 65,
      });

      const result = await validateOrderMinimums(validCartItems);

      expect(result).toEqual({
        isValid: true,
        errorMessage: undefined,
      });
    });
  });

  describe('isCateringOrder', () => {
    test('should return false and warn about server-side handling', async () => {
      const result = await isCateringOrder(validCartItems);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('isCateringOrder called from client - this is now handled server-side');
    });

    test('should handle empty cart items', async () => {
      const result = await isCateringOrder([]);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('isCateringOrder called from client - this is now handled server-side');
    });
  });
}); 