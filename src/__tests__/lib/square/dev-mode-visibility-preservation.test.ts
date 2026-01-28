/**
 * Tests for dev-mode product visibility preservation during Square sync
 * DES-102: Prevent products from being silently deactivated in sandbox mode
 *
 * In development/sandbox mode, products should preserve their existing `active`
 * state unless they are explicitly deleted in Square. This prevents sandbox-specific
 * field defaults (available_online=false, etc.) from deactivating products.
 */

import { describe, it, expect } from '@jest/globals';

// Simulate the visibility determination logic from sync.ts
interface SquareItemData {
  visibility?: string;
  available_online?: boolean;
  present_at_all_locations?: boolean;
}

interface SquareCatalogItem {
  is_deleted?: boolean;
  item_data?: SquareItemData;
}

interface ExistingProduct {
  active: boolean;
}

/**
 * Determines if a product should be active based on Square settings
 * This mirrors the logic in src/lib/square/sync.ts
 */
function determineProductActiveStatus(
  item: SquareCatalogItem,
  existingProduct: ExistingProduct | null,
  isDevMode: boolean
): boolean {
  const itemData = item.item_data || {};
  const visibility = itemData.visibility || 'PUBLIC';
  const availableOnline = itemData.available_online ?? true;
  const presentAtAllLocations = itemData.present_at_all_locations ?? true;
  const isNotDeleted = !item.is_deleted;

  // Calculate what Square settings would indicate for active status
  const squareIndicatesActive =
    isNotDeleted && availableOnline && presentAtAllLocations && visibility !== 'PRIVATE';

  // In dev/sandbox mode, preserve existing product active state unless explicitly deleted
  return isDevMode && existingProduct
    ? existingProduct.active && isNotDeleted
    : squareIndicatesActive;
}

/**
 * Determines if a product should be active based on archive status
 * This mirrors the logic in src/lib/square/production-sync.ts
 */
function determineProductActiveStatusProduction(
  isArchived: boolean,
  existingProduct: ExistingProduct | null,
  isDevMode: boolean
): boolean {
  return isDevMode && existingProduct
    ? existingProduct.active && !isArchived
    : !isArchived;
}

