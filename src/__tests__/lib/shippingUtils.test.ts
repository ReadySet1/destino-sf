import {
  calculateShippingWeight,
  getShippingWeightConfig,
  getShippingGlobalConfig,
  getAllShippingConfigurations,
  updateShippingConfiguration,
  CartItemForShipping,
  ShippingWeightConfig,
} from '@/lib/shippingUtils';

// Import our new test utilities
import { mockConsole, restoreConsole } from '@/__tests__/setup/test-utils';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock build-time detection (always false for tests)
jest.mock('@/lib/build-time-utils', () => ({
  isBuildTime: jest.fn(() => false),
}));

// Mock @/lib/db-unified
jest.mock('@/lib/db-unified', () => {
  return {
    prisma: {
      shippingConfiguration: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      shippingGlobalConfig: {
        findFirst: jest.fn(),
      },
    },
    withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
  };
});

// Import and cast after mock setup
import { prisma } from '@/lib/db-unified';
const mockPrisma = prisma as unknown as {
  shippingConfiguration: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    upsert: jest.Mock;
  };
  shippingGlobalConfig: {
    findFirst: jest.Mock;
  };
};

// Default global config returned when no DB config exists
const DEFAULT_GLOBAL_CONFIG = {
  packagingWeightLb: 1.5,
  minimumTotalWeightLb: 1.0,
  isActive: true,
};

