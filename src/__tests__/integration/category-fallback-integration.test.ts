/**
 * Integration Tests for Category Fallback / Graceful Degradation
 *
 * Tests the complete flow of category page behavior when the database
 * is temporarily unavailable, ensuring graceful degradation works
 * end-to-end.
 *
 * @see src/app/(store)/products/category/[slug]/page.tsx
 * @see src/lib/category-fallback.ts
 */

import {
  FALLBACK_CATEGORIES,
  fetchCategoryWithFallback,
  getFallbackCategory,
  isFallbackCategory,
  getFallbackUserMessage,
  getEmptyStateMessage,
  FallbackCategory,
} from '@/lib/category-fallback';
import { withRetry, withServerComponentDb } from '@/lib/db-unified';

// Mock the db-unified module for controlled testing
jest.mock('@/lib/db-unified', () => ({
  prisma: {
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
  withRetry: jest.fn((operation, retries, operationName) => operation()),
  withServerComponentDb: jest.fn((operation, options) => operation()),
  warmConnection: jest.fn().mockResolvedValue(true),
}));

const mockWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;
const mockWithServerComponentDb = withServerComponentDb as jest.MockedFunction<
  typeof withServerComponentDb
>;

describe('Category Fallback Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default behavior
    mockWithRetry.mockImplementation((operation) => operation());
    mockWithServerComponentDb.mockImplementation((operation) => operation());
  });

  describe('Database connection scenarios', () => {
    it('should use fallback when database is completely unreachable', async () => {
      const dbError = new Error(
        "Can't reach database server at aws-0-us-west-1.pooler.supabase.com:6543"
      );

      const fetchFromDb = jest.fn().mockRejectedValue(dbError);

      const result = await fetchCategoryWithFallback(fetchFromDb, 'alfajores');

      expect(result.usingFallback).toBe(true);
      expect(result.category?.name).toBe('Alfajores');
      expect(result.error).toBe(dbError);
    });

    it('should use fallback when database times out', async () => {
      const timeoutError = new Error('Connection timeout after 45 seconds');

      const fetchFromDb = jest.fn().mockRejectedValue(timeoutError);

      const result = await fetchCategoryWithFallback(fetchFromDb, 'empanadas');

      expect(result.usingFallback).toBe(true);
      expect(result.category?.name).toBe('Empanadas');
    });

    it('should use fallback when socket timeout occurs', async () => {
      const socketError = new Error(
        'the database failed to respond to a query within the configured timeout'
      );

      const fetchFromDb = jest.fn().mockRejectedValue(socketError);

      const result = await fetchCategoryWithFallback(fetchFromDb, 'catering');

      expect(result.usingFallback).toBe(true);
      expect(result.category?.name).toBe('Catering');
    });

    it('should use database category when available', async () => {
      const dbCategory: FallbackCategory = {
        id: 'real-uuid-123',
        name: 'Alfajores',
        slug: 'alfajores',
        description: 'Database description',
        active: true,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        squareId: 'sq_123',
        parentId: null,
        imageUrl: '/images/real.jpg',
        metadata: null,
      };

      const fetchFromDb = jest.fn().mockResolvedValue(dbCategory);

      const result = await fetchCategoryWithFallback(fetchFromDb, 'alfajores');

      expect(result.usingFallback).toBe(false);
      expect(result.category).toBe(dbCategory);
      expect(result.category?.id).toBe('real-uuid-123');
    });

    it('should return 404 for unknown categories when database fails', async () => {
      const dbError = new Error("Can't reach database server");

      const fetchFromDb = jest.fn().mockRejectedValue(dbError);

      await expect(
        fetchCategoryWithFallback(fetchFromDb, 'non-existent-category')
      ).rejects.toThrow("Can't reach database server");
    });
  });

  describe('withServerComponentDb integration', () => {
    it('should catch database errors and allow fallback', async () => {
      const dbError = new Error('Database connection failed');

      mockWithServerComponentDb.mockRejectedValueOnce(dbError);

      // Simulate the category page logic
      let category: FallbackCategory | null = null;
      let usingFallback = false;

      try {
        category = await mockWithServerComponentDb(async () => {
          throw dbError;
        }, { operationName: 'test-fetch' });
      } catch {
        // Database failed, try fallback
        const fallback = getFallbackCategory('alfajores');
        if (fallback) {
          category = fallback;
          usingFallback = true;
        }
      }

      expect(usingFallback).toBe(true);
      expect(category?.id).toBe('fallback-alfajores');
    });
  });

  describe('Fallback category completeness', () => {
    it('should have all required fields for rendering', () => {
      const categories = ['alfajores', 'empanadas', 'catering'];

      categories.forEach((slug) => {
        const fallback = getFallbackCategory(slug);

        expect(fallback).not.toBeNull();
        expect(fallback?.id).toBeDefined();
        expect(fallback?.name).toBeDefined();
        expect(fallback?.slug).toBeDefined();
        expect(fallback?.description).toBeDefined();
        expect(fallback?.active).toBe(true);
        expect(typeof fallback?.order).toBe('number');
        expect(fallback?.createdAt).toBeInstanceOf(Date);
        expect(fallback?.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should have meaningful descriptions', () => {
      const alfajores = getFallbackCategory('alfajores');
      const empanadas = getFallbackCategory('empanadas');

      expect(alfajores?.description).toContain('dulce de leche');
      expect(empanadas?.description).toContain('protein');
    });
  });

  describe('isFallbackCategory detection', () => {
    it('should correctly identify fallback vs real categories', () => {
      const fallbackCategory = getFallbackCategory('alfajores')!;
      const realCategory = {
        id: 'uuid-12345-67890',
        name: 'Alfajores',
        slug: 'alfajores',
      };

      expect(isFallbackCategory(fallbackCategory)).toBe(true);
      expect(isFallbackCategory(realCategory)).toBe(false);
    });

    it('should work with partial category objects', () => {
      expect(isFallbackCategory({ id: 'fallback-test' })).toBe(true);
      expect(isFallbackCategory({ id: 'real-id' })).toBe(false);
    });
  });

  describe('User-facing messages', () => {
    it('should provide appropriate fallback message', () => {
      const message = getFallbackUserMessage();

      expect(message).toContain('temporary');
      expect(message).toContain('connectivity');
      expect(message).toContain('refresh');
    });

    it('should provide different empty states for fallback vs normal', () => {
      const fallbackState = getEmptyStateMessage('Alfajores', true);
      const normalState = getEmptyStateMessage('Alfajores', false);

      expect(fallbackState.title).toBe('Products Temporarily Unavailable');
      expect(normalState.title).toBe('No Products Available');

      expect(fallbackState.description).not.toContain('Alfajores');
      expect(normalState.description).toContain('Alfajores');
    });
  });

  describe('Retry exhaustion scenarios', () => {
    it('should eventually use fallback after retries are exhausted', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const fetchFromDb = jest.fn().mockImplementation(async () => {
        attemptCount++;
        throw new Error(`Attempt ${attemptCount} failed: Can't reach database`);
      });

      // Simulate withRetry behavior
      const simulatedWithRetry = async (): Promise<FallbackCategory | null> => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fetchFromDb();
          } catch {
            if (i === maxRetries - 1) {
              // Last retry failed, return null to trigger fallback
              return null;
            }
          }
        }
        return null;
      };

      const dbResult = await simulatedWithRetry();

      // After all retries fail, we should use fallback
      expect(dbResult).toBeNull();
      expect(attemptCount).toBe(maxRetries);

      // Now the page logic would use fallback
      const fallback = getFallbackCategory('alfajores');
      expect(fallback).not.toBeNull();
      expect(isFallbackCategory(fallback!)).toBe(true);
    });
  });

  describe('Category slug normalization', () => {
    it('should handle various case formats', () => {
      expect(getFallbackCategory('alfajores')?.name).toBe('Alfajores');
      expect(getFallbackCategory('ALFAJORES')?.name).toBe('Alfajores');
      expect(getFallbackCategory('Alfajores')?.name).toBe('Alfajores');
      expect(getFallbackCategory('EMPANADAS')?.name).toBe('Empanadas');
      expect(getFallbackCategory('CaTeRiNg')?.name).toBe('Catering');
    });

    it('should return null for invalid slugs', () => {
      expect(getFallbackCategory('')).toBeNull();
      expect(getFallbackCategory('invalid')).toBeNull();
      expect(getFallbackCategory('alfajores!')).toBeNull();
    });
  });
});

