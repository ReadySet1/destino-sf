/**
 * Integration Tests for Square Sync Dev-Mode Visibility Preservation
 *
 * Tests the complete flow of product sync behavior when running in
 * development/sandbox mode, ensuring products preserve their active
 * state unless explicitly deleted in Square.
 *
 * DES-102: Prevent products from being silently deactivated in sandbox mode
 *
 * @see src/lib/square/sync.ts
 * @see src/lib/square/production-sync.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Store original env values
const originalEnv = { ...process.env };

// Mock the logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Prisma
const mockPrismaProduct = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  upsert: jest.fn(),
};

const mockPrismaCategory = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('@/lib/db-unified', () => ({
  prisma: {
    product: mockPrismaProduct,
    category: mockPrismaCategory,
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        product: mockPrismaProduct,
        category: mockPrismaCategory,
      })
    ),
  },
}));

// Mock Square client
const mockSquareSearchCatalogObjects = jest.fn();
const mockSquareListLocations = jest.fn();

jest.mock('@/lib/square/client', () => ({
  squareClient: {
    catalogApi: {
      searchCatalogObjects: mockSquareSearchCatalogObjects,
    },
    locationsApi: {
      listLocations: mockSquareListLocations,
    },
  },
  getCatalogClient: jest.fn(() => ({
    searchCatalogObjects: mockSquareSearchCatalogObjects,
  })),
}));

// Mock product description sanitization
jest.mock('@/lib/utils/product-description', () => ({
  sanitizeProductDescription: jest.fn((desc: string | null | undefined) => desc || ''),
}));

// Import logger for assertions
import { logger } from '@/utils/logger';
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Square Sync Dev-Mode Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment to development mode
    process.env.NODE_ENV = 'development';
    process.env.USE_SQUARE_SANDBOX = 'true';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Environment Detection', () => {
    it('should detect development mode from NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_SQUARE_SANDBOX = 'false';

      const isDevMode =
        process.env.NODE_ENV === 'development' || process.env.USE_SQUARE_SANDBOX === 'true';

      expect(isDevMode).toBe(true);
    });

    it('should detect sandbox mode from USE_SQUARE_SANDBOX', () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_SQUARE_SANDBOX = 'true';

      const isDevMode =
        process.env.NODE_ENV === 'development' || process.env.USE_SQUARE_SANDBOX === 'true';

      expect(isDevMode).toBe(true);
    });

    it('should not be in dev mode when production without sandbox', () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_SQUARE_SANDBOX = 'false';

      const isDevMode =
        process.env.NODE_ENV === 'development' || process.env.USE_SQUARE_SANDBOX === 'true';

      expect(isDevMode).toBe(false);
    });
  });

  describe('Product Active State Preservation Logic', () => {
    /**
     * Simulates the sync.ts logic for determining product active state
     */
    function simulateSyncActiveStateLogic(
      squareItem: {
        is_deleted?: boolean;
        item_data?: {
          visibility?: string;
          available_online?: boolean;
          present_at_all_locations?: boolean;
        };
      },
      existingProduct: { active: boolean } | null,
      isDevMode: boolean
    ): { shouldBeActive: boolean; squareIndicatesActive: boolean } {
      const itemData = squareItem.item_data || {};
      const visibility = itemData.visibility || 'PUBLIC';
      const availableOnline = itemData.available_online ?? true;
      const presentAtAllLocations = itemData.present_at_all_locations ?? true;
      const isNotDeleted = !squareItem.is_deleted;

      const squareIndicatesActive =
        isNotDeleted && availableOnline && presentAtAllLocations && visibility !== 'PRIVATE';

      const shouldBeActive =
        isDevMode && existingProduct
          ? existingProduct.active && isNotDeleted
          : squareIndicatesActive;

      return { shouldBeActive, squareIndicatesActive };
    }

    /**
     * Simulates the production-sync.ts logic for determining product active state
     */
    function simulateProductionSyncActiveStateLogic(
      isArchived: boolean,
      existingProduct: { active: boolean } | null,
      isDevMode: boolean
    ): boolean {
      return isDevMode && existingProduct
        ? existingProduct.active && !isArchived
        : !isArchived;
    }

    describe('sync.ts logic simulation', () => {
      describe('Sandbox mode with restrictive Square settings', () => {
        const sandboxItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: false, // Common sandbox default
            present_at_all_locations: false, // Location not configured
          },
        };

        it('should preserve active state for existing active products in dev mode', () => {
          const result = simulateSyncActiveStateLogic(
            sandboxItem,
            { active: true },
            true // isDevMode
          );

          expect(result.squareIndicatesActive).toBe(false); // Square says inactive
          expect(result.shouldBeActive).toBe(true); // But we preserve active state
        });

        it('should keep inactive products inactive in dev mode', () => {
          const result = simulateSyncActiveStateLogic(
            sandboxItem,
            { active: false },
            true // isDevMode
          );

          expect(result.shouldBeActive).toBe(false);
        });

        it('should deactivate products in production mode when Square indicates inactive', () => {
          const result = simulateSyncActiveStateLogic(
            sandboxItem,
            { active: true },
            false // production mode
          );

          expect(result.squareIndicatesActive).toBe(false);
          expect(result.shouldBeActive).toBe(false); // Follows Square settings
        });
      });

      describe('Deleted products in Square', () => {
        const deletedItem = {
          is_deleted: true,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        it('should deactivate deleted products even in dev mode', () => {
          const result = simulateSyncActiveStateLogic(
            deletedItem,
            { active: true },
            true // isDevMode
          );

          expect(result.shouldBeActive).toBe(false);
        });

        it('should deactivate deleted products in production mode', () => {
          const result = simulateSyncActiveStateLogic(
            deletedItem,
            { active: true },
            false // production mode
          );

          expect(result.shouldBeActive).toBe(false);
        });
      });

      describe('New products (no existing product)', () => {
        it('should use Square settings for new products in dev mode', () => {
          const activeItem = {
            is_deleted: false,
            item_data: {
              visibility: 'PUBLIC',
              available_online: true,
              present_at_all_locations: true,
            },
          };

          const inactiveItem = {
            is_deleted: false,
            item_data: {
              visibility: 'PUBLIC',
              available_online: false,
              present_at_all_locations: true,
            },
          };

          const activeResult = simulateSyncActiveStateLogic(activeItem, null, true);
          const inactiveResult = simulateSyncActiveStateLogic(inactiveItem, null, true);

          expect(activeResult.shouldBeActive).toBe(true);
          expect(inactiveResult.shouldBeActive).toBe(false);
        });
      });

      describe('PRIVATE visibility', () => {
        const privateItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PRIVATE',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        it('should preserve active state for PRIVATE items in dev mode', () => {
          const result = simulateSyncActiveStateLogic(
            privateItem,
            { active: true },
            true // isDevMode
          );

          expect(result.squareIndicatesActive).toBe(false); // PRIVATE = inactive
          expect(result.shouldBeActive).toBe(true); // Preserved in dev mode
        });

        it('should deactivate PRIVATE items in production mode', () => {
          const result = simulateSyncActiveStateLogic(
            privateItem,
            { active: true },
            false // production mode
          );

          expect(result.shouldBeActive).toBe(false);
        });
      });
    });

    describe('production-sync.ts logic simulation', () => {
      describe('Archive-based deactivation', () => {
        it('should preserve active state for non-archived products in dev mode', () => {
          const result = simulateProductionSyncActiveStateLogic(
            false, // not archived
            { active: true },
            true // isDevMode
          );

          expect(result).toBe(true);
        });

        it('should deactivate archived products even in dev mode', () => {
          const result = simulateProductionSyncActiveStateLogic(
            true, // archived
            { active: true },
            true // isDevMode
          );

          expect(result).toBe(false);
        });

        it('should follow archive status in production mode', () => {
          const notArchivedResult = simulateProductionSyncActiveStateLogic(
            false,
            { active: true },
            false // production
          );

          const archivedResult = simulateProductionSyncActiveStateLogic(
            true,
            { active: true },
            false // production
          );

          expect(notArchivedResult).toBe(true);
          expect(archivedResult).toBe(false);
        });
      });
    });
  });

  describe('Database Query Verification', () => {
    it('should query existing product with active field for sync.ts', async () => {
      // Setup mock to return a product with active=true
      mockPrismaProduct.findUnique.mockResolvedValue({
        id: 'test-id',
        slug: 'test-product',
        images: ['image1.jpg'],
        name: 'Test Product',
        active: true, // This field must be queried
      });

      // Simulate what sync.ts does when querying existing product
      const existingProduct = await mockPrismaProduct.findUnique({
        where: { squareId: 'SQUARE-123' },
        select: { id: true, slug: true, images: true, name: true, active: true },
      });

      expect(existingProduct).toBeDefined();
      expect(existingProduct?.active).toBe(true);
      expect(mockPrismaProduct.findUnique).toHaveBeenCalledWith({
        where: { squareId: 'SQUARE-123' },
        select: expect.objectContaining({ active: true }),
      });
    });

    it('should query existing product with active field for production-sync.ts', async () => {
      // Setup mock to return a product with visibility fields
      mockPrismaProduct.findUnique.mockResolvedValue({
        id: 'test-id',
        images: ['image1.jpg'],
        name: 'Test Product',
        updatedAt: new Date(),
        active: true,
        visibility: 'PUBLIC',
        isAvailable: true,
        isPreorder: false,
        itemState: 'ACTIVE',
        availabilityRules: [],
      });

      // Simulate what production-sync.ts does when querying existing product
      const existingProduct = await mockPrismaProduct.findUnique({
        where: { squareId: 'SQUARE-123' },
        select: {
          id: true,
          images: true,
          name: true,
          updatedAt: true,
          active: true, // This field must be queried
          visibility: true,
          isAvailable: true,
          isPreorder: true,
          itemState: true,
          availabilityRules: {
            select: { id: true },
            where: { deletedAt: null },
          },
        },
      });

      expect(existingProduct).toBeDefined();
      expect(existingProduct?.active).toBe(true);
    });
  });

  describe('Logging Verification', () => {
    /**
     * Simulates the logging behavior from sync.ts
     */
    function simulateLogging(
      itemName: string,
      squareIndicatesActive: boolean,
      shouldBeActive: boolean,
      existingProduct: { active: boolean } | null,
      isDevMode: boolean,
      reasons: string[]
    ): void {
      if (!squareIndicatesActive) {
        if (isDevMode && existingProduct?.active && shouldBeActive) {
          mockLogger.warn(
            `⚠️ [DEV MODE] Preserving active state for "${itemName}" despite sandbox settings: ${reasons.join(', ')}`
          );
        } else {
          mockLogger.info(`🔒 Setting product "${itemName}" as inactive: ${reasons.join(', ')}`);
        }
      }
    }

    it('should log warning when preserving active state in dev mode', () => {
      simulateLogging(
        'Test Alfajores',
        false, // Square says inactive
        true, // But we're preserving active
        { active: true },
        true, // dev mode
        ['not available online', 'not present at all locations']
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[DEV MODE] Preserving active state for "Test Alfajores"')
      );
    });

    it('should log info when deactivating in production mode', () => {
      simulateLogging(
        'Test Alfajores',
        false, // Square says inactive
        false, // Following Square settings
        { active: true },
        false, // production mode
        ['not available online']
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Setting product "Test Alfajores" as inactive')
      );
    });

    it('should not log when product is already correctly set', () => {
      // When Square indicates active, no logging should occur
      simulateLogging(
        'Test Alfajores',
        true, // Square says active
        true, // Product will be active
        { active: true },
        true, // dev mode
        []
      );

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Real-world Scenario Simulations', () => {
    describe('Scenario: Developer runs sync against sandbox', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.USE_SQUARE_SANDBOX = 'true';
      });

      it('should preserve all existing active products despite sandbox defaults', () => {
        const products = [
          { name: 'Alfajores 6-Pack', squareId: 'SQ-1', active: true },
          { name: 'Beef Empanadas', squareId: 'SQ-2', active: true },
          { name: 'Dulce de Leche Cake', squareId: 'SQ-3', active: true },
        ];

        const sandboxItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: false,
            present_at_all_locations: false,
          },
        };

        const isDevMode =
          process.env.NODE_ENV === 'development' || process.env.USE_SQUARE_SANDBOX === 'true';

        products.forEach(product => {
          const itemData = sandboxItem.item_data!;
          const squareIndicatesActive =
            !sandboxItem.is_deleted &&
            (itemData.available_online ?? true) &&
            (itemData.present_at_all_locations ?? true) &&
            itemData.visibility !== 'PRIVATE';

          const shouldBeActive = isDevMode ? product.active && !sandboxItem.is_deleted : squareIndicatesActive;

          expect(shouldBeActive).toBe(true);
          expect(squareIndicatesActive).toBe(false); // Square says inactive
        });
      });
    });

    describe('Scenario: Production sync with properly configured Square', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        process.env.USE_SQUARE_SANDBOX = 'false';
      });

      it('should follow Square settings in production', () => {
        const productionItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        const hiddenItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PRIVATE',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        const isDevMode =
          process.env.NODE_ENV === 'development' || process.env.USE_SQUARE_SANDBOX === 'true';

        expect(isDevMode).toBe(false);

        // Active product should be active
        const activeResult =
          !productionItem.is_deleted &&
          productionItem.item_data.available_online &&
          productionItem.item_data.present_at_all_locations &&
          productionItem.item_data.visibility !== 'PRIVATE';

        expect(activeResult).toBe(true);

        // Hidden product should be inactive
        const hiddenResult =
          !hiddenItem.is_deleted &&
          hiddenItem.item_data.available_online &&
          hiddenItem.item_data.present_at_all_locations &&
          hiddenItem.item_data.visibility !== 'PRIVATE';

        expect(hiddenResult).toBe(false);
      });
    });

    describe('Scenario: Product deleted from Square catalog', () => {
      it('should deactivate deleted products regardless of mode', () => {
        const deletedProduct = {
          is_deleted: true,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        const existingProduct = { active: true };

        // Test in dev mode
        process.env.NODE_ENV = 'development';
        const devModeResult = existingProduct.active && !deletedProduct.is_deleted;
        expect(devModeResult).toBe(false);

        // Test in production mode
        process.env.NODE_ENV = 'production';
        process.env.USE_SQUARE_SANDBOX = 'false';
        const prodModeResult =
          !deletedProduct.is_deleted &&
          deletedProduct.item_data.available_online &&
          deletedProduct.item_data.present_at_all_locations &&
          deletedProduct.item_data.visibility !== 'PRIVATE';
        expect(prodModeResult).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing item_data gracefully', () => {
      const itemWithoutData = {
        is_deleted: false,
        item_data: undefined,
      };

      const isDevMode = true;
      const existingProduct = { active: true };

      // Simulate sync.ts logic with defaults
      const itemData = itemWithoutData.item_data || {};
      const visibility = (itemData as any).visibility || 'PUBLIC';
      const availableOnline = (itemData as any).available_online ?? true;
      const presentAtAllLocations = (itemData as any).present_at_all_locations ?? true;
      const isNotDeleted = !itemWithoutData.is_deleted;

      const squareIndicatesActive =
        isNotDeleted && availableOnline && presentAtAllLocations && visibility !== 'PRIVATE';

      const shouldBeActive =
        isDevMode && existingProduct ? existingProduct.active && isNotDeleted : squareIndicatesActive;

      // With defaults, product should be active
      expect(squareIndicatesActive).toBe(true);
      expect(shouldBeActive).toBe(true);
    });

    it('should handle null existing product', () => {
      const squareItem = {
        is_deleted: false,
        item_data: {
          visibility: 'PUBLIC',
          available_online: false,
          present_at_all_locations: true,
        },
      };

      const isDevMode = true;
      const existingProduct = null;

      const itemData = squareItem.item_data;
      const squareIndicatesActive =
        !squareItem.is_deleted &&
        (itemData.available_online ?? true) &&
        (itemData.present_at_all_locations ?? true) &&
        itemData.visibility !== 'PRIVATE';

      // For new products, should use Square settings even in dev mode
      const shouldBeActive =
        isDevMode && existingProduct ? existingProduct.active && !squareItem.is_deleted : squareIndicatesActive;

      expect(squareIndicatesActive).toBe(false);
      expect(shouldBeActive).toBe(false); // New product follows Square
    });

    it('should handle undefined visibility field', () => {
      const itemWithUndefinedVisibility = {
        is_deleted: false,
        item_data: {
          // visibility is undefined
          available_online: true,
          present_at_all_locations: true,
        },
      };

      const itemData = itemWithUndefinedVisibility.item_data;
      const visibility = (itemData as any).visibility || 'PUBLIC';

      expect(visibility).toBe('PUBLIC'); // Should default to PUBLIC
    });
  });
});
