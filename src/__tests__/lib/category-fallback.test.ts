/**
 * Unit tests for Category Fallback Logic
 *
 * Tests the graceful degradation functionality for category pages
 * when the database is temporarily unavailable.
 *
 * @see src/lib/category-fallback.ts
 */

import {
  CATEGORY_DESCRIPTIONS,
  FALLBACK_CATEGORIES,
  SUPPORTED_FALLBACK_SLUGS,
  FallbackCategory,
  createFallbackCategory,
  hasFallbackCategory,
  getFallbackCategory,
  isFallbackCategory,
  fetchCategoryWithFallback,
  getFallbackUserMessage,
  getEmptyStateMessage,
} from '@/lib/category-fallback';

describe('Category Fallback Logic', () => {
  describe('CATEGORY_DESCRIPTIONS', () => {
    it('should have descriptions for all supported categories', () => {
      expect(CATEGORY_DESCRIPTIONS).toHaveProperty('alfajores');
      expect(CATEGORY_DESCRIPTIONS).toHaveProperty('empanadas');
      expect(CATEGORY_DESCRIPTIONS).toHaveProperty('catering');
    });

    it('should have non-empty descriptions', () => {
      Object.values(CATEGORY_DESCRIPTIONS).forEach(description => {
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(10);
      });
    });

    it('should have alfajores description mentioning key product traits', () => {
      expect(CATEGORY_DESCRIPTIONS.alfajores).toContain('dulce de leche');
      expect(CATEGORY_DESCRIPTIONS.alfajores).toContain('shortbread');
    });

    it('should have empanadas description mentioning key product traits', () => {
      expect(CATEGORY_DESCRIPTIONS.empanadas).toContain('protein');
      expect(CATEGORY_DESCRIPTIONS.empanadas).toContain('handcrafted');
    });
  });

  describe('createFallbackCategory', () => {
    it('should create a valid fallback category', () => {
      const category = createFallbackCategory('test', 'Test Category', 'Test description');

      expect(category).toMatchObject({
        id: 'fallback-test',
        name: 'Test Category',
        slug: 'test',
        description: 'Test description',
        active: true,
        order: 0,
        squareId: null,
        parentId: null,
        imageUrl: null,
        metadata: null,
      });
    });

    it('should create category with Date objects for timestamps', () => {
      const before = new Date();
      const category = createFallbackCategory('test', 'Test', 'Description');
      const after = new Date();

      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.updatedAt).toBeInstanceOf(Date);
      expect(category.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(category.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should prefix id with "fallback-"', () => {
      const category = createFallbackCategory('myslug', 'Name', 'Desc');
      expect(category.id).toBe('fallback-myslug');
    });

    it('should handle special characters in slug', () => {
      const category = createFallbackCategory('test-slug-123', 'Test', 'Desc');
      expect(category.id).toBe('fallback-test-slug-123');
      expect(category.slug).toBe('test-slug-123');
    });
  });

  describe('FALLBACK_CATEGORIES', () => {
    it('should have all expected categories', () => {
      expect(Object.keys(FALLBACK_CATEGORIES)).toHaveLength(3);
      expect(FALLBACK_CATEGORIES).toHaveProperty('alfajores');
      expect(FALLBACK_CATEGORIES).toHaveProperty('empanadas');
      expect(FALLBACK_CATEGORIES).toHaveProperty('catering');
    });

    it('should have valid category objects', () => {
      Object.entries(FALLBACK_CATEGORIES).forEach(([key, category]) => {
        expect(category.id).toBe(`fallback-${key}`);
        expect(category.slug).toBe(key);
        expect(category.active).toBe(true);
        expect(category.name).toBeTruthy();
        expect(category.description).toBeTruthy();
      });
    });

    it('should use descriptions from CATEGORY_DESCRIPTIONS', () => {
      expect(FALLBACK_CATEGORIES.alfajores.description).toBe(CATEGORY_DESCRIPTIONS.alfajores);
      expect(FALLBACK_CATEGORIES.empanadas.description).toBe(CATEGORY_DESCRIPTIONS.empanadas);
      expect(FALLBACK_CATEGORIES.catering.description).toBe(CATEGORY_DESCRIPTIONS.catering);
    });
  });

  describe('SUPPORTED_FALLBACK_SLUGS', () => {
    it('should contain all fallback category keys', () => {
      expect(SUPPORTED_FALLBACK_SLUGS).toContain('alfajores');
      expect(SUPPORTED_FALLBACK_SLUGS).toContain('empanadas');
      expect(SUPPORTED_FALLBACK_SLUGS).toContain('catering');
    });

    it('should have same length as FALLBACK_CATEGORIES', () => {
      expect(SUPPORTED_FALLBACK_SLUGS.length).toBe(Object.keys(FALLBACK_CATEGORIES).length);
    });
  });

  describe('hasFallbackCategory', () => {
    it('should return true for supported categories', () => {
      expect(hasFallbackCategory('alfajores')).toBe(true);
      expect(hasFallbackCategory('empanadas')).toBe(true);
      expect(hasFallbackCategory('catering')).toBe(true);
    });

    it('should return false for unsupported categories', () => {
      expect(hasFallbackCategory('unknown')).toBe(false);
      expect(hasFallbackCategory('random-slug')).toBe(false);
      expect(hasFallbackCategory('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(hasFallbackCategory('ALFAJORES')).toBe(true);
      expect(hasFallbackCategory('Empanadas')).toBe(true);
      expect(hasFallbackCategory('CATERING')).toBe(true);
    });
  });

  describe('getFallbackCategory', () => {
    it('should return fallback category for supported slugs', () => {
      const alfajores = getFallbackCategory('alfajores');
      expect(alfajores).not.toBeNull();
      expect(alfajores?.name).toBe('Alfajores');
      expect(alfajores?.id).toBe('fallback-alfajores');
    });

    it('should return null for unsupported slugs', () => {
      expect(getFallbackCategory('unknown')).toBeNull();
      expect(getFallbackCategory('not-a-category')).toBeNull();
    });

    it('should be case-insensitive', () => {
      const upper = getFallbackCategory('ALFAJORES');
      const lower = getFallbackCategory('alfajores');
      const mixed = getFallbackCategory('AlfAjOrEs');

      expect(upper?.id).toBe('fallback-alfajores');
      expect(lower?.id).toBe('fallback-alfajores');
      expect(mixed?.id).toBe('fallback-alfajores');
    });

    it('should return complete category object', () => {
      const category = getFallbackCategory('empanadas');

      expect(category).toMatchObject({
        id: 'fallback-empanadas',
        name: 'Empanadas',
        slug: 'empanadas',
        active: true,
        order: 0,
        squareId: null,
        parentId: null,
        imageUrl: null,
        metadata: null,
      });
      expect(category?.description).toContain('empanadas');
    });
  });

  describe('isFallbackCategory', () => {
    it('should return true for fallback categories', () => {
      expect(isFallbackCategory({ id: 'fallback-alfajores' })).toBe(true);
      expect(isFallbackCategory({ id: 'fallback-test' })).toBe(true);
      expect(isFallbackCategory({ id: 'fallback-' })).toBe(true);
    });

    it('should return false for real categories', () => {
      expect(isFallbackCategory({ id: 'abc123-def456' })).toBe(false);
      expect(isFallbackCategory({ id: 'real-category-id' })).toBe(false);
      expect(isFallbackCategory({ id: '' })).toBe(false);
    });

    it('should work with full category objects', () => {
      const fallback = getFallbackCategory('alfajores');
      const realCategory = { id: 'uuid-12345', name: 'Test' };

      expect(isFallbackCategory(fallback!)).toBe(true);
      expect(isFallbackCategory(realCategory)).toBe(false);
    });
  });

  describe('fetchCategoryWithFallback', () => {
    it('should return database category when fetch succeeds', async () => {
      const dbCategory: FallbackCategory = {
        id: 'db-alfajores-uuid',
        name: 'Alfajores',
        slug: 'alfajores',
        description: 'Database description',
        active: true,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        squareId: 'sq_123',
        parentId: null,
        imageUrl: '/images/alfajores.jpg',
        metadata: null,
      };

      const fetchFn = jest.fn().mockResolvedValue(dbCategory);
      const result = await fetchCategoryWithFallback(fetchFn, 'alfajores');

      expect(result.category).toBe(dbCategory);
      expect(result.usingFallback).toBe(false);
      expect(result.error).toBeUndefined();
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should return fallback when database returns null for known category', async () => {
      const fetchFn = jest.fn().mockResolvedValue(null);
      const result = await fetchCategoryWithFallback(fetchFn, 'alfajores');

      expect(result.category).not.toBeNull();
      expect(result.category?.id).toBe('fallback-alfajores');
      expect(result.usingFallback).toBe(true);
    });

    it('should return null when database returns null for unknown category', async () => {
      const fetchFn = jest.fn().mockResolvedValue(null);
      const result = await fetchCategoryWithFallback(fetchFn, 'unknown-category');

      expect(result.category).toBeNull();
      expect(result.usingFallback).toBe(false);
    });

    it('should return fallback when database throws error for known category', async () => {
      const dbError = new Error("Can't reach database server");
      const fetchFn = jest.fn().mockRejectedValue(dbError);

      const result = await fetchCategoryWithFallback(fetchFn, 'empanadas');

      expect(result.category).not.toBeNull();
      expect(result.category?.id).toBe('fallback-empanadas');
      expect(result.usingFallback).toBe(true);
      expect(result.error).toBe(dbError);
    });

    it('should re-throw error when database fails for unknown category', async () => {
      const dbError = new Error("Can't reach database server");
      const fetchFn = jest.fn().mockRejectedValue(dbError);

      await expect(fetchCategoryWithFallback(fetchFn, 'unknown-category')).rejects.toThrow(
        "Can't reach database server"
      );
    });

    it('should handle case-insensitive slugs', async () => {
      const fetchFn = jest.fn().mockResolvedValue(null);

      const result1 = await fetchCategoryWithFallback(fetchFn, 'ALFAJORES');
      const result2 = await fetchCategoryWithFallback(fetchFn, 'Empanadas');

      expect(result1.category?.id).toBe('fallback-alfajores');
      expect(result2.category?.id).toBe('fallback-empanadas');
    });

    it('should log warnings when using fallback', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const fetchFn = jest.fn().mockResolvedValue(null);

      await fetchCategoryWithFallback(fetchFn, 'alfajores');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CategoryFallback]')
      );

      consoleSpy.mockRestore();
    });

    it('should log errors when database fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const fetchFn = jest.fn().mockRejectedValue(new Error('DB error'));

      await fetchCategoryWithFallback(fetchFn, 'alfajores');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CategoryFallback]'),
        expect.objectContaining({
          slug: 'alfajores',
          error: 'DB error',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getFallbackUserMessage', () => {
    it('should return a user-friendly message', () => {
      const message = getFallbackUserMessage();

      expect(message).toContain('temporary');
      expect(message).toContain('connectivity');
      expect(message).toContain('refresh');
    });

    it('should be consistent on multiple calls', () => {
      expect(getFallbackUserMessage()).toBe(getFallbackUserMessage());
    });
  });

  describe('getEmptyStateMessage', () => {
    it('should return fallback message when usingFallback is true', () => {
      const result = getEmptyStateMessage('Alfajores', true);

      expect(result.title).toBe('Products Temporarily Unavailable');
      expect(result.description).toContain('temporary');
      expect(result.description).toContain('refresh');
    });

    it('should return normal message when usingFallback is false', () => {
      const result = getEmptyStateMessage('Empanadas', false);

      expect(result.title).toBe('No Products Available');
      expect(result.description).toContain('Empanadas');
      expect(result.description).toContain("don't have any products");
    });

    it('should include category name in normal message', () => {
      const result = getEmptyStateMessage('Custom Category', false);

      expect(result.description).toContain('Custom Category');
    });

    it('should not include category name in fallback message', () => {
      const result = getEmptyStateMessage('Should Not Appear', true);

      expect(result.description).not.toContain('Should Not Appear');
    });
  });
});

describe('Category Fallback - Edge Cases', () => {
  describe('Empty and whitespace slugs', () => {
    it('should handle empty string slug', () => {
      expect(hasFallbackCategory('')).toBe(false);
      expect(getFallbackCategory('')).toBeNull();
    });

    it('should handle whitespace slug', () => {
      expect(hasFallbackCategory('   ')).toBe(false);
      expect(getFallbackCategory('   ')).toBeNull();
    });
  });

  describe('Special characters in slugs', () => {
    it('should not match slugs with special characters', () => {
      expect(hasFallbackCategory('alfajores!')).toBe(false);
      expect(hasFallbackCategory('empanadas@123')).toBe(false);
    });
  });

  describe('Concurrent fallback requests', () => {
    it('should handle multiple concurrent fetchCategoryWithFallback calls', async () => {
      const fetchFn = jest.fn().mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve(null), 10)
          )
      );

      const results = await Promise.all([
        fetchCategoryWithFallback(fetchFn, 'alfajores'),
        fetchCategoryWithFallback(fetchFn, 'empanadas'),
        fetchCategoryWithFallback(fetchFn, 'catering'),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].category?.slug).toBe('alfajores');
      expect(results[1].category?.slug).toBe('empanadas');
      expect(results[2].category?.slug).toBe('catering');
      expect(results.every(r => r.usingFallback)).toBe(true);
    });
  });

  describe('Error recovery scenarios', () => {
    it('should recover from timeout errors with fallback', async () => {
      const timeoutError = new Error('Connection timeout');
      const fetchFn = jest.fn().mockRejectedValue(timeoutError);

      const result = await fetchCategoryWithFallback(fetchFn, 'alfajores');

      expect(result.usingFallback).toBe(true);
      expect(result.error).toBe(timeoutError);
    });

    it('should recover from connection reset errors with fallback', async () => {
      const resetError = new Error('ECONNRESET');
      const fetchFn = jest.fn().mockRejectedValue(resetError);

      const result = await fetchCategoryWithFallback(fetchFn, 'empanadas');

      expect(result.usingFallback).toBe(true);
      expect(result.error).toBe(resetError);
    });

    it('should recover from Prisma initialization errors with fallback', async () => {
      const prismaError = new Error("Can't reach database server at aws-0-us-west-1.pooler.supabase.com:6543");
      const fetchFn = jest.fn().mockRejectedValue(prismaError);

      const result = await fetchCategoryWithFallback(fetchFn, 'catering');

      expect(result.usingFallback).toBe(true);
      expect(result.error).toBe(prismaError);
    });
  });
});