describe('Category Fallback - Error Type Handling', () => {
  describe('Connection errors', () => {
    const connectionErrors = [
      "Can't reach database server at aws-0-us-west-1.pooler.supabase.com:6543",
      'Connection terminated',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Connection pool timeout',
      'Timed out fetching a new connection',
    ];

    connectionErrors.forEach((errorMsg) => {
      it(`should use fallback for: ${errorMsg.substring(0, 40)}...`, async () => {
        const error = new Error(errorMsg);
        const fetchFromDb = jest.fn().mockRejectedValue(error);

        const result = await fetchCategoryWithFallback(fetchFromDb, 'alfajores');

        expect(result.usingFallback).toBe(true);
        expect(result.error?.message).toBe(errorMsg);
      });
    });
  });

  describe('Authentication errors (should NOT fallback for unknown categories)', () => {
    it('should throw for unknown categories with auth errors', async () => {
      const authError = new Error('password authentication failed');
      const fetchFromDb = jest.fn().mockRejectedValue(authError);

      // For unknown categories, auth errors should propagate
      await expect(
        fetchCategoryWithFallback(fetchFromDb, 'unknown-category')
      ).rejects.toThrow('password authentication failed');
    });

    it('should use fallback for known categories even with auth errors', async () => {
      const authError = new Error('password authentication failed');
      const fetchFromDb = jest.fn().mockRejectedValue(authError);

      // For known categories, we still want graceful degradation
      const result = await fetchCategoryWithFallback(fetchFromDb, 'alfajores');

      expect(result.usingFallback).toBe(true);
    });
  });
});

