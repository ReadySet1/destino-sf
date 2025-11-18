/**
 * Tests for duplicate category detection during Square sync
 * DES-XX: Prevent duplicate category names from splitting products
 */

import { describe, it, expect } from '@jest/globals';

// Type definitions matching the sync module
interface SquareCatalogObject {
  type: string;
  id: string;
  is_deleted?: boolean;
  item_data?: {
    name: string;
    description?: string | null;
    category_id?: string;
    categories?: Array<{
      id: string;
      ordinal?: number;
    }>;
  };
  category_data?: {
    name: string;
  };
}

interface DuplicateCategoryInfo {
  categoryName: string;
  categories: Array<{
    squareId: string;
    itemCount: number;
  }>;
  winnerId: string;
  duplicateIds: string[];
}

/**
 * Detects duplicate category names in Square catalog
 * This is a copy of the implementation to test independently
 */
function detectDuplicateCategories(
  categories: SquareCatalogObject[],
  items: SquareCatalogObject[]
): DuplicateCategoryInfo[] {
  const duplicates: DuplicateCategoryInfo[] = [];

  // Group categories by name (case-insensitive)
  const categoryGroups = new Map<string, SquareCatalogObject[]>();

  for (const category of categories) {
    if (category.type !== 'CATEGORY' || !category.category_data?.name) {
      continue;
    }

    const normalizedName = category.category_data.name.trim().toUpperCase();
    const existing = categoryGroups.get(normalizedName) || [];
    existing.push(category);
    categoryGroups.set(normalizedName, existing);
  }

  // Find duplicates (more than one category with same name)
  for (const [normalizedName, categoryGroup] of categoryGroups.entries()) {
    if (categoryGroup.length <= 1) {
      continue;
    }

    // Count items in each category
    const categoriesWithCounts = categoryGroup.map(cat => {
      const itemCount = items.filter(item => {
        if (item.type !== 'ITEM' || !item.item_data) return false;

        const categoryIdFromItem = item.item_data.categories?.[0]?.id || item.item_data.category_id;
        return categoryIdFromItem === cat.id;
      }).length;

      return {
        squareId: cat.id,
        itemCount,
      };
    });

    // Sort by item count descending
    categoriesWithCounts.sort((a, b) => b.itemCount - a.itemCount);

    const winnerId = categoriesWithCounts[0].squareId;
    const duplicateIds = categoriesWithCounts.slice(1).map(c => c.squareId);

    duplicates.push({
      categoryName: categoryGroup[0].category_data?.name || normalizedName,
      categories: categoriesWithCounts,
      winnerId,
      duplicateIds,
    });
  }

  return duplicates;
}

