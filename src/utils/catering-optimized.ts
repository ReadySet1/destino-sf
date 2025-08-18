import { db } from '@/lib/db';
import { CateringItem } from '@/types/catering';

interface CateringItemWithImage extends CateringItem {
  imageUrl?: string;
}

/**
 * Optimized function to get catering products as catering items with images
 * Uses products table as single source of truth (catering_items table removed)
 */
export async function getCateringItemsWithImages(): Promise<CateringItemWithImage[]> {
  try {
    // Get all active products in catering categories
    const cateringProducts = await db.product.findMany({
      where: { 
        active: true,
        category: {
          name: {
            contains: 'CATERING'
          }
        }
      },
      include: {
        category: true
      },
      orderBy: { name: 'asc' },
    });

    if (cateringProducts.length === 0) {
      return [];
    }

    // Transform products to CateringItem format for backward compatibility
    return cateringProducts.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || null,
      price: parseFloat(product.price.toString()),
      category: mapSquareCategoryToCateringCategory(product.category.name),
      isVegetarian: false, // Default values - these would need to be stored in product table
      isVegan: false,
      isGlutenFree: false,
      servingSize: null,
      imageUrl: product.images[0] || null,
      isActive: product.active,
      squareCategory: product.category.name,
      squareProductId: product.squareId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })) as CateringItemWithImage[];
  } catch (error) {
    console.error('Error fetching catering items with images:', error);
    throw new Error('Failed to fetch catering items');
  }
}

/**
 * Map Square category names to CateringItemCategory enum
 */
function mapSquareCategoryToCateringCategory(squareCategory: string): any {
  if (squareCategory.includes('STARTER')) return 'STARTER';
  if (squareCategory.includes('ENTREE')) return 'ENTREE';
  if (squareCategory.includes('SIDE')) return 'SIDE';
  if (squareCategory.includes('SALAD')) return 'SALAD';
  if (squareCategory.includes('DESSERT')) return 'DESSERT';
  if (squareCategory.includes('BEVERAGE')) return 'BEVERAGE';
  if (squareCategory.includes('APPETIZER')) return 'STARTER';
  return 'ENTREE'; // Default fallback
}



/**
 * Optimized function to get catering products by category
 * Now uses products table with catering category filtering
 */
export async function getCateringItemsByCategory(
  category: string
): Promise<CateringItemWithImage[]> {
  try {
    const products = await db.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            contains: category.toUpperCase()
          }
        }
      },
      include: {
        category: true
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || null,
      price: parseFloat(product.price.toString()),
      category: mapSquareCategoryToCateringCategory(product.category.name),
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      servingSize: null,
      imageUrl: product.images[0] || null,
      isActive: product.active,
      squareCategory: product.category.name,
      squareProductId: product.squareId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })) as CateringItemWithImage[];
  } catch (error) {
    console.error(`Error fetching catering items for category ${category}:`, error);
    throw new Error(`Failed to fetch catering items for category ${category}`);
  }
}

/**
 * Cache for catering products to avoid repeated database queries
 */
let cateringItemsCache: { data: CateringItemWithImage[]; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

/**
 * Get catering products with caching (backward compatibility function name)
 */
export async function getCachedCateringItems(): Promise<CateringItemWithImage[]> {
  const now = Date.now();

  if (cateringItemsCache && now - cateringItemsCache.timestamp < CACHE_DURATION) {
    return cateringItemsCache.data;
  }

  const items = await getCateringItemsWithImages();
  cateringItemsCache = { data: items, timestamp: now };

  return items;
}

/**
 * Clear the catering cache (useful for admin operations)
 */
export function clearCateringCache(): void {
  cateringItemsCache = null;
}