describe('Category Fallback - Concurrent Operations', () => {
  it('should handle multiple concurrent fallback requests', async () => {
    const connectionError = new Error("Can't reach database server");
    const fetchFromDb = jest.fn().mockRejectedValue(connectionError);

    const requests = [
      fetchCategoryWithFallback(fetchFromDb, 'alfajores'),
      fetchCategoryWithFallback(fetchFromDb, 'empanadas'),
      fetchCategoryWithFallback(fetchFromDb, 'catering'),
    ];

    const results = await Promise.all(requests);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.usingFallback)).toBe(true);
    expect(results.map((r) => r.category?.slug)).toEqual([
      'alfajores',
      'empanadas',
      'catering',
    ]);
  });

  it('should handle mixed success/failure scenarios', async () => {
    const dbCategory: FallbackCategory = {
      id: 'real-id',
      name: 'Empanadas',
      slug: 'empanadas',
      description: 'Real description',
      active: true,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      squareId: null,
      parentId: null,
      imageUrl: null,
      metadata: null,
    };

    // First call succeeds, second fails
    const fetchFromDb = jest
      .fn()
      .mockResolvedValueOnce(dbCategory)
      .mockRejectedValueOnce(new Error('Database error'));

    const [result1, result2] = await Promise.all([
      fetchCategoryWithFallback(fetchFromDb, 'empanadas'),
      fetchCategoryWithFallback(fetchFromDb, 'alfajores'),
    ]);

    expect(result1.usingFallback).toBe(false);
    expect(result1.category?.id).toBe('real-id');

    expect(result2.usingFallback).toBe(true);
    expect(result2.category?.id).toBe('fallback-alfajores');
  });
});
