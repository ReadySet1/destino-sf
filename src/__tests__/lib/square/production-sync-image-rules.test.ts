/**
 * Image-decision contract for production-sync.ts (the API path used by
 * POST /api/square/sync). This mirrors the rules implemented inside
 * `processProductImages` in src/lib/square/production-sync.ts. The two must
 * stay in sync; see CLAUDE.md "Product Sync Protection" for the contract.
 *
 * Companion to determine-product-images.test.ts, which covers the CLI path
 * (syncSquareProducts → determineProductImages).
 */

import { describe, it, expect } from '@jest/globals';
import { isCateringCategory } from '@/lib/square/sync';

interface ExistingProduct {
  images: string[];
  name: string;
  syncLocked?: boolean;
}

/**
 * Mirrors the decision logic in production-sync.ts processProductImages.
 * If this drifts from the implementation, both tests and CLAUDE.md become lies.
 */
function decideImageOutcome(
  squareImageIds: string[],
  existingProduct: ExistingProduct | null,
  options: { categoryName?: string; forceImageUpdate?: boolean } = {}
): { preserve: boolean; reason: string } {
  const { categoryName, forceImageUpdate = false } = options;

  if (existingProduct && categoryName && isCateringCategory(categoryName)) {
    return { preserve: true, reason: 'catering' };
  }

  if (existingProduct?.syncLocked && !forceImageUpdate) {
    return { preserve: true, reason: 'syncLocked' };
  }

  if (squareImageIds.length === 0) {
    if (existingProduct && existingProduct.images.length > 0) {
      return { preserve: true, reason: 'square-empty-safety-net' };
    }
    return { preserve: false, reason: 'empty' };
  }

  return { preserve: false, reason: 'square-wins' };
}

describe('production-sync image rules', () => {
  const existing: ExistingProduct = {
    images: ['https://existing.example.com/old.jpg'],
    name: 'Beef Empanada',
    syncLocked: false,
  };

  it('catering category preserves images even with forceImageUpdate', () => {
    const result = decideImageOutcome(['img1'], existing, {
      categoryName: 'CATERING- APPETIZERS',
      forceImageUpdate: true,
    });
    expect(result).toEqual({ preserve: true, reason: 'catering' });
  });

  it('catering category preserves images regardless of Square content', () => {
    const result = decideImageOutcome(['img1', 'img2'], existing, {
      categoryName: 'CATERING',
    });
    expect(result.preserve).toBe(true);
  });

  it('syncLocked=true preserves images when forceImageUpdate is off', () => {
    const result = decideImageOutcome(['img1'], { ...existing, syncLocked: true });
    expect(result).toEqual({ preserve: true, reason: 'syncLocked' });
  });

  it('syncLocked=true with forceImageUpdate=true allows overwrite', () => {
    const result = decideImageOutcome(
      ['img1'],
      { ...existing, syncLocked: true },
      { forceImageUpdate: true }
    );
    expect(result.preserve).toBe(false);
  });

  it('Square has 0 images and existing has any → preserve as safety net', () => {
    const result = decideImageOutcome([], existing);
    expect(result).toEqual({ preserve: true, reason: 'square-empty-safety-net' });
  });

  it('Square has 0 images and no existing → empty, not preserved', () => {
    const result = decideImageOutcome([], null);
    expect(result).toEqual({ preserve: false, reason: 'empty' });
  });

  it('default path: Square wins for unlocked, non-catering products', () => {
    const result = decideImageOutcome(['img1'], existing);
    expect(result).toEqual({ preserve: false, reason: 'square-wins' });
  });

  it('non-catering category name does not trigger preservation', () => {
    const result = decideImageOutcome(['img1'], existing, { categoryName: 'EMPANADAS' });
    expect(result).toEqual({ preserve: false, reason: 'square-wins' });
  });
});
