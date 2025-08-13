/**
 * Catering Data Manager
 * 
 * Phase 4 of the fix plan: Frontend Query Fix
 * This module provides unified data access for catering items,
 * implementing single source of truth based on the sync strategy.
 */

import { db } from '@/lib/db';
import { logger } from '@/utils/logger';
import type { CateringItem } from '@/types/catering';
import { CateringItemCategory } from '@/types/catering';
import { CategoryMapper } from './square/category-mapper';

/**
 * Strategy for fetching catering data
 */
export type CateringDataStrategy = 'PRODUCTS_ONLY' | 'CATERING_ONLY' | 'AUTO_DETECT';

/**
 * Configuration for catering data fetching
 */
interface CateringDataConfig {
  strategy: CateringDataStrategy;
  includeProducts: boolean;
  includeCateringItems: boolean;
  logStatistics: boolean;
}

/**
 * Statistics about data sources
 */
interface DataSourceStats {
  productsCount: number;
  cateringItemsCount: number;
  totalCount: number;
  strategy: CateringDataStrategy;
  source: 'products' | 'catering_items' | 'mixed';
}

/**
 * Determine the best strategy for fetching catering data
 */
async function determineStrategy(): Promise<CateringDataStrategy> {
  try {
    // FORCE PRODUCTS_ONLY strategy as per unified approach decision
    // This ensures single source of truth using products table only
    logger.info('📊 Strategy: PRODUCTS_ONLY (forced for unified data model - catering_items table deprecated)');
    return 'PRODUCTS_ONLY';
  } catch (error) {
    logger.error('❌ Error determining strategy, falling back to PRODUCTS_ONLY:', error);
    return 'PRODUCTS_ONLY';
  }
}

/**
 * Convert product to catering item format
 */
function convertProductToCateringItem(product: any): CateringItem {
  // Determine category based on the Square category name
  let category: CateringItemCategory = CateringItemCategory.STARTER; // default
  const categoryName = product.category?.name || '';

  // Map category name to catering category enum
  if (categoryName.includes('DESSERT')) {
    category = CateringItemCategory.DESSERT;
  } else if (categoryName.includes('ENTREE')) {
    category = CateringItemCategory.ENTREE;
  } else if (categoryName.includes('SIDE')) {
    category = CateringItemCategory.SIDE;
  } else if (categoryName.includes('STARTER')) {
    category = CateringItemCategory.STARTER;
  } else if (categoryName.includes('BEVERAGE')) {
    category = CateringItemCategory.BEVERAGE;
  } else if (categoryName.includes('APPETIZER')) {
    category = CateringItemCategory.STARTER;
  }

  // Get first image if available
  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    category,
    isVegetarian: false, // Default values - could be enhanced with metadata
    isVegan: false,
    isGlutenFree: false,
    servingSize: null,
    imageUrl: firstImage,
    isActive: true,
    squareCategory: product.category?.name || '',
    squareProductId: product.squareId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  } as CateringItem;
}

/**
 * Fetch catering items from products table only
 */
