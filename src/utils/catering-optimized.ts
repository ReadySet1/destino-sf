import { db } from '@/lib/db';
import { CateringItem } from '@/types/catering';

interface CateringItemWithImage extends CateringItem {
  imageUrl?: string;
}

/**
 * Optimized function to get catering items with images
 * Replaces the inefficient 185-parameter query with a more efficient approach
 */
export async function getCateringItemsWithImages(): Promise<CateringItemWithImage[]> {
  try {
    // First, get all active catering items
    const cateringItems = await db.cateringItem.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });

    if (cateringItems.length === 0) {
      return [];
    }

    // Create a more efficient search strategy using array operations
    const itemNames = cateringItems.map(item => item.name.toLowerCase());
    
    // Use efficient PostgreSQL query with array operations instead of multiple ILIKE
    const products = await db.$queryRaw<Array<{ id: string; name: string; images: string[] }>>`
      SELECT id, name, images 
      FROM "Product" 
      WHERE LOWER(name) = ANY(${itemNames}::text[])
      OR EXISTS (
        SELECT 1 FROM unnest(${itemNames}::text[]) AS search_name
        WHERE LOWER("Product".name) LIKE '%' || search_name || '%'
        AND length(search_name) > 3
      )
      AND active = true
      LIMIT 200
    `;

    // Create efficient lookup map
    const productMap = new Map(
      products.map(p => [p.name.toLowerCase(), p.images[0]])
    );

    // Map products to catering items efficiently
    return cateringItems.map(item => {
      const itemKey = item.name.toLowerCase();
      let imageUrl = item.imageUrl;

      if (!imageUrl) {
        // Try exact match first
        imageUrl = productMap.get(itemKey) || null;
        
        // If no exact match, try partial match with more intelligent matching
        if (!imageUrl) {
          imageUrl = findPartialMatch(item.name, products)?.images[0] || null;
        }
      }

      return {
        ...item,
        price: Number(item.price),
        imageUrl
      };
    }) as CateringItemWithImage[];

  } catch (error) {
    console.error('Error fetching catering items with images:', error);
    throw new Error('Failed to fetch catering items');
  }
}

/**
 * Intelligent partial matching for product names
 */
function findPartialMatch(itemName: string, products: Array<{ name: string; images: string[] }>): { images: string[] } | undefined {
  const searchTerms = itemName.toLowerCase().split(' ').filter(term => term.length > 3);
  
  return products.find(product => {
    const productNameLower = product.name.toLowerCase();
    return searchTerms.some(term => 
      productNameLower.includes(term) || 
      term.includes(productNameLower.split(' ')[0]) // Match key product words
    );
  });
}

/**
 * Optimized function to get catering items by category
 */
export async function getCateringItemsByCategory(category: string): Promise<CateringItemWithImage[]> {
  try {
    const items = await db.cateringItem.findMany({
      where: {
        isActive: true,
        category: category as any,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return items.map(item => ({
      ...item,
      price: Number(item.price)
    })) as CateringItemWithImage[];
  } catch (error) {
    console.error(`Error fetching catering items for category ${category}:`, error);
    throw new Error(`Failed to fetch catering items for category ${category}`);
  }
}

/**
 * Cache for catering items to avoid repeated database queries
 */
let cateringItemsCache: { data: CateringItemWithImage[]; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

/**
 * Get catering items with caching
 */
export async function getCachedCateringItems(): Promise<CateringItemWithImage[]> {
  const now = Date.now();
  
  if (cateringItemsCache && (now - cateringItemsCache.timestamp) < CACHE_DURATION) {
    return cateringItemsCache.data;
  }
  
  const items = await getCateringItemsWithImages();
  cateringItemsCache = { data: items, timestamp: now };
  
  return items;
}

/**
 * Clear the catering items cache (useful for admin operations)
 */
export function clearCateringCache(): void {
  cateringItemsCache = null;
} 