describe('ShippingUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole();
    // Default: no global config in DB (uses defaults: packaging=1.5, min=1.0)
    mockPrisma.shippingGlobalConfig.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    restoreConsole();
  });

  describe('getProductType (tested through calculateShippingWeight)', () => {
    test('should detect alfajor products correctly', async () => {
      const alfajorItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 1 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: 0,
        weightPerUnitLb: 1.8,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      await calculateShippingWeight(alfajorItems, 'nationwide_shipping');

      expect(mockPrisma.shippingConfiguration.findFirst).toHaveBeenCalledWith({
        where: { productName: 'alfajores', isActive: true },
      });
    });

    test('should detect empanada products correctly', async () => {
      const empanadaItems: CartItemForShipping[] = [
        { id: '1', name: 'Beef Empanadas Pack', quantity: 1 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'empanadas',
        baseWeightLb: 0,
        weightPerUnitLb: 1.6,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      await calculateShippingWeight(empanadaItems, 'nationwide_shipping');

      expect(mockPrisma.shippingConfiguration.findFirst).toHaveBeenCalledWith({
        where: { productName: 'empanadas', isActive: true },
      });
    });

    test('should detect sauce products correctly', async () => {
      const sauceItems: CartItemForShipping[] = [
        { id: '1', name: 'Chimichurri Sauce', quantity: 2 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'sauces',
        baseWeightLb: 0,
        weightPerUnitLb: 0.9,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      await calculateShippingWeight(sauceItems, 'nationwide_shipping');

      expect(mockPrisma.shippingConfiguration.findFirst).toHaveBeenCalledWith({
        where: { productName: 'sauces', isActive: true },
      });
    });

    test('should use default for unrecognized products', async () => {
      const otherItems: CartItemForShipping[] = [
        { id: '1', name: 'Milanesa Sandwich', quantity: 3 },
      ];

      // No config for 'default' type
      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);

      const weight = await calculateShippingWeight(otherItems, 'nationwide_shipping');

      // 3 items × 0.5 lb/item (default) = 1.5 + 1.5 (packaging) = 3.0
      expect(weight).toBe(3.0);
    });
  });

  describe('calculateShippingWeight', () => {
    test('should calculate weight correctly for alfajores (flat per-unit)', async () => {
      const alfajorItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 3 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: 0,
        weightPerUnitLb: 1.8,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      const weight = await calculateShippingWeight(alfajorItems, 'nationwide_shipping');

      // 3 × 1.8 = 5.4 (products) + 1.5 (packaging) = 6.9
      expect(weight).toBe(6.9);
    });

    test('should calculate weight correctly for empanadas (flat per-unit)', async () => {
      const empanadaItems: CartItemForShipping[] = [
        { id: '1', name: 'Beef Empanadas', quantity: 2 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'empanadas',
        baseWeightLb: 0,
        weightPerUnitLb: 1.6,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      const weight = await calculateShippingWeight(empanadaItems, 'nationwide_shipping');

      // 2 × 1.6 = 3.2 (products) + 1.5 (packaging) = 4.7
      expect(weight).toBe(4.7);
    });

    test('should handle mixed cart calculations', async () => {
      const mixedItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
        { id: '2', name: 'Beef Empanadas', quantity: 1 },
      ];

      mockPrisma.shippingConfiguration.findFirst
        .mockResolvedValueOnce({
          productName: 'alfajores',
          baseWeightLb: 0,
          weightPerUnitLb: 1.8,
          isActive: true,
          applicableForNationwideOnly: true,
        })
        .mockResolvedValueOnce({
          productName: 'empanadas',
          baseWeightLb: 0,
          weightPerUnitLb: 1.6,
          isActive: true,
          applicableForNationwideOnly: true,
        });

      const weight = await calculateShippingWeight(mixedItems, 'nationwide_shipping');

      // Alfajores: 2 × 1.8 = 3.6
      // Empanadas: 1 × 1.6 = 1.6
      // Total: 5.2 + 1.5 (packaging) = 6.7
      expect(weight).toBe(6.7);
    });

    test('should enforce minimum total weight', async () => {
      const lightItems: CartItemForShipping[] = [{ id: '1', name: 'Small Item', quantity: 1 }];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);

      // Override global config with very high minimum
      mockPrisma.shippingGlobalConfig.findFirst.mockResolvedValue({
        id: 'test',
        packagingWeightLb: 0,
        minimumTotalWeightLb: 5.0,
        isActive: true,
      });

      const weight = await calculateShippingWeight(lightItems, 'nationwide_shipping');

      // 1 × 0.5 = 0.5 + 0 (packaging) = 0.5, but minimum is 5.0
      expect(weight).toBe(5.0);
    });

    test('should use default weight for nationwide-only configs with local delivery', async () => {
      const alfajorItems: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: 0,
        weightPerUnitLb: 1.8,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      const weight = await calculateShippingWeight(alfajorItems, 'local_delivery');

      // For local delivery with nationwide-only config: 2 × 0.5 (default) = 1.0 + 1.5 (packaging) = 2.5
      expect(weight).toBe(2.5);
    });

    test('should support legacy formula when baseWeightLb > 0', async () => {
      const items: CartItemForShipping[] = [
        { id: '1', name: 'Dulce de Leche Alfajores', quantity: 3 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'alfajores',
        baseWeightLb: 2.0,
        weightPerUnitLb: 0.5,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      const weight = await calculateShippingWeight(items, 'nationwide_shipping');

      // Legacy: base(2.0) + (3-1) × 0.5 = 2.0 + 1.0 = 3.0 + 1.5 (packaging) = 4.5
      expect(weight).toBe(4.5);
    });

    test('should include packaging weight from global config', async () => {
      const items: CartItemForShipping[] = [
        { id: '1', name: 'Beef Empanadas', quantity: 1 },
      ];

      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue({
        productName: 'empanadas',
        baseWeightLb: 0,
        weightPerUnitLb: 1.6,
        isActive: true,
        applicableForNationwideOnly: true,
      });

      // Custom packaging weight
      mockPrisma.shippingGlobalConfig.findFirst.mockResolvedValue({
        id: 'test',
        packagingWeightLb: 2.0,
        minimumTotalWeightLb: 1.0,
        isActive: true,
      });

      const weight = await calculateShippingWeight(items, 'nationwide_shipping');

      // 1 × 1.6 = 1.6 + 2.0 (packaging) = 3.6
      expect(weight).toBe(3.6);
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
    });

    test('should fallback to defaults when no database config exists', async () => {
      mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);

      const config = await getShippingWeightConfig('alfajores');

      expect(config).toEqual({
        productName: 'alfajores',
        baseWeightLb: 0,
        weightPerUnitLb: 1.8,
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
        baseWeightLb: 0,
        weightPerUnitLb: 1.8,
        isActive: true,
        applicableForNationwideOnly: true,
      });
    });
  });

  describe('getShippingGlobalConfig', () => {
    test('should retrieve database global config', async () => {
      mockPrisma.shippingGlobalConfig.findFirst.mockResolvedValue({
        id: 'test-id',
        packagingWeightLb: 2.0,
        minimumTotalWeightLb: 1.5,
        isActive: true,
      });

      const config = await getShippingGlobalConfig();

      expect(config).toEqual({
        id: 'test-id',
        packagingWeightLb: 2.0,
        minimumTotalWeightLb: 1.5,
        isActive: true,
      });
    });

    test('should return defaults when no database config exists', async () => {
      mockPrisma.shippingGlobalConfig.findFirst.mockResolvedValue(null);

      const config = await getShippingGlobalConfig();

      expect(config).toEqual({
        packagingWeightLb: 1.5,
        minimumTotalWeightLb: 1.0,
        isActive: true,
      });
    });

    test('should return defaults during build time', async () => {
      const { isBuildTime } = require('@/lib/build-time-utils');
      (isBuildTime as jest.Mock).mockReturnValueOnce(true);

      const config = await getShippingGlobalConfig();

      expect(config).toEqual({
        packagingWeightLb: 1.5,
        minimumTotalWeightLb: 1.0,
        isActive: true,
      });
      // Should not hit the database
      expect(mockPrisma.shippingGlobalConfig.findFirst).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.shippingGlobalConfig.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      const config = await getShippingGlobalConfig();

      expect(config).toEqual({
        packagingWeightLb: 1.5,
        minimumTotalWeightLb: 1.0,
        isActive: true,
      });
    });
  });

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

        expect(result).toEqual(mockUpdatedConfig);
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

        // Should include the DB config + empanadas + sauces defaults (alfajores overridden)
        expect(configs).toHaveLength(3);
        expect(configs.find(c => c.productName === 'alfajores')).toEqual({
          productName: 'alfajores',
          baseWeightLb: 0.7,
          weightPerUnitLb: 0.5,
          isActive: true,
          applicableForNationwideOnly: false,
        });
        expect(configs.find(c => c.productName === 'empanadas')).toEqual({
          productName: 'empanadas',
          baseWeightLb: 0,
          weightPerUnitLb: 1.6,
          isActive: true,
          applicableForNationwideOnly: true,
        });
        expect(configs.find(c => c.productName === 'sauces')).toEqual({
          productName: 'sauces',
          baseWeightLb: 0,
          weightPerUnitLb: 0.9,
          isActive: true,
          applicableForNationwideOnly: true,
        });
      });

      test('should return only defaults when database is empty', async () => {
        mockPrisma.shippingConfiguration.findMany.mockResolvedValue([]);

        const configs = await getAllShippingConfigurations();

        expect(configs).toHaveLength(3);
        expect(configs.map(c => c.productName).sort()).toEqual(['alfajores', 'empanadas', 'sauces']);
      });

      test('should return defaults during build time', async () => {
        const { isBuildTime } = require('@/lib/build-time-utils');
        (isBuildTime as jest.Mock).mockReturnValueOnce(true);

        const configs = await getAllShippingConfigurations();

        expect(configs).toHaveLength(3);
        // Should not hit the database
        expect(mockPrisma.shippingConfiguration.findMany).not.toHaveBeenCalled();
      });

      test('should handle database errors gracefully', async () => {
        mockPrisma.shippingConfiguration.findMany.mockRejectedValue(
          new Error('Database connection failed')
        );

        const configs = await getAllShippingConfigurations();

        // Should return only default configurations
        expect(configs).toHaveLength(3);
        expect(configs.map(c => c.productName).sort()).toEqual(['alfajores', 'empanadas', 'sauces']);
      });
    });
  });
});
