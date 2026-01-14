/**
 * Category Fallback Logic
 *
 * Provides graceful degradation for category pages when the database
 * is temporarily unavailable. This module extracts the fallback logic
 * from the category page to make it testable.
 *
 * @see src/app/(store)/products/category/[slug]/page.tsx
 */

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  alfajores:
    "Our alfajores are buttery shortbread cookies filled with rich, velvety dulce de leche — a beloved Latin American treat made the DESTINO way. We offer a variety of flavors including classic, chocolate, gluten-free, lemon, and seasonal specialties. Each cookie is handcrafted in small batches using a family-honored recipe and premium ingredients for that perfect melt-in-your-mouth texture. Whether you're gifting, sharing, or treating yourself, our alfajores bring comfort, flavor, and a touch of tradition to every bite.",
  empanadas:
    'Wholesome, bold, and rooted in Latin American tradition — our empanadas deliver handcrafted comfort in every bite. From our Argentine beef, Caribbean pork, Lomo Saltado, and Salmon, each flavor is inspired by regional flavors and made with carefully selected ingredients. With up to 17 grams of protein, our empanadas are truly protein-packed, making them as healthy as they are delicious. Crafted in small batches, our empanadas are a portable, satisfying option for any time you crave something bold and delicious.',
  catering: 'Professional catering services for your special events.',
};

/**
 * Fallback category type that matches the Prisma category model
 */
export type FallbackCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  squareId: string | null;
  parentId: string | null;
  imageUrl: string | null;
  metadata: null;
};

/**
 * Creates a fallback category object with all required fields
 */
export function createFallbackCategory(
  slug: string,
  name: string,
  description: string
): FallbackCategory {
  return {
    id: `fallback-${slug}`,
    name,
    slug,
    description,
    active: true,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    squareId: null,
    parentId: null,
    imageUrl: null,
    metadata: null,
  };
}

/**
 * Pre-defined fallback categories for known product categories
 */
export const FALLBACK_CATEGORIES: Record<string, FallbackCategory> = {
  alfajores: createFallbackCategory('alfajores', 'Alfajores', CATEGORY_DESCRIPTIONS.alfajores),
  empanadas: createFallbackCategory('empanadas', 'Empanadas', CATEGORY_DESCRIPTIONS.empanadas),
  catering: createFallbackCategory('catering', 'Catering', CATEGORY_DESCRIPTIONS.catering),
};

/**
 * List of supported fallback category slugs
 */
export const SUPPORTED_FALLBACK_SLUGS = Object.keys(FALLBACK_CATEGORIES);

/**
 * Checks if a slug has a fallback category available
 */
export function hasFallbackCategory(slug: string): boolean {
  return slug.toLowerCase() in FALLBACK_CATEGORIES;
}

/**
 * Gets the fallback category for a given slug (case-insensitive)
 * Returns null if no fallback is available
 */
export function getFallbackCategory(slug: string): FallbackCategory | null {
  const normalizedSlug = slug.toLowerCase();
  return FALLBACK_CATEGORIES[normalizedSlug] || null;
}

/**
 * Checks if a category is a fallback category (vs a real database category)
 */
export function isFallbackCategory(category: { id: string }): boolean {
  return category.id.startsWith('fallback-');
}

/**
 * Result of attempting to get a category with fallback support
 */
export interface CategoryFetchResult {
  category: FallbackCategory | null;
  usingFallback: boolean;
  error?: Error;
}

/**
 * Wraps a category fetch operation with fallback support
 *
 * @param fetchFn - Async function that fetches the category from the database
 * @param slug - The category slug to fetch
 * @returns CategoryFetchResult with the category and fallback status
 */
export async function fetchCategoryWithFallback(
  fetchFn: () => Promise<FallbackCategory | null>,
  slug: string
): Promise<CategoryFetchResult> {
  try {
    const category = await fetchFn();

    if (category) {
      return { category, usingFallback: false };
    }

    // Database returned null - try fallback
    const fallback = getFallbackCategory(slug);
    if (fallback) {
      console.warn(`[CategoryFallback] Category not found in DB, using fallback: ${slug}`);
      return { category: fallback, usingFallback: true };
    }

    return { category: null, usingFallback: false };
  } catch (error) {
    console.error(`[CategoryFallback] Database error, checking fallback:`, {
      slug,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });

    // Database error - try fallback
    const fallback = getFallbackCategory(slug);
    if (fallback) {
      console.warn(`[CategoryFallback] Using fallback data due to DB error: ${slug}`);
      return { category: fallback, usingFallback: true, error: error as Error };
    }

    // No fallback available - re-throw for unknown categories
    throw error;
  }
}

/**
 * Gets the display message for users when fallback mode is active
 */
export function getFallbackUserMessage(): string {
  return "We're experiencing temporary connectivity issues. Products may not be displayed. Please try refreshing the page in a moment.";
}

/**
 * Gets the appropriate empty state message based on fallback status
 */
export function getEmptyStateMessage(categoryName: string, usingFallback: boolean): {
  title: string;
  description: string;
} {
  if (usingFallback) {
    return {
      title: 'Products Temporarily Unavailable',
      description: "We're experiencing temporary connectivity issues. Please try refreshing the page in a moment.",
    };
  }

  return {
    title: 'No Products Available',
    description: `We don't have any products in the ${categoryName} category yet.`,
  };
}