describe('Duplicate Category Detection', () => {
  describe('detectDuplicateCategories', () => {
    it('should detect no duplicates when all category names are unique', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CAT1',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'CAT2',
          category_data: { name: 'ALFAJORES' },
        },
      ];

      const items: SquareCatalogObject[] = [];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(0);
    });

    it('should detect duplicate categories with the same name (case-insensitive)', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CBCQ73NCXQKUAFWGP2KQFOJN',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'SDGSB4F4YOUFY3UFJF2KWXUB',
          category_data: { name: 'EMPANADAS' },
        },
      ];

      const items: SquareCatalogObject[] = [
        {
          type: 'ITEM',
          id: 'ITEM1',
          item_data: {
            name: 'Encebollado',
            categories: [{ id: 'CBCQ73NCXQKUAFWGP2KQFOJN' }],
          },
        },
        {
          type: 'ITEM',
          id: 'ITEM2',
          item_data: {
            name: 'Argentine Beef',
            categories: [{ id: 'SDGSB4F4YOUFY3UFJF2KWXUB' }],
          },
        },
      ];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(1);
      expect(result[0].categoryName).toBe('EMPANADAS');
      expect(result[0].categories).toHaveLength(2);
    });

    it('should select the category with more items as the winner', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CBCQ73NCXQKUAFWGP2KQFOJN', // 1 item
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'SDGSB4F4YOUFY3UFJF2KWXUB', // 17 items
          category_data: { name: 'EMPANADAS' },
        },
      ];

      const items: SquareCatalogObject[] = [
        // 1 item in first category
        {
          type: 'ITEM',
          id: 'ITEM1',
          item_data: {
            name: 'Encebollado',
            categories: [{ id: 'CBCQ73NCXQKUAFWGP2KQFOJN' }],
          },
        },
        // 17 items in second category
        ...Array.from({ length: 17 }, (_, i) => ({
          type: 'ITEM' as const,
          id: `ITEM${i + 2}`,
          item_data: {
            name: `Product ${i + 1}`,
            categories: [{ id: 'SDGSB4F4YOUFY3UFJF2KWXUB' }],
          },
        })),
      ];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(1);
      expect(result[0].winnerId).toBe('SDGSB4F4YOUFY3UFJF2KWXUB');
      expect(result[0].duplicateIds).toEqual(['CBCQ73NCXQKUAFWGP2KQFOJN']);
      expect(result[0].categories[0].itemCount).toBe(17);
      expect(result[0].categories[1].itemCount).toBe(1);
    });

    it('should handle legacy category_id field', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CAT1',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'CAT2',
          category_data: { name: 'EMPANADAS' },
        },
      ];

      const items: SquareCatalogObject[] = [
        {
          type: 'ITEM',
          id: 'ITEM1',
          item_data: {
            name: 'Product 1',
            category_id: 'CAT1', // Legacy field
          },
        },
        {
          type: 'ITEM',
          id: 'ITEM2',
          item_data: {
            name: 'Product 2',
            category_id: 'CAT2', // Legacy field
          },
        },
        {
          type: 'ITEM',
          id: 'ITEM3',
          item_data: {
            name: 'Product 3',
            category_id: 'CAT2', // Legacy field
          },
        },
      ];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(1);
      expect(result[0].winnerId).toBe('CAT2'); // Has 2 items
      expect(result[0].duplicateIds).toEqual(['CAT1']); // Has 1 item
    });

    it('should handle multiple duplicate category sets', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'EMP1',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'EMP2',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'ALF1',
          category_data: { name: 'ALFAJORES' },
        },
        {
          type: 'CATEGORY',
          id: 'ALF2',
          category_data: { name: 'ALFAJORES' },
        },
      ];

      const items: SquareCatalogObject[] = [
        {
          type: 'ITEM',
          id: 'ITEM1',
          item_data: { name: 'Item 1', categories: [{ id: 'EMP1' }] },
        },
        {
          type: 'ITEM',
          id: 'ITEM2',
          item_data: { name: 'Item 2', categories: [{ id: 'EMP2' }] },
        },
        {
          type: 'ITEM',
          id: 'ITEM3',
          item_data: { name: 'Item 3', categories: [{ id: 'EMP2' }] },
        },
        {
          type: 'ITEM',
          id: 'ITEM4',
          item_data: { name: 'Item 4', categories: [{ id: 'ALF1' }] },
        },
        {
          type: 'ITEM',
          id: 'ITEM5',
          item_data: { name: 'Item 5', categories: [{ id: 'ALF2' }] },
        },
      ];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(2);

      const empanadasDup = result.find(d => d.categoryName === 'EMPANADAS');
      expect(empanadasDup).toBeDefined();
      expect(empanadasDup?.winnerId).toBe('EMP2'); // Has 2 items

      const alfajoresDup = result.find(d => d.categoryName === 'ALFAJORES');
      expect(alfajoresDup).toBeDefined();
      // ALF1 and ALF2 each have 1 item, so first one wins (stable sort)
    });

    it('should be case-insensitive when matching category names', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CAT1',
          category_data: { name: 'Empanadas' },
        },
        {
          type: 'CATEGORY',
          id: 'CAT2',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'CAT3',
          category_data: { name: 'empanadas' },
        },
      ];

      const items: SquareCatalogObject[] = [
        {
          type: 'ITEM',
          id: 'ITEM1',
          item_data: { name: 'Item 1', categories: [{ id: 'CAT1' }] },
        },
      ];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(1);
      expect(result[0].categories).toHaveLength(3);
    });

    it('should ignore non-CATEGORY objects', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CAT1',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'ITEM', // Wrong type
          id: 'CAT2',
          category_data: { name: 'EMPANADAS' },
        },
      ];

      const items: SquareCatalogObject[] = [];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(0); // Only one valid category
    });

    it('should handle categories without names gracefully', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CAT1',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'CAT2',
          // No category_data
        },
      ];

      const items: SquareCatalogObject[] = [];

      const result = detectDuplicateCategories(categories, items);

      expect(result).toHaveLength(0);
    });
  });

  describe('Category Remapping Integration', () => {
    it('should create correct remapping from duplicate detection', () => {
      const categories: SquareCatalogObject[] = [
        {
          type: 'CATEGORY',
          id: 'CBCQ73NCXQKUAFWGP2KQFOJN',
          category_data: { name: 'EMPANADAS' },
        },
        {
          type: 'CATEGORY',
          id: 'SDGSB4F4YOUFY3UFJF2KWXUB',
          category_data: { name: 'EMPANADAS' },
        },
      ];

      const items: SquareCatalogObject[] = [
        {
          type: 'ITEM',
          id: 'ITEM1',
          item_data: {
            name: 'Encebollado',
            categories: [{ id: 'CBCQ73NCXQKUAFWGP2KQFOJN' }],
          },
        },
        ...Array.from({ length: 17 }, (_, i) => ({
          type: 'ITEM' as const,
          id: `ITEM${i + 2}`,
          item_data: {
            name: `Product ${i + 1}`,
            categories: [{ id: 'SDGSB4F4YOUFY3UFJF2KWXUB' }],
          },
        })),
      ];

      const duplicates = detectDuplicateCategories(categories, items);

      // Simulate remapping creation
      const categoryRemapping = new Map<string, string>();
      for (const duplicate of duplicates) {
        for (const duplicateId of duplicate.duplicateIds) {
          categoryRemapping.set(duplicateId, duplicate.winnerId);
        }
      }

      expect(categoryRemapping.size).toBe(1);
      expect(categoryRemapping.get('CBCQ73NCXQKUAFWGP2KQFOJN')).toBe('SDGSB4F4YOUFY3UFJF2KWXUB');
    });
  });
});
