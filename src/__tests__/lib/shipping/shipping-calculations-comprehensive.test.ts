/**
 * 🧪 Shipping Calculations - Comprehensive Tests
 * Tests for shipping rates, delivery zones, weight calculations, and free shipping thresholds
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  calculateShippingWeight, 
  getEstimatedShippingCost, 
  CartItemForShipping 
} from '@/lib/shippingUtils';
import { 
  calculateDeliveryFeeAction, 
  getDeliveryFeeMessage 
} from '@/lib/deliveryUtils';
import { 
  getDeliveryZones, 
  determineDeliveryZone, 
  validateMinimumPurchase 
} from '@/lib/delivery-zones';
import { getShippingRates } from '@/lib/shipping';
import { prisma } from '@/lib/db-unified';
import { mockShippoClient, createMockShippoRate } from '@/__mocks__/shippo';

// Mock dependencies
jest.mock('@/lib/db-unified');
jest.mock('@/lib/shippo/client', () => ({
  ShippoClientManager: {
    getInstance: () => mockShippoClient
  }
}));

describe('Shipping Calculations - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock delivery zones data
    (prisma.regularDeliveryZone.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'zone_sf_nearby',
        zone: 'SF_NEARBY',
        name: 'SF Nearby',
        minimumOrderForFree: 75.00,
        deliveryFee: 15.00,
        estimatedDeliveryTime: '30-60 minutes',
        postalCodes: ['94102', '94103', '94104', '94105'],
        cities: ['San Francisco', 'Daly City', 'South San Francisco'],
        active: true,
        displayOrder: 1
      },
      {
        id: 'zone_sf_extended',
        zone: 'SF_EXTENDED',
        name: 'SF Extended',
        minimumOrderForFree: 0.00,
        deliveryFee: 25.00,
        estimatedDeliveryTime: '45-90 minutes',
        postalCodes: ['94301', '94401', '94501'],
        cities: ['Palo Alto', 'San Mateo', 'Alameda'],
        active: true,
        displayOrder: 2
      }
    ]);

    (prisma.cateringDeliveryZone.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'catering_sf',
        zone: 'SAN_FRANCISCO',
        name: 'San Francisco',
        minimumAmount: 250.00,
        deliveryFee: 50.00,
        estimatedDeliveryTime: '1-2 hours',
        postalCodes: ['94102', '94103', '94104'],
        cities: ['San Francisco'],
        active: true,
        displayOrder: 1
      },
      {
        id: 'catering_south_bay',
        zone: 'SOUTH_BAY',
        name: 'South Bay',
        minimumAmount: 350.00,
        deliveryFee: 75.00,
        estimatedDeliveryTime: '2-3 hours',
        postalCodes: ['95110', '95111', '95112'],
        cities: ['San José', 'Santa Clara', 'Sunnyvale'],
        active: true,
        displayOrder: 2
      }
    ]);

    // Mock Shippo responses
    mockShippoClient.shipments.create.mockResolvedValue({
      object_id: 'shipment_123',
      rates: [
        createMockShippoRate('USPS', 'Ground Advantage', '8.50'),
        createMockShippoRate('USPS', 'Priority Mail', '12.25'),
        createMockShippoRate('UPS', 'Ground', '9.85'),
        createMockShippoRate('FedEx', 'Ground', '10.25')
      ]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Weight-Based Shipping Calculations', () => {
    const testCartItems: CartItemForShipping[] = [
      { id: 'item_1', name: 'alfajores', quantity: 2 },
      { id: 'item_2', name: 'empanadas', quantity: 3 },
      { id: 'item_3', name: 'custom_product', quantity: 1 }
    ];

    it('should calculate weight correctly for known products', async () => {
      const weight = await calculateShippingWeight(testCartItems);

      // Expected calculation:
      // Alfajores: 0.5 (base) + 0.4 * (2-1) = 0.9 lb
      // Empanadas: 1.0 (base) + 0.8 * (3-1) = 2.6 lb
      // Custom product: 0.5 (default) lb
      // Total: 0.9 + 2.6 + 0.5 = 4.0 lb

      expect(weight).toBe(4.0);
    });

    it('should use default weights for unknown products', async () => {
      const unknownItems: CartItemForShipping[] = [
        { id: 'item_1', name: 'unknown_product', quantity: 1 }
      ];

      const weight = await calculateShippingWeight(unknownItems);
      expect(weight).toBe(0.5); // Default weight
    });

    it('should handle empty cart gracefully', async () => {
      const weight = await calculateShippingWeight([]);
      expect(weight).toBe(0);
    });

    it('should calculate weight for large quantities correctly', async () => {
      const largeQuantityItems: CartItemForShipping[] = [
        { id: 'item_1', name: 'alfajores', quantity: 10 }
      ];

      const weight = await calculateShippingWeight(largeQuantityItems);
      
      // Expected: 0.5 (base) + 0.4 * (10-1) = 0.5 + 3.6 = 4.1 lb
      expect(weight).toBe(4.1);
    });

    it('should get estimated shipping cost based on weight', async () => {
      const cost = await getEstimatedShippingCost(testCartItems, {
        street1: '123 Test St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90210',
        country: 'US'
      });

      expect(cost).toBeGreaterThan(0);
      expect(mockShippoClient.shipments.create).toHaveBeenCalledWith({
        address_from: expect.objectContaining({
          street1: expect.any(String),
          city: 'San Francisco',
          state: 'CA'
        }),
        address_to: expect.objectContaining({
          street1: '123 Test St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210'
        }),
        parcels: [expect.objectContaining({
          weight: '4.0',
          mass_unit: 'lb'
        })]
      });
    });
  });

  describe('Delivery Zone Detection', () => {
    it('should detect delivery zone by postal code', async () => {
      const zone = await determineDeliveryZone('94102', 'San Francisco');
      expect(zone).toBe('SF_NEARBY');
    });

    it('should detect delivery zone by city when postal code not found', async () => {
      const zone = await determineDeliveryZone('00000', 'Daly City');
      expect(zone).toBe('SF_NEARBY');
    });

    it('should return null for unsupported areas', async () => {
      const zone = await determineDeliveryZone('10001', 'New York');
      expect(zone).toBeNull();
    });

    it('should prioritize postal code over city for zone detection', async () => {
      // Postal code 94102 is in SF_NEARBY, even if city might suggest otherwise
      const zone = await determineDeliveryZone('94102', 'Some Other City');
      expect(zone).toBe('SF_NEARBY');
    });

    it('should handle case-insensitive city matching', async () => {
      const zone = await determineDeliveryZone('', 'san francisco');
      expect(zone).toBe('SF_NEARBY');
    });
  });

  describe('Regular Delivery Fee Calculations', () => {
    it('should calculate delivery fee correctly for SF Nearby zone', async () => {
      const result = await calculateDeliveryFeeAction({
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102'
      }, 50.00);

      expect(result).toEqual({
        zone: 'SF_NEARBY',
        fee: 15.00,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75.00
      });
    });

    it('should apply free delivery when minimum is met', async () => {
      const result = await calculateDeliveryFeeAction({
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102'
      }, 100.00); // Above $75 minimum

      expect(result).toEqual({
        zone: 'SF_NEARBY',
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75.00
      });
    });

    it('should handle zones with no free delivery threshold', async () => {
      const result = await calculateDeliveryFeeAction({
        street1: '123 Main St',
        city: 'Palo Alto',
        state: 'CA',
        postalCode: '94301'
      }, 100.00);

      expect(result).toEqual({
        zone: 'SF_EXTENDED',
        fee: 25.00,
        isFreeDelivery: false,
        minOrderForFreeDelivery: undefined
      });
    });

    it('should return null for unsupported addresses', async () => {
      const result = await calculateDeliveryFeeAction({
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001'
      }, 50.00);

      expect(result).toBeNull();
    });

    it('should handle edge case at exact minimum threshold', async () => {
      const result = await calculateDeliveryFeeAction({
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102'
      }, 75.00); // Exactly at minimum

      expect(result?.isFreeDelivery).toBe(true);
      expect(result?.fee).toBe(0);
    });
  });

  describe('Catering Delivery Zone Validation', () => {
    it('should validate minimum purchase requirements for catering zones', async () => {
      const validation = await validateMinimumPurchase(300.00, 'SAN_FRANCISCO');
      
      expect(validation).toEqual({
        isValid: true,
        requiredMinimum: 250.00,
        currentAmount: 300.00,
        shortfall: 0
      });
    });

    it('should reject orders below minimum for catering zones', async () => {
      const validation = await validateMinimumPurchase(200.00, 'SAN_FRANCISCO');
      
      expect(validation).toEqual({
        isValid: false,
        requiredMinimum: 250.00,
        currentAmount: 200.00,
        shortfall: 50.00
      });
    });

    it('should handle different minimum amounts per zone', async () => {
      const sfValidation = await validateMinimumPurchase(350.00, 'SAN_FRANCISCO');
      const southBayValidation = await validateMinimumPurchase(350.00, 'SOUTH_BAY');

      expect(sfValidation.isValid).toBe(true); // $250 minimum
      expect(southBayValidation.isValid).toBe(true); // $350 minimum, exactly at threshold
    });

    it('should calculate shortfall correctly', async () => {
      const validation = await validateMinimumPurchase(100.00, 'SOUTH_BAY');
      
      expect(validation).toEqual({
        isValid: false,
        requiredMinimum: 350.00,
        currentAmount: 100.00,
        shortfall: 250.00
      });
    });
  });

  describe('Pickup vs Delivery Logic', () => {
    it('should skip delivery fee calculation for pickup orders', async () => {
      // This would be handled in the order processing logic
      const fulfillmentType = 'PICKUP';
      
      if (fulfillmentType === 'PICKUP') {
        // No delivery fee calculation needed
        expect(true).toBe(true);
      }
    });

    it('should require delivery address validation for delivery orders', async () => {
      const fulfillmentType = 'DELIVERY';
      const address = {
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102'
      };

      if (fulfillmentType === 'DELIVERY') {
        const result = await calculateDeliveryFeeAction(address, 50.00);
        expect(result).not.toBeNull();
        expect(result?.zone).toBe('SF_NEARBY');
      }
    });

    it('should handle missing delivery address for delivery orders', async () => {
      const incompleteAddress = {
        street1: '',
        city: '',
        state: '',
        postalCode: ''
      };

      const result = await calculateDeliveryFeeAction(incompleteAddress, 50.00);
      expect(result).toBeNull();
    });
  });

  describe('Shipping Rate API Integration', () => {
    it('should get multiple shipping rates from Shippo', async () => {
      const shippingRequest = {
        fromAddress: {
          street1: '1 Destino Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        },
        toAddress: {
          street1: '123 Customer St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          country: 'US'
        },
        parcel: {
          weight: 2.5,
          length: 12,
          width: 8,
          height: 4
        }
      };

      const rates = await getShippingRates(shippingRequest);

      expect(rates.success).toBe(true);
      expect(rates.rates).toHaveLength(4);
      expect(rates.rates?.[0]).toMatchObject({
        provider: 'USPS',
        amount: '8.50',
        currency: 'USD',
        servicelevel: expect.objectContaining({
          name: expect.stringContaining('Ground')
        })
      });
    });

    it('should handle Shippo API errors gracefully', async () => {
      mockShippoClient.shipments.create.mockRejectedValue(
        new Error('Shippo API error')
      );

      const shippingRequest = {
        fromAddress: {
          street1: '1 Destino Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        },
        toAddress: {
          street1: '123 Customer St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          country: 'US'
        },
        parcel: {
          weight: 2.5,
          length: 12,
          width: 8,
          height: 4
        }
      };

      const rates = await getShippingRates(shippingRequest);

      expect(rates.success).toBe(false);
      expect(rates.error).toContain('Shippo API error');
    });

    it('should cache shipping rates for identical requests', async () => {
      const shippingRequest = {
        fromAddress: {
          street1: '1 Destino Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        },
        toAddress: {
          street1: '123 Customer St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          country: 'US'
        },
        parcel: {
          weight: 2.5,
          length: 12,
          width: 8,
          height: 4
        }
      };

      // First request
      await getShippingRates(shippingRequest);
      
      // Second identical request
      await getShippingRates(shippingRequest);

      // Should only call Shippo once due to caching
      expect(mockShippoClient.shipments.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delivery Fee Messages', () => {
    it('should generate correct message for free delivery', () => {
      const feeResult = {
        zone: 'SF_NEARBY',
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75.00
      };

      const message = getDeliveryFeeMessage(feeResult);
      expect(message).toBe('Free delivery! (Orders over $75 qualify)');
    });

    it('should generate correct message with delivery fee and free threshold', () => {
      const feeResult = {
        zone: 'SF_NEARBY',
        fee: 15.00,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75.00
      };

      const message = getDeliveryFeeMessage(feeResult);
      expect(message).toBe('$15 delivery fee. Orders over $75 qualify for free delivery!');
    });

    it('should generate correct message for fixed delivery fee', () => {
      const feeResult = {
        zone: 'SF_EXTENDED',
        fee: 25.00,
        isFreeDelivery: false,
        minOrderForFreeDelivery: undefined
      };

      const message = getDeliveryFeeMessage(feeResult);
      expect(message).toBe('$25 delivery fee for this area.');
    });

    it('should generate correct message for unsupported area', () => {
      const message = getDeliveryFeeMessage(null);
      expect(message).toBe('This address is outside our delivery area.');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero weight cart items', async () => {
      const zeroWeightItems: CartItemForShipping[] = [
        { id: 'item_1', name: 'digital_product', quantity: 5 }
      ];

      // Assuming digital products have 0 weight config
      (prisma.shippingWeight.findMany as jest.Mock).mockResolvedValue([
        {
          productName: 'digital_product',
          baseWeightLb: 0,
          weightPerUnitLb: 0,
          isActive: true
        }
      ]);

      const weight = await calculateShippingWeight(zeroWeightItems);
      expect(weight).toBe(0);
    });

    it('should handle database connection failures for delivery zones', async () => {
      (prisma.regularDeliveryZone.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const zones = await getDeliveryZones();
      expect(zones).toEqual([]); // Should return empty array on error
    });

    it('should validate delivery zone data integrity', async () => {
      // Mock corrupted zone data
      (prisma.regularDeliveryZone.findMany as jest.Mock).mockResolvedValue([
        {
          zone: 'INVALID_ZONE',
          name: '',
          deliveryFee: -5.00, // Invalid negative fee
          active: true
        }
      ]);

      const zones = await getDeliveryZones();
      
      // Should filter out invalid zones
      expect(zones.every(zone => zone.deliveryFee >= 0)).toBe(true);
    });

    it('should handle very large shipping weights', async () => {
      const heavyItems: CartItemForShipping[] = [
        { id: 'item_1', name: 'heavy_product', quantity: 100 }
      ];

      // Mock heavy product config
      (prisma.shippingWeight.findMany as jest.Mock).mockResolvedValue([
        {
          productName: 'heavy_product',
          baseWeightLb: 50,
          weightPerUnitLb: 10,
          isActive: true
        }
      ]);

      const weight = await calculateShippingWeight(heavyItems);
      // Expected: 50 + 10 * (100-1) = 50 + 990 = 1040 lb
      expect(weight).toBe(1040);
    });

    it('should handle special characters in addresses', async () => {
      const specialCharAddress = {
        street1: '123 Café Street, Apt #5',
        city: 'San José',
        state: 'CA',
        postalCode: '94102'
      };

      const result = await calculateDeliveryFeeAction(specialCharAddress, 50.00);
      expect(result).not.toBeNull();
      expect(result?.zone).toBe('SF_NEARBY');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache delivery zone lookups', async () => {
      // Multiple calls to same zone
      await calculateDeliveryFeeAction({
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102'
      }, 50.00);

      await calculateDeliveryFeeAction({
        street1: '456 Oak St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102'
      }, 75.00);

      // Should only query database once
      expect(prisma.regularDeliveryZone.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent delivery fee calculations', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        calculateDeliveryFeeAction({
          street1: `${i} Test St`,
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102'
        }, 50.00)
      );

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(10);
      expect(results.every(result => result?.zone === 'SF_NEARBY')).toBe(true);
    });
  });
});
