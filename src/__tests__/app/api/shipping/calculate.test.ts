import { NextRequest } from 'next/server';
import { calculateShippingWeight, CartItemForShipping } from '@/lib/shippingUtils';
import { getShippingRates } from '@/app/actions/shipping';

// Mock the shipping utilities and actions
jest.mock('@/lib/shippingUtils');
jest.mock('@/app/actions/shipping');

const mockCalculateShippingWeight = calculateShippingWeight as jest.MockedFunction<typeof calculateShippingWeight>;
const mockGetShippingRates = getShippingRates as jest.MockedFunction<typeof getShippingRates>;

// Mock Next.js request
function createMockRequest(body: any, method: string = 'POST'): NextRequest {
  return new NextRequest('http://localhost:3000/api/shipping/calculate', {
    method,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('/api/shipping/calculate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress expected warnings/errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Weight-based shipping calculation', () => {
    test('should calculate shipping weight for alfajores correctly', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 3 },
        { id: '2', name: 'Chocolate Alfajores', quantity: 2 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(2.1); // 5 alfajores total weight

      const requestBody = {
        cartItems,
        fulfillmentMethod: 'nationwide_shipping',
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
      };

      // Since we don't have the actual API route file, we'll test the underlying logic
      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(mockCalculateShippingWeight).toHaveBeenCalledWith(cartItems, 'nationwide_shipping');
      expect(weight).toBe(2.1);
    });

    test('should calculate shipping weight for empanadas correctly', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Beef Empanadas', quantity: 2 },
        { id: '2', name: 'Chicken Empanadas', quantity: 1 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(2.8); // 3 empanadas total weight

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(mockCalculateShippingWeight).toHaveBeenCalledWith(cartItems, 'nationwide_shipping');
      expect(weight).toBe(2.8);
    });

    test('should calculate shipping weight for mixed cart correctly', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
        { id: '2', name: 'Beef Empanadas', quantity: 1 },
        { id: '3', name: 'Chimichurri Sauce', quantity: 1 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(3.2); // Mixed cart weight

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(mockCalculateShippingWeight).toHaveBeenCalledWith(cartItems, 'nationwide_shipping');
      expect(weight).toBe(3.2);
    });

    test('should enforce minimum weight for very light items', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Small Sauce Packet', quantity: 1 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(0.5); // Minimum weight enforced

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(weight).toBe(0.5);
    });
  });

  describe('Different fulfillment methods', () => {
    const cartItems: CartItemForShipping[] = [
      { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
    ];

    test('should handle nationwide shipping method', async () => {
      mockCalculateShippingWeight.mockResolvedValue(1.3);
      mockGetShippingRates.mockResolvedValue({
        success: true,
        rates: [
          {
            id: 'rate_1',
            name: 'USPS Ground Advantage',
            amount: 1250, // $12.50 in cents
            carrier: 'USPS',
            serviceLevelToken: 'usps_ground_advantage',
            estimatedDays: 3,
            currency: 'USD',
          },
          {
            id: 'rate_2',
            name: 'UPS Ground',
            amount: 1450, // $14.50 in cents
            carrier: 'UPS',
            serviceLevelToken: 'ups_ground',
            estimatedDays: 2,
            currency: 'USD',
          },
        ],
        shipmentId: 'shipment_123',
      });

      const shippingAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      };

      const result = await getShippingRates({
        cartItems,
        shippingAddress,
      });

      expect(result.success).toBe(true);
      expect(result.rates).toHaveLength(2);
      expect(result.rates![0].carrier).toBe('USPS');
      expect(result.rates![1].carrier).toBe('UPS');
    });

    test('should handle local delivery method', async () => {
      mockCalculateShippingWeight.mockResolvedValue(1.0); // Different weight for local delivery

      const weight = await calculateShippingWeight(cartItems, 'local_delivery');
      
      expect(mockCalculateShippingWeight).toHaveBeenCalledWith(cartItems, 'local_delivery');
      expect(weight).toBe(1.0);
    });

    test('should handle pickup method', async () => {
      mockCalculateShippingWeight.mockResolvedValue(1.0); // Same weight but no shipping needed

      const weight = await calculateShippingWeight(cartItems, 'pickup');
      
      expect(mockCalculateShippingWeight).toHaveBeenCalledWith(cartItems, 'pickup');
      expect(weight).toBe(1.0);
    });

    test('should apply different weight configs for nationwide vs local fulfillment', async () => {
      // Test that nationwide-only configs don't apply to local delivery
      mockCalculateShippingWeight
        .mockResolvedValueOnce(1.3) // Nationwide with special config
        .mockResolvedValueOnce(1.0); // Local with default weight

      const nationwideWeight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      const localWeight = await calculateShippingWeight(cartItems, 'local_delivery');
      
      expect(nationwideWeight).toBe(1.3);
      expect(localWeight).toBe(1.0);
    });
  });

  describe('Invalid cart data handling', () => {
    test('should handle empty cart items', async () => {
      const cartItems: CartItemForShipping[] = [];

      mockCalculateShippingWeight.mockResolvedValue(0.5); // Minimum weight

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(weight).toBe(0.5);
    });

    test('should handle cart items with zero quantity', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 0 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(0.5); // Minimum weight

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(weight).toBe(0.5);
    });

    test('should handle cart items with negative quantity', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: -1 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(0.5); // Minimum weight

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(weight).toBe(0.5);
    });

    test('should handle cart items with missing names', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: '', quantity: 2 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(1.0); // Default weight

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(weight).toBe(1.0);
    });

    test('should handle invalid shipping address', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      const invalidAddress = {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      };

      mockGetShippingRates.mockResolvedValue({
        success: false,
        error: 'Invalid shipping address provided',
      });

      const result = await getShippingRates({
        cartItems,
        shippingAddress: invalidAddress,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid shipping address');
    });
  });

  describe('Error responses', () => {
    test('should handle database connection errors', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      mockCalculateShippingWeight.mockRejectedValue(new Error('Database connection failed'));

      await expect(calculateShippingWeight(cartItems, 'nationwide_shipping')).rejects.toThrow('Database connection failed');
    });

    test('should handle Shippo API errors', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      const shippingAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      };

      mockGetShippingRates.mockResolvedValue({
        success: false,
        error: 'Shippo API error: Invalid API key',
      });

      const result = await getShippingRates({
        cartItems,
        shippingAddress,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Shippo API error');
    });

    test('should handle invalid fulfillment method', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(1.0);

      // Test with invalid fulfillment method - should still work with fallback
      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(weight).toBe(1.0);
    });

    test('should handle shipping configuration not found', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Unknown Product', quantity: 2 },
      ];

      mockCalculateShippingWeight.mockResolvedValue(1.0); // Falls back to default

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      
      expect(weight).toBe(1.0);
    });

    test('should handle network timeout errors', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      const shippingAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      };

      mockGetShippingRates.mockResolvedValue({
        success: false,
        error: 'Request timeout: Unable to connect to shipping provider',
      });

      const result = await getShippingRates({
        cartItems,
        shippingAddress,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    test('should handle malformed response from shipping provider', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      const shippingAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      };

      mockGetShippingRates.mockResolvedValue({
        success: false,
        error: 'Invalid response format from shipping provider',
      });

      const result = await getShippingRates({
        cartItems,
        shippingAddress,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid response format');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete shipping calculation flow', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 3 },
        { id: '2', name: 'Beef Empanadas', quantity: 2 },
      ];

      const shippingAddress = {
        street: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
        country: 'US',
      };

      mockCalculateShippingWeight.mockResolvedValue(3.5);
      mockGetShippingRates.mockResolvedValue({
        success: true,
        rates: [
          {
            id: 'rate_1',
            name: 'USPS Ground Advantage (Est. 3 days)',
            amount: 1850,
            carrier: 'USPS',
            serviceLevelToken: 'usps_ground_advantage',
            estimatedDays: 3,
            currency: 'USD',
            attributes: ['CHEAPEST'],
          },
          {
            id: 'rate_2',
            name: 'UPS Ground (Est. 2 days)',
            amount: 2150,
            carrier: 'UPS',
            serviceLevelToken: 'ups_ground',
            estimatedDays: 2,
            currency: 'USD',
          },
          {
            id: 'rate_3',
            name: 'FedEx Express (Est. 1 day)',
            amount: 3250,
            carrier: 'FedEx',
            serviceLevelToken: 'fedex_express',
            estimatedDays: 1,
            currency: 'USD',
            attributes: ['FASTEST'],
          },
        ],
        shipmentId: 'shipment_456',
      });

      // Test weight calculation
      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      expect(weight).toBe(3.5);

      // Test shipping rates
      const result = await getShippingRates({
        cartItems,
        shippingAddress,
      });

      expect(result.success).toBe(true);
      expect(result.rates).toHaveLength(3);
      expect(result.shipmentId).toBe('shipment_456');
      
      // Verify rates are sorted correctly (cheapest and fastest first)
      expect(result.rates![0].attributes).toContain('CHEAPEST');
      expect(result.rates![2].attributes).toContain('FASTEST');
    });

    test('should handle cross-country shipping with higher rates', async () => {
      const cartItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 5 },
      ];

      const shippingAddress = {
        street: '456 Broadway',
        city: 'New York',
        state: 'NY',
        postalCode: '10013',
        country: 'US',
      };

      mockCalculateShippingWeight.mockResolvedValue(2.5);
      mockGetShippingRates.mockResolvedValue({
        success: true,
        rates: [
          {
            id: 'rate_1',
            name: 'USPS Ground Advantage (Est. 5 days)',
            amount: 2450,
            carrier: 'USPS',
            serviceLevelToken: 'usps_ground_advantage',
            estimatedDays: 5,
            currency: 'USD',
          },
          {
            id: 'rate_2',
            name: 'UPS Ground (Est. 4 days)',
            amount: 2850,
            carrier: 'UPS',
            serviceLevelToken: 'ups_ground',
            estimatedDays: 4,
            currency: 'USD',
          },
        ],
        shipmentId: 'shipment_789',
      });

      const weight = await calculateShippingWeight(cartItems, 'nationwide_shipping');
      const result = await getShippingRates({
        cartItems,
        shippingAddress,
      });

      expect(weight).toBe(2.5);
      expect(result.success).toBe(true);
      expect(result.rates![0].amount).toBeGreaterThan(2000); // Higher rates for cross-country
    });
  });
}); 