describe('Dev Mode Product Visibility Preservation', () => {
  describe('sync.ts logic - determineProductActiveStatus', () => {
    describe('Production mode (isDevMode=false)', () => {
      const isDevMode = false;

      it('should set product active when all Square settings indicate active', () => {
        const item: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        expect(determineProductActiveStatus(item, null, isDevMode)).toBe(true);
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(true);
        expect(determineProductActiveStatus(item, { active: false }, isDevMode)).toBe(true);
      });

      it('should set product inactive when available_online is false', () => {
        const item: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: false,
            present_at_all_locations: true,
          },
        };

        expect(determineProductActiveStatus(item, null, isDevMode)).toBe(false);
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(false);
      });

      it('should set product inactive when present_at_all_locations is false', () => {
        const item: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: false,
          },
        };

        expect(determineProductActiveStatus(item, null, isDevMode)).toBe(false);
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(false);
      });

      it('should set product inactive when visibility is PRIVATE', () => {
        const item: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PRIVATE',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        expect(determineProductActiveStatus(item, null, isDevMode)).toBe(false);
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(false);
      });

      it('should set product inactive when deleted in Square', () => {
        const item: SquareCatalogItem = {
          is_deleted: true,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        expect(determineProductActiveStatus(item, null, isDevMode)).toBe(false);
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(false);
      });
    });

    describe('Development/Sandbox mode (isDevMode=true)', () => {
      const isDevMode = true;

      it('should preserve existing active state when sandbox fields indicate inactive', () => {
        // This is the key test - sandbox often has available_online=false
        const item: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: false, // Sandbox default
            present_at_all_locations: true,
          },
        };

        // Existing active product should stay active
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(true);

        // Existing inactive product should stay inactive
        expect(determineProductActiveStatus(item, { active: false }, isDevMode)).toBe(false);
      });

      it('should preserve existing active state when present_at_all_locations is false', () => {
        const item: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: false, // Sandbox might not have location configured
          },
        };

        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(true);
        expect(determineProductActiveStatus(item, { active: false }, isDevMode)).toBe(false);
      });

      it('should preserve existing active state when visibility is PRIVATE', () => {
        const item: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PRIVATE',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(true);
        expect(determineProductActiveStatus(item, { active: false }, isDevMode)).toBe(false);
      });

      it('should deactivate product when deleted in Square even in dev mode', () => {
        const item: SquareCatalogItem = {
          is_deleted: true,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        // Deleted products should always be deactivated, even in dev mode
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(false);
        expect(determineProductActiveStatus(item, { active: false }, isDevMode)).toBe(false);
      });

      it('should use Square settings for new products (no existing product)', () => {
        const activeItem: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: true,
            present_at_all_locations: true,
          },
        };

        const inactiveItem: SquareCatalogItem = {
          is_deleted: false,
          item_data: {
            visibility: 'PUBLIC',
            available_online: false,
            present_at_all_locations: true,
          },
        };

        // New products should use Square settings
        expect(determineProductActiveStatus(activeItem, null, isDevMode)).toBe(true);
        expect(determineProductActiveStatus(inactiveItem, null, isDevMode)).toBe(false);
      });

      it('should handle missing item_data gracefully', () => {
        const item: SquareCatalogItem = {
          is_deleted: false,
        };

        // Should default to active (defaults: visibility='PUBLIC', available_online=true, present_at_all_locations=true)
        expect(determineProductActiveStatus(item, null, isDevMode)).toBe(true);
        expect(determineProductActiveStatus(item, { active: true }, isDevMode)).toBe(true);
      });
    });
  });

  describe('production-sync.ts logic - determineProductActiveStatusProduction', () => {
    describe('Production mode (isDevMode=false)', () => {
      const isDevMode = false;

      it('should set product active when not archived', () => {
        expect(determineProductActiveStatusProduction(false, null, isDevMode)).toBe(true);
        expect(determineProductActiveStatusProduction(false, { active: true }, isDevMode)).toBe(
          true
        );
        expect(determineProductActiveStatusProduction(false, { active: false }, isDevMode)).toBe(
          true
        );
      });

      it('should set product inactive when archived', () => {
        expect(determineProductActiveStatusProduction(true, null, isDevMode)).toBe(false);
        expect(determineProductActiveStatusProduction(true, { active: true }, isDevMode)).toBe(
          false
        );
      });
    });

    describe('Development/Sandbox mode (isDevMode=true)', () => {
      const isDevMode = true;

      it('should preserve existing active state when not archived', () => {
        expect(determineProductActiveStatusProduction(false, { active: true }, isDevMode)).toBe(
          true
        );
        expect(determineProductActiveStatusProduction(false, { active: false }, isDevMode)).toBe(
          false
        );
      });

      it('should deactivate when archived even in dev mode', () => {
        expect(determineProductActiveStatusProduction(true, { active: true }, isDevMode)).toBe(
          false
        );
        expect(determineProductActiveStatusProduction(true, { active: false }, isDevMode)).toBe(
          false
        );
      });

      it('should use archive status for new products (no existing product)', () => {
        expect(determineProductActiveStatusProduction(false, null, isDevMode)).toBe(true);
        expect(determineProductActiveStatusProduction(true, null, isDevMode)).toBe(false);
      });
    });
  });

  describe('Real-world sandbox scenarios', () => {
    const isDevMode = true;

    it('should handle typical sandbox product with restrictive defaults', () => {
      // Sandbox often returns products with these restrictive settings
      const sandboxProduct: SquareCatalogItem = {
        is_deleted: false,
        item_data: {
          visibility: 'PUBLIC',
          available_online: false, // Common sandbox default
          present_at_all_locations: false, // Location not configured in sandbox
        },
      };

      // Existing active products should stay active in dev mode
      expect(determineProductActiveStatus(sandboxProduct, { active: true }, isDevMode)).toBe(true);

      // In production mode, this would deactivate the product
      expect(determineProductActiveStatus(sandboxProduct, { active: true }, false)).toBe(false);
    });

    it('should handle product with PRIVATE visibility in sandbox', () => {
      const privateProduct: SquareCatalogItem = {
        is_deleted: false,
        item_data: {
          visibility: 'PRIVATE',
          available_online: true,
          present_at_all_locations: true,
        },
      };

      // Should preserve active state in dev mode
      expect(determineProductActiveStatus(privateProduct, { active: true }, isDevMode)).toBe(true);

      // In production mode, PRIVATE visibility would deactivate
      expect(determineProductActiveStatus(privateProduct, { active: true }, false)).toBe(false);
    });
  });
});