async function fetchFromProductsTable(): Promise<CateringItem[]> {
  try {
    const products = await db.product.findMany({
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
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    logger.info(`✅ Fetched ${products.length} items from products table`);

    return products.map(convertProductToCateringItem);
  } catch (error) {
    logger.error('❌ Error fetching from products table:', error);
    throw error;
  }
}

/**
 * Fetch catering items from catering_items table only
 */
async function fetchFromCateringTable(): Promise<CateringItem[]> {
  try {
    const items = await db.cateringItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    logger.info(`✅ Fetched ${items.length} items from catering_items table`);

    return items.map((item: any) => ({
      ...item,
      price: Number(item.price),
    })) as CateringItem[];
  } catch (error) {
    logger.error('❌ Error fetching from catering_items table:', error);
    throw error;
  }
}

/**
 * Get data source statistics
 */
export async function getCateringDataStats(): Promise<DataSourceStats> {
  try {
    const [productsCount, cateringItemsCount] = await Promise.all([
      db.product.count({
        where: {
          active: true,
          category: {
            name: {
              contains: 'CATERING'
            }
          }
        }
      }),
      db.cateringItem.count({
        where: {
          isActive: true
        }
      })
    ]);

    const strategy = await determineStrategy();
    let source: 'products' | 'catering_items' | 'mixed';

    if (strategy === 'PRODUCTS_ONLY') {
      source = 'products';
    } else if (strategy === 'CATERING_ONLY') {
      source = 'catering_items';
    } else {
      source = 'mixed';
    }

    return {
      productsCount,
      cateringItemsCount,
      totalCount: productsCount + cateringItemsCount,
      strategy,
      source
    };
  } catch (error) {
    logger.error('❌ Error getting data stats:', error);
    throw error;
  }
}

/**
 * Enhanced getCateringItems with single source strategy
 */
export async function getCateringItems(
  config: Partial<CateringDataConfig> = {}
): Promise<CateringItem[]> {
  const defaultConfig: CateringDataConfig = {
    strategy: 'AUTO_DETECT',
    includeProducts: true,
    includeCateringItems: true,
    logStatistics: true,
    ...config
  };

  try {
    logger.info('🔧 [UNIFIED] Fetching catering items with unified data manager...');

    // Determine strategy
    const strategy = defaultConfig.strategy === 'AUTO_DETECT' 
      ? await determineStrategy() 
      : defaultConfig.strategy;

    let items: CateringItem[] = [];

    switch (strategy) {
      case 'PRODUCTS_ONLY':
        items = await fetchFromProductsTable();
        break;

      case 'CATERING_ONLY':
        items = await fetchFromCateringTable();
        break;

      default:
        // Fallback to products
        logger.warn('⚠️ Unknown strategy, falling back to PRODUCTS_ONLY');
        items = await fetchFromProductsTable();
        break;
    }

    if (defaultConfig.logStatistics) {
      const stats = await getCateringDataStats();
      logger.info(`📊 [UNIFIED] Data source statistics:`, stats);
    }

    logger.info(`✅ [UNIFIED] Successfully fetched ${items.length} catering items using ${strategy} strategy`);

    return items;
  } catch (error) {
    logger.error('❌ [UNIFIED] Error fetching catering items:', error);
    throw error;
  }
}

/**
 * Get catering items by category with unified approach
 */
export async function getCateringItemsByCategory(
  category: CateringItemCategory,
  config: Partial<CateringDataConfig> = {}
): Promise<CateringItem[]> {
  try {
    const allItems = await getCateringItems(config);
    return allItems.filter(item => item.category === category);
  } catch (error) {
    logger.error(`❌ Error fetching catering items for category ${category}:`, error);
    throw error;
  }
}

/**
 * Get single catering item by ID with unified approach
 */
export async function getCateringItem(
  itemId: string,
  config: Partial<CateringDataConfig> = {}
): Promise<{ success: boolean; data?: CateringItem; error?: string }> {
  try {
    const strategy = config.strategy === 'AUTO_DETECT' || !config.strategy
      ? await determineStrategy() 
      : config.strategy;

    let item: any = null;

    if (strategy === 'PRODUCTS_ONLY') {
      // Check products table first
      const product = await db.product.findFirst({
        where: {
          id: itemId,
          active: true,
          category: {
            name: {
              contains: 'CATERING'
            }
          }
        },
        include: {
          category: true
        }
      });

      if (product) {
        item = convertProductToCateringItem(product);
      }
    } else {
      // Check catering_items table
      item = await db.cateringItem.findFirst({
        where: {
          id: itemId,
          isActive: true,
        },
      });

      if (item) {
        item = {
          ...item,
          price: Number(item.price),
        };
      }
    }

    if (item) {
      return { success: true, data: item as CateringItem };
    } else {
      return { success: false, error: 'Catering item not found' };
    }
  } catch (error) {
    logger.error(`❌ Error fetching catering item ${itemId}:`, error);
    return { success: false, error: 'Failed to fetch catering item' };
  }
}

/**
 * Check if unified sync is recommended
 */
export async function shouldRunUnifiedSync(): Promise<{
  recommended: boolean;
  reason: string;
  stats: DataSourceStats;
}> {
  try {
    const stats = await getCateringDataStats();

    // If both tables have significant data, recommend unified sync
    if (stats.productsCount > 0 && stats.cateringItemsCount > 0) {
      return {
        recommended: true,
        reason: `Both tables have data (${stats.productsCount} products, ${stats.cateringItemsCount} catering items). Unified sync recommended to consolidate data.`,
        stats
      };
    }

    // If only one table has data, unified sync may not be necessary
    if (stats.productsCount === 0 && stats.cateringItemsCount === 0) {
      return {
        recommended: true,
        reason: 'No catering data found in either table. Initial sync recommended.',
        stats
      };
    }

    return {
      recommended: false,
      reason: `Data appears to be consolidated in one table already (${stats.source}).`,
      stats
    };
  } catch (error) {
    logger.error('❌ Error checking sync recommendation:', error);
    throw error;
  }
}

/**
 * Get catering items for specific tab/section (used by frontend)
 */
export async function getCateringItemsForTab(
  tabName: string,
  config: Partial<CateringDataConfig> = {}
): Promise<CateringItem[]> {
  try {
    const allItems = await getCateringItems(config);

    // Filter items based on tab/section
    switch (tabName) {
      case 'appetizers':
        return allItems.filter(item => 
          item.category === CateringItemCategory.STARTER || 
          item.squareCategory?.includes('APPETIZER') ||
          item.squareCategory?.includes('STARTER')
        );

      case 'entrees':
        return allItems.filter(item => 
          item.category === CateringItemCategory.ENTREE ||
          item.squareCategory?.includes('ENTREE')
        );

      case 'sides':
        return allItems.filter(item => 
          item.category === CateringItemCategory.SIDE ||
          item.squareCategory?.includes('SIDE')
        );

      case 'desserts':
        return allItems.filter(item => 
          item.category === CateringItemCategory.DESSERT ||
          item.squareCategory?.includes('DESSERT')
        );

      case 'beverages':
        return allItems.filter(item => 
          item.category === CateringItemCategory.BEVERAGE ||
          item.squareCategory?.includes('BEVERAGE')
        );

      case 'buffet':
        return allItems.filter(item => 
          item.squareCategory?.includes('BUFFET')
        );

      case 'lunch':
        return allItems.filter(item => 
          item.squareCategory?.includes('LUNCH')
        );

      default:
        return allItems;
    }
  } catch (error) {
    logger.error(`❌ Error fetching catering items for tab ${tabName}:`, error);
    throw error;
  }
}

/**
 * Legacy compatibility function
 * This maintains backward compatibility while using the new unified approach
 */
export { getCateringItems as getCateringItemsLegacy };

/**
 * Catering Data Manager module with unified data access
 */
export const CateringDataManager = {
  getCateringItems,
  getCateringItemsByCategory,
  getCateringItem,
  getCateringItemsForTab,
  getCateringDataStats,
  shouldRunUnifiedSync,
};

export default CateringDataManager;
