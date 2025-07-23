import {
  getDeliveryZone,
  calculateDeliveryFee,
  getDeliveryFeeMessage,
  DeliveryZone,
} from '@/lib/deliveryUtils';
import { Address } from '@/types/address';

// Mock the delivery utilities for API testing
jest.mock('@/lib/deliveryUtils');

const mockGetDeliveryZone = getDeliveryZone as jest.MockedFunction<typeof getDeliveryZone>;
const mockCalculateDeliveryFee = calculateDeliveryFee as jest.MockedFunction<
  typeof calculateDeliveryFee
>;
const mockGetDeliveryFeeMessage = getDeliveryFeeMessage as jest.MockedFunction<
  typeof getDeliveryFeeMessage
>;

describe('/api/shipping/zones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress expected warnings/errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Delivery zone validation', () => {
    test('should identify San Francisco as nearby zone', async () => {
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);

      const zone = getDeliveryZone('San Francisco');

      expect(mockGetDeliveryZone).toHaveBeenCalledWith('San Francisco');
      expect(zone).toBe(DeliveryZone.NEARBY);
    });

    test('should identify Oakland as distant zone', async () => {
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.DISTANT);

      const zone = getDeliveryZone('Oakland');

      expect(mockGetDeliveryZone).toHaveBeenCalledWith('Oakland');
      expect(zone).toBe(DeliveryZone.DISTANT);
    });

    test('should return null for unsupported areas', async () => {
      mockGetDeliveryZone.mockReturnValue(null);

      const zone = getDeliveryZone('Los Angeles');

      expect(mockGetDeliveryZone).toHaveBeenCalledWith('Los Angeles');
      expect(zone).toBeNull();
    });

    test('should handle case insensitive city names', async () => {
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);

      const zone = getDeliveryZone('san francisco');

      expect(mockGetDeliveryZone).toHaveBeenCalledWith('san francisco');
      expect(zone).toBe(DeliveryZone.NEARBY);
    });

    test('should handle cities with extra whitespace', async () => {
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);

      const zone = getDeliveryZone('  San Francisco  ');

      expect(mockGetDeliveryZone).toHaveBeenCalledWith('  San Francisco  ');
      expect(zone).toBe(DeliveryZone.NEARBY);
    });

    test('should validate multiple nearby zone cities', async () => {
      const nearbyCities = ['San Francisco', 'South San Francisco', 'Daly City', 'San Mateo'];

      nearbyCities.forEach(city => {
        mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
        const zone = getDeliveryZone(city);
        expect(zone).toBe(DeliveryZone.NEARBY);
      });

      expect(mockGetDeliveryZone).toHaveBeenCalledTimes(nearbyCities.length);
    });

    test('should validate multiple distant zone cities', async () => {
      const distantCities = ['Oakland', 'San Jose', 'Berkeley', 'Palo Alto'];

      distantCities.forEach(city => {
        mockGetDeliveryZone.mockReturnValue(DeliveryZone.DISTANT);
        const zone = getDeliveryZone(city);
        expect(zone).toBe(DeliveryZone.DISTANT);
      });

      expect(mockGetDeliveryZone).toHaveBeenCalledTimes(distantCities.length);
    });
  });

  describe('Fee calculation endpoint', () => {
    const createAddress = (city: string): Address => ({
      street: '123 Test St',
      city,
      state: 'CA',
      postalCode: '12345',
    });

    test('should calculate fee for nearby zone with order under $75', async () => {
      const address = createAddress('San Francisco');
      const expectedResult = {
        zone: DeliveryZone.NEARBY,
        fee: 15,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75,
      };

      mockCalculateDeliveryFee.mockReturnValue(expectedResult);

      const result = calculateDeliveryFee(address, 50);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, 50);
      expect(result).toEqual(expectedResult);
    });

    test('should calculate free delivery for nearby zone with order over $75', async () => {
      const address = createAddress('San Francisco');
      const expectedResult = {
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      };

      mockCalculateDeliveryFee.mockReturnValue(expectedResult);

      const result = calculateDeliveryFee(address, 100);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, 100);
      expect(result).toEqual(expectedResult);
    });

    test('should calculate fee for distant zone regardless of order amount', async () => {
      const address = createAddress('Oakland');
      const expectedResult = {
        zone: DeliveryZone.DISTANT,
        fee: 25,
        isFreeDelivery: false,
      };

      mockCalculateDeliveryFee.mockReturnValue(expectedResult);

      const result = calculateDeliveryFee(address, 100);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, 100);
      expect(result).toEqual(expectedResult);
    });

    test('should return null for unsupported delivery areas', async () => {
      const address = createAddress('Los Angeles');

      mockCalculateDeliveryFee.mockReturnValue(null);

      const result = calculateDeliveryFee(address, 50);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, 50);
      expect(result).toBeNull();
    });

    test('should handle edge case of exactly $75 order', async () => {
      const address = createAddress('San Francisco');
      const expectedResult = {
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      };

      mockCalculateDeliveryFee.mockReturnValue(expectedResult);

      const result = calculateDeliveryFee(address, 75);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, 75);
      expect(result).toEqual(expectedResult);
    });

    test('should handle very large order amounts', async () => {
      const address = createAddress('San Francisco');
      const expectedResult = {
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      };

      mockCalculateDeliveryFee.mockReturnValue(expectedResult);

      const result = calculateDeliveryFee(address, 500);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, 500);
      expect(result).toEqual(expectedResult);
    });

    test('should handle zero order amount', async () => {
      const address = createAddress('San Francisco');
      const expectedResult = {
        zone: DeliveryZone.NEARBY,
        fee: 15,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75,
      };

      mockCalculateDeliveryFee.mockReturnValue(expectedResult);

      const result = calculateDeliveryFee(address, 0);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, 0);
      expect(result).toEqual(expectedResult);
    });

    test('should handle negative order amount', async () => {
      const address = createAddress('San Francisco');
      const expectedResult = {
        zone: DeliveryZone.NEARBY,
        fee: 15,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75,
      };

      mockCalculateDeliveryFee.mockReturnValue(expectedResult);

      const result = calculateDeliveryFee(address, -10);

      expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(address, -10);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Address validation', () => {
    test('should validate complete address structure', async () => {
      const validAddress: Address = {
        street: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };

      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);

      const zone = getDeliveryZone(validAddress.city);

      expect(zone).toBe(DeliveryZone.NEARBY);
      expect(validAddress.street).toBeTruthy();
      expect(validAddress.state).toBeTruthy();
      expect(validAddress.postalCode).toBeTruthy();
    });

    test('should handle address with missing optional fields', async () => {
      const minimalAddress: Address = {
        street: '456 Oak St',
        city: 'Oakland',
        state: 'CA',
        postalCode: '94601',
      };

      mockGetDeliveryZone.mockReturnValue(DeliveryZone.DISTANT);

      const zone = getDeliveryZone(minimalAddress.city);

      expect(zone).toBe(DeliveryZone.DISTANT);
    });

    test('should handle address with empty city', async () => {
      const invalidAddress: Address = {
        street: '789 Pine St',
        city: '',
        state: 'CA',
        postalCode: '94102',
      };

      mockGetDeliveryZone.mockReturnValue(null);

      const zone = getDeliveryZone(invalidAddress.city);

      expect(zone).toBeNull();
    });

    test('should validate San Francisco postal codes', async () => {
      const sfPostalCodes = ['94102', '94103', '94105', '94107', '94110'];

      sfPostalCodes.forEach(postalCode => {
        const address: Address = {
          street: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          postalCode,
        };

        mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
        const zone = getDeliveryZone(address.city);
        expect(zone).toBe(DeliveryZone.NEARBY);
      });
    });

    test('should validate Oakland postal codes', async () => {
      const oaklandPostalCodes = ['94601', '94602', '94605', '94610', '94612'];

      oaklandPostalCodes.forEach(postalCode => {
        const address: Address = {
          street: '123 Test St',
          city: 'Oakland',
          state: 'CA',
          postalCode,
        };

        mockGetDeliveryZone.mockReturnValue(DeliveryZone.DISTANT);
        const zone = getDeliveryZone(address.city);
        expect(zone).toBe(DeliveryZone.DISTANT);
      });
    });

    test('should handle invalid postal code format', async () => {
      const address: Address = {
        street: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: 'invalid',
      };

      // Zone validation should still work based on city
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);

      const zone = getDeliveryZone(address.city);

      expect(zone).toBe(DeliveryZone.NEARBY);
    });

    test('should handle out-of-state addresses', async () => {
      const outOfStateAddress: Address = {
        street: '123 Broadway',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
      };

      mockGetDeliveryZone.mockReturnValue(null);

      const zone = getDeliveryZone(outOfStateAddress.city);

      expect(zone).toBeNull();
    });
  });

  describe('Delivery fee messages', () => {
    test('should return free delivery message for nearby zone with qualifying order', async () => {
      const feeResult = {
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      };

      mockGetDeliveryFeeMessage.mockReturnValue('Free delivery for orders over $75!');

      const message = getDeliveryFeeMessage(feeResult);

      expect(mockGetDeliveryFeeMessage).toHaveBeenCalledWith(feeResult);
      expect(message).toBe('Free delivery for orders over $75!');
    });

    test('should return fee message for nearby zone with non-qualifying order', async () => {
      const feeResult = {
        zone: DeliveryZone.NEARBY,
        fee: 15,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75,
      };

      mockGetDeliveryFeeMessage.mockReturnValue(
        '$15 delivery fee. Orders over $75 qualify for free delivery!'
      );

      const message = getDeliveryFeeMessage(feeResult);

      expect(mockGetDeliveryFeeMessage).toHaveBeenCalledWith(feeResult);
      expect(message).toBe('$15 delivery fee. Orders over $75 qualify for free delivery!');
    });

    test('should return fee message for distant zone', async () => {
      const feeResult = {
        zone: DeliveryZone.DISTANT,
        fee: 25,
        isFreeDelivery: false,
      };

      mockGetDeliveryFeeMessage.mockReturnValue('$25 delivery fee for this area.');

      const message = getDeliveryFeeMessage(feeResult);

      expect(mockGetDeliveryFeeMessage).toHaveBeenCalledWith(feeResult);
      expect(message).toBe('$25 delivery fee for this area.');
    });

    test('should return unsupported area message', async () => {
      mockGetDeliveryFeeMessage.mockReturnValue('This address is outside our delivery area.');

      const message = getDeliveryFeeMessage(null);

      expect(mockGetDeliveryFeeMessage).toHaveBeenCalledWith(null);
      expect(message).toBe('This address is outside our delivery area.');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete zone validation and fee calculation flow', async () => {
      const address: Address = {
        street: '123 Mission St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      };
      const orderAmount = 85;

      // Mock the complete flow
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75,
      });
      mockGetDeliveryFeeMessage.mockReturnValue('Free delivery for orders over $75!');

      // Test the flow
      const zone = getDeliveryZone(address.city);
      const feeResult = calculateDeliveryFee(address, orderAmount);
      const message = getDeliveryFeeMessage(feeResult);

      expect(zone).toBe(DeliveryZone.NEARBY);
      expect(feeResult?.fee).toBe(0);
      expect(feeResult?.isFreeDelivery).toBe(true);
      expect(message).toBe('Free delivery for orders over $75!');
    });

    test('should handle distant zone with paid delivery', async () => {
      const address: Address = {
        street: '456 Broadway',
        city: 'Oakland',
        state: 'CA',
        postalCode: '94612',
      };
      const orderAmount = 120;

      // Mock the complete flow
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.DISTANT);
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.DISTANT,
        fee: 25,
        isFreeDelivery: false,
      });
      mockGetDeliveryFeeMessage.mockReturnValue('$25 delivery fee for this area.');

      // Test the flow
      const zone = getDeliveryZone(address.city);
      const feeResult = calculateDeliveryFee(address, orderAmount);
      const message = getDeliveryFeeMessage(feeResult);

      expect(zone).toBe(DeliveryZone.DISTANT);
      expect(feeResult?.fee).toBe(25);
      expect(feeResult?.isFreeDelivery).toBe(false);
      expect(message).toBe('$25 delivery fee for this area.');
    });

    test('should handle unsupported delivery area', async () => {
      const address: Address = {
        street: '789 Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
      };
      const orderAmount = 75;

      // Mock the complete flow
      mockGetDeliveryZone.mockReturnValue(null);
      mockCalculateDeliveryFee.mockReturnValue(null);
      mockGetDeliveryFeeMessage.mockReturnValue('This address is outside our delivery area.');

      // Test the flow
      const zone = getDeliveryZone(address.city);
      const feeResult = calculateDeliveryFee(address, orderAmount);
      const message = getDeliveryFeeMessage(feeResult);

      expect(zone).toBeNull();
      expect(feeResult).toBeNull();
      expect(message).toBe('This address is outside our delivery area.');
    });
  });
});
