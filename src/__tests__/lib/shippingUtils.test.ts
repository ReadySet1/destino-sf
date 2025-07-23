import {
  calculateShippingWeight,
  getShippingWeightConfig,
  getAllShippingConfigurations,
  updateShippingConfiguration,
  CartItemForShipping,
  ShippingWeightConfig,
} from '@/lib/shippingUtils';
import { prisma } from '@/lib/db';

// Import our new test utilities
import { mockConsole, restoreConsole } from '@/__tests__/setup/test-utils';

// Note: @/lib/db is mocked globally in jest.setup.js
// Cast the prisma object to access jest mock functions
const mockPrisma = prisma as any;

describe('ShippingUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole(); // Use utility for console mocking
  });

  afterEach(() => {
    restoreConsole(); // Use utility for cleanup
  });

  // Unit Tests for getProductType (internal function - testing through calculateShippingWeight)
  describe('getProductType (internal function)', () => {
    test('should detect alfajor products correctly', async () => {
      const alfajorItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 1 },
        { id: '2', name: 'Chocolate ALFAJOR Box', quantity: 2 },
        { id: '3', name: 'Traditional alfajor pack', quantity: 1 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: '0.5',
        weightPerUnitLb: '0.4',
        isActive: true,
        applicableForNationwideOnly: true,
      });

      await calculateShippingWeight(alfajorItems, 'nationwide_shipping');

      // Verify that alfajor configuration was requested for all items
      expect(mockPrisma.shippingConfiguration.findFirst).toHaveBeenCalledWith({
        where: { productName: 'alfajores', isActive: true },
      });
    });

    test('should detect empanada products correctly', async () => {
      const empanadaItems: CartItemForShipping[] = [
        { id: '1', name: 'Beef Empanadas Pack', quantity: 1 },
        { id: '2', name: 'Chicken EMPANADA Box', quantity: 2 },
        { id: '3', name: 'Traditional empanada mix', quantity: 1 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'empanadas',
        baseWeightLb: 1.0,
        weightPerUnitLb: 0.8,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      await calculateShippingWeight(empanadaItems, 'nationwide_shipping');

      expect(mockPrisma.shippingConfiguration.findFirst).toHaveBeenCalledWith({
        where: { productName: 'empanadas', isActive: true },
      });
    });

    test('should use default fallback for unrecognized products', async () => {
      const otherItems: CartItemForShipping[] = [
        { id: '1', name: 'Milanesa Sandwich', quantity: 1 },
        { id: '2', name: 'Chimichurri Sauce', quantity: 2 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);

      const weight = await calculateShippingWeight(otherItems, 'nationwide_shipping');

      expect(mockPrisma.shippingConfiguration.findFirst).toHaveBeenCalledWith({
        where: { productName: 'default', isActive: true },
      });
      // Should use default weight: 3 items * 0.5 lb = 1.5 lb
      expect(weight).toBe(1.5);
    });
  });

  describe('calculateShippingWeight', () => {
    test('should calculate weight correctly for alfajores', async () => {
      const alfajorItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 3 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      const weight = await calculateShippingWeight(alfajorItems, 'nationwide_shipping');

      // Base weight (0.5) + 2 additional units (2 * 0.4) = 1.3 lb
      expect(weight).toBe(1.3);
    });

    test('should calculate weight correctly for empanadas', async () => {
      const empanadaItems: CartItemForShipping[] = [
        { id: '1', name: 'Beef Empanadas', quantity: 2 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'empanadas',
        baseWeightLb: 1.0,
        weightPerUnitLb: 0.8,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      const weight = await calculateShippingWeight(empanadaItems, 'nationwide_shipping');

      // Base weight (1.0) + 1 additional unit (1 * 0.8) = 1.8 lb
      expect(weight).toBe(1.8);
    });

    test('should handle mixed cart calculations', async () => {
      const mixedItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
        { id: '2', name: 'Beef Empanadas', quantity: 1 },
      ];

      mockPrisma.shippingConfiguration.findFirst
        .mockResolvedValueOnce({
          productName: 'alfajores',
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        })
        .mockResolvedValueOnce({
          productName: 'empanadas',
          baseWeightLb: 1.0,
          weightPerUnitLb: 0.8,
          isActive: true,
          applicableForNationwideOnly: true,
        });

      const weight = await calculateShippingWeight(mixedItems, 'nationwide_shipping');

      // Alfajores: 0.5 + (1 * 0.4) = 0.9
      // Empanadas: 1.0 + (0 * 0.8) = 1.0
      // Total: 1.9 lb
      expect(weight).toBe(1.9);
    });

    test('should enforce minimum weight', async () => {
      const lightItems: CartItemForShipping[] = [{ id: '1', name: 'Small Item', quantity: 1 }];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);

      const weight = await calculateShippingWeight(lightItems, 'nationwide_shipping');

      // Even if calculated weight is less than 0.5 lb, should return minimum 0.5 lb
      expect(weight).toBe(0.5);
    });

    test('should handle fulfillment method impact for nationwide-only configs', async () => {
      const alfajorItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      // For local delivery, should use default weight instead of configured weight
      const weight = await calculateShippingWeight(alfajorItems, 'local_delivery');

      // 2 items * 0.5 lb (default weight) = 1.0 lb
      expect(weight).toBe(1.0);
    });

    test('should use configured weight for nationwide shipping even with applicableForNationwideOnly', async () => {
      const alfajorItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      const weight = await calculateShippingWeight(alfajorItems, 'nationwide_shipping');

      // Base weight (0.5) + 1 additional unit (1 * 0.4) = 0.9 lb
      expect(weight).toBe(0.9);
    });
  });

  describe('getShippingWeightConfig', () => {
    test('should retrieve database configuration successfully', async () => {
      const mockDbConfig = {
        productName: 'alfajores',
        baseWeightLb: 0.6,
        weightPerUnitLb: 0.5,
        isActive: true,
        applicableForNationwideOnly: false,
      };

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(mockDbConfig);

      const config = await getShippingWeightConfig('alfajores');

      expect(config).toEqual({
        productName: 'alfajores',
        baseWeightLb: 0.6,
        weightPerUnitLb: 0.5,
        isActive: true,
        applicableForNationwideOnly: false,
      });
      expect(mockPrisma.shippingConfiguration.findFirst).toHaveBeenCalledWith({
        where: { productName: 'alfajores', isActive: true },
      });
    });

    test('should fallback to defaults when no database config exists', async () => {
      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);

      const config = await getShippingWeightConfig('alfajores');

      expect(config).toEqual({
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      });
    });

    test('should return null for unknown product types', async () => {
      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);

      const config = await getShippingWeightConfig('unknown');

      expect(config).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.shippingConfiguration.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      const config = await getShippingWeightConfig('alfajores');

      // Should fallback to default configuration
      expect(config).toEqual({
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching shipping weight config:',
        expect.any(Error)
      );
    });
  });

  // Integration Tests
  describe('Admin Configuration Management', () => {
    describe('updateShippingConfiguration', () => {
      test('should update existing configuration successfully', async () => {
        const mockUpdatedConfig = {
          productName: 'alfajores',
          baseWeightLb: 0.7,
          weightPerUnitLb: 0.6,
          isActive: true,
          applicableForNationwideOnly: false,
        };

        mockPrisma.shippingConfiguration.upsert.mockResolvedValue(mockUpdatedConfig);

        const result = await updateShippingConfiguration('alfajores', {
          baseWeightLb: 0.7,
          weightPerUnitLb: 0.6,
          isActive: true,
          applicableForNationwideOnly: false,
        });

        expect(result).toEqual({
          productName: 'alfajores',
          baseWeightLb: 0.7,
          weightPerUnitLb: 0.6,
          isActive: true,
          applicableForNationwideOnly: false,
        });
        expect(mockPrisma.shippingConfiguration.upsert).toHaveBeenCalledWith({
          where: { productName: 'alfajores' },
          create: {
            productName: 'alfajores',
            baseWeightLb: 0.7,
            weightPerUnitLb: 0.6,
            isActive: true,
            applicableForNationwideOnly: false,
          },
          update: {
            baseWeightLb: 0.7,
            weightPerUnitLb: 0.6,
            isActive: true,
            applicableForNationwideOnly: false,
          },
        });
      });

      test('should create new configuration when none exists', async () => {
        const mockNewConfig = {
          productName: 'newproduct',
          baseWeightLb: 1.5,
          weightPerUnitLb: 1.0,
          isActive: true,
          applicableForNationwideOnly: true,
        };

        mockPrisma.shippingConfiguration.upsert.mockResolvedValue(mockNewConfig);

        const result = await updateShippingConfiguration('newproduct', {
          baseWeightLb: 1.5,
          weightPerUnitLb: 1.0,
          isActive: true,
          applicableForNationwideOnly: true,
        });

        expect(result).toEqual({
          productName: 'newproduct',
          baseWeightLb: 1.5,
          weightPerUnitLb: 1.0,
          isActive: true,
          applicableForNationwideOnly: true,
        });
      });
    });

    describe('getAllShippingConfigurations', () => {
      test('should return all configurations from database plus defaults', async () => {
        const mockDbConfigs = [
          {
            productName: 'alfajores',
            baseWeightLb: 0.7,
            weightPerUnitLb: 0.5,
            isActive: true,
            applicableForNationwideOnly: false,
          },
        ];

        mockPrisma.shippingConfiguration.findMany.mockResolvedValue(mockDbConfigs);

        const configs = await getAllShippingConfigurations();

        // Should include the DB config + empanadas default (alfajores is overridden)
        expect(configs).toHaveLength(2);
        expect(configs.find(c => c.productName === 'alfajores')).toEqual({
          productName: 'alfajores',
          baseWeightLb: 0.7,
          weightPerUnitLb: 0.5,
          isActive: true,
          applicableForNationwideOnly: false,
        });
        expect(configs.find(c => c.productName === 'empanadas')).toEqual({
          productName: 'empanadas',
          baseWeightLb: 1.0,
          weightPerUnitLb: 0.8,
          isActive: true,
          applicableForNationwideOnly: true,
        });
      });

      test('should return only defaults when database is empty', async () => {
        mockPrisma.shippingConfiguration.findMany.mockResolvedValue([]);

        const configs = await getAllShippingConfigurations();

        expect(configs).toHaveLength(2);
        expect(configs).toEqual([
          {
            productName: 'alfajores',
            baseWeightLb: 0.5,
            weightPerUnitLb: 0.4,
            isActive: true,
            applicableForNationwideOnly: true,
          },
          {
            productName: 'empanadas',
            baseWeightLb: 1.0,
            weightPerUnitLb: 0.8,
            isActive: true,
            applicableForNationwideOnly: true,
          },
        ]);
      });

      test('should handle database errors gracefully', async () => {
        mockPrisma.shippingConfiguration.findMany.mockRejectedValue(
          new Error('Database connection failed')
        );

        const configs = await getAllShippingConfigurations();

        // Should return only default configurations
        expect(configs).toEqual([
          {
            productName: 'alfajores',
            baseWeightLb: 0.5,
            weightPerUnitLb: 0.4,
            isActive: true,
            applicableForNationwideOnly: true,
          },
          {
            productName: 'empanadas',
            baseWeightLb: 1.0,
            weightPerUnitLb: 0.8,
            isActive: true,
            applicableForNationwideOnly: true,
          },
        ]);
        expect(console.error).toHaveBeenCalledWith(
          'Error fetching shipping configurations:',
          expect.any(Error)
        );
      });
    });
  });
});
