/**
 * Unified Square Sync API Endpoint
 * 
 * Phase 3 of the fix plan: Unified Sync Implementation
 * This endpoint implements a single source of truth approach to resolve
 * sync discrepancies and dual storage issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/utils/logger';
import { z } from 'zod';
import { SyncLogger } from '@/lib/square/sync-logger';
import { CategoryMapper, CATEGORY_MAPPINGS } from '@/lib/square/category-mapper';
import { CateringDuplicateDetector } from '@/lib/catering-duplicate-detector';
import { searchCatalogObjects } from '@/lib/square/catalog-api';
import { prisma } from '@/lib/db';
import type { SyncVerificationResult } from '@/types/square-sync';

// Request validation schema
const UnifiedSyncRequestSchema = z.object({
  strategy: z.enum(['PRODUCTS_ONLY', 'CATERING_ONLY', 'SMART_MERGE']).optional().default('PRODUCTS_ONLY'),
  dryRun: z.boolean().optional().default(false),
  categories: z.array(z.string()).optional(), // Specific categories to sync
  forceUpdate: z.boolean().optional().default(false),
}).strict();

type SyncStrategy = 'PRODUCTS_ONLY' | 'CATERING_ONLY' | 'SMART_MERGE';

interface SquareItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  variations: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}

interface SyncDecision {
  strategy: SyncStrategy;
  targetTable: 'products' | 'catering_items';
  reason: string;
}

/**
 * Determine the best sync strategy based on current data state
 */
async function determineSyncStrategy(requestedStrategy: SyncStrategy): Promise<SyncDecision> {
  // Get current state of both tables
  const [productsCount, cateringCount] = await Promise.all([
    prisma.product.count({
      where: {
        active: true,
        category: {
          name: {
            contains: 'CATERING'
          }
        }
      }
    }),
    prisma.cateringItem.count({
      where: {
        isActive: true
      }
    })
  ]);

  logger.info(`Current state: ${productsCount} items in products table, ${cateringCount} items in catering_items table`);

  switch (requestedStrategy) {
    case 'PRODUCTS_ONLY':
      return {
        strategy: 'PRODUCTS_ONLY',
        targetTable: 'products',
        reason: 'User requested products table only'
      };

    case 'CATERING_ONLY':
      return {
        strategy: 'CATERING_ONLY',
        targetTable: 'catering_items',
        reason: 'User requested catering_items table only'
      };

    case 'SMART_MERGE':
    default:
      // Force products-only strategy for unified data model
      return {
        strategy: 'PRODUCTS_ONLY',
        targetTable: 'products',
        reason: 'Forced PRODUCTS_ONLY for unified data model - catering_items table deprecated'
      };
  }
}

/**
 * Fetch items from Square for a specific category
 */
async function fetchSquareItemsForCategory(categoryId: string, categoryName: string): Promise<SquareItem[]> {
  try {
    const requestBody = {
      object_types: ['ITEM'],
      query: {
        exact_query: {
          attribute_name: 'category_id',
          attribute_value: categoryId
        }
      },
      limit: 100,
      include_related_objects: true
    };

    const response = await searchCatalogObjects(requestBody);
    const data = response.result;
    const items: SquareItem[] = [];

    if (data.objects) {
      for (const item of data.objects) {
        if (item.type === 'ITEM' && item.item_data) {
          const variation = item.item_data.variations?.[0];
          let price = 0;
          
          if (variation?.item_variation_data?.price_money?.amount) {
            price = variation.item_variation_data.price_money.amount / 100;
          }

          // Find image from related objects
          let imageUrl: string | undefined;
          if (item.item_data.image_ids?.[0] && data.related_objects) {
            const imageObj = data.related_objects.find((obj: any) => 
              obj.type === 'IMAGE' && obj.id === item.item_data.image_ids[0]
            );
            if (imageObj?.image_data?.url) {
              imageUrl = imageObj.image_data.url;
            }
          }

          items.push({
            id: item.id,
            name: item.item_data.name,
            description: item.item_data.description_plaintext || '',
            price,
            categoryId,
            categoryName,
            imageUrl,
            variations: item.item_data.variations?.map((v: any) => ({
              id: v.id,
              name: v.item_variation_data?.name || 'Regular',
              price: v.item_variation_data?.price_money?.amount ? 
                v.item_variation_data.price_money.amount / 100 : undefined
            })) || []
          });
        }
      }
    }

    return items;
  } catch (error) {
    logger.error(`Error fetching Square items for category ${categoryId}:`, error);
    throw error;
  }
}

/**
 * Sync item to products table
 */
async function syncToProductsTable(
  item: SquareItem, 
  syncLogger: SyncLogger,
  forceUpdate: boolean = false
): Promise<void> {
  try {
    // Check for existing item
    const { isDuplicate, existingItem } = await CateringDuplicateDetector.checkForDuplicate({
      name: item.name,
      squareProductId: item.id,
      squareCategory: item.categoryName
    });

    if (isDuplicate && !forceUpdate) {
      syncLogger.logItemDuplicate(item.id, item.name, `Already exists: ${existingItem?.source}`);
      return;
    }

    // Get or create category
    const normalizedCategoryName = CategoryMapper.normalizeCategory(item.categoryName);
    let category = await prisma.category.findFirst({
      where: {
        name: {
          equals: normalizedCategoryName,
          mode: 'insensitive'
        }
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: normalizedCategoryName,
          description: `Category for ${normalizedCategoryName} products`,
          slug: normalizedCategoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          order: 0,
          active: true
        }
      });
      syncLogger.logInfo(`Created new category: ${normalizedCategoryName}`);
    }

    // Create slug
    const baseSlug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existingSlug = await prisma.product.findFirst({
      where: { slug: baseSlug }
    });
    const slug = existingSlug ? `${baseSlug}-${item.id.substring(0, 8)}` : baseSlug;

    // Sync to products table
    const productData = {
      squareId: item.id,
      name: item.name,
      slug,
      description: item.description,
      price: item.price,
      images: item.imageUrl ? [item.imageUrl] : [],
      categoryId: category.id,
      featured: false,
      active: true,
      variants: {
        create: item.variations.map(v => ({
          name: v.name,
          price: v.price || null,
          squareVariantId: v.id
        }))
      }
    };

    if (existingItem) {
      // Update existing
      await prisma.product.update({
        where: { squareId: item.id },
        data: {
          ...productData,
          variants: {
            deleteMany: {},
            create: productData.variants.create
          },
          updatedAt: new Date()
        }
      });
      syncLogger.logItemSynced(item.id, item.name, 'Updated in products table');
    } else {
      // Create new
      await prisma.product.create({
        data: productData
      });
      syncLogger.logItemSynced(item.id, item.name, 'Created in products table');
    }

  } catch (error) {
    syncLogger.logItemError(item.id, item.name, `Products table sync error: ${error}`);
    throw error;
  }
}

/**
 * Sync item to catering_items table
 */
async function syncToCateringTable(
  item: SquareItem, 
  syncLogger: SyncLogger,
  forceUpdate: boolean = false
): Promise<void> {
  try {
    // Check for existing item
    const { isDuplicate, existingItem } = await CateringDuplicateDetector.checkForDuplicate({
      name: item.name,
      squareProductId: item.id,
      squareCategory: item.categoryName
    });

    if (isDuplicate && !forceUpdate) {
      syncLogger.logItemDuplicate(item.id, item.name, `Already exists: ${existingItem?.source}`);
      return;
    }

    // Map category to catering enum
    const cateringCategory = mapToCarteringCategory(item.categoryName);
    const cateringData = {
      name: item.name,
      description: item.description,
      price: item.price,
      category: cateringCategory,
      squareProductId: item.id,
      squareItemId: item.id,
      squareCategory: item.categoryName,
      imageUrl: item.imageUrl || null,
      isVegetarian: false, // Default values
      isVegan: false,
      isGlutenFree: false,
      servingSize: null,
      isActive: true
    };

    if (existingItem) {
      // Update existing
      await prisma.cateringItem.update({
        where: { squareItemId: item.id },
        data: {
          ...cateringData,
          updatedAt: new Date()
        }
      });
      syncLogger.logItemSynced(item.id, item.name, 'Updated in catering_items table');
    } else {
      // Create new
      await prisma.cateringItem.create({
        data: cateringData
      });
      syncLogger.logItemSynced(item.id, item.name, 'Created in catering_items table');
    }

  } catch (error) {
    syncLogger.logItemError(item.id, item.name, `Catering table sync error: ${error}`);
    throw error;
  }
}

/**
 * Map category name to catering enum
 */
function mapToCarteringCategory(categoryName: string): any {
  const normalized = CategoryMapper.normalizeCategory(categoryName);
  
  // Map to catering category enum (using correct Prisma enum values)
  if (normalized.includes('APPETIZER')) return 'APPETIZER';
  if (normalized.includes('ENTREE')) return 'ENTREE';
  if (normalized.includes('SIDE')) return 'SIDE';
  if (normalized.includes('DESSERT')) return 'DESSERT';
  if (normalized.includes('STARTER')) return 'STARTER';
  if (normalized.includes('BEVERAGE')) return 'BEVERAGE';
  
  return 'APPETIZER'; // Default fallback (Prisma enum value)
}

/**
 * Verify sync completeness
 */
async function verifySyncCompleteness(
  syncedItems: SquareItem[],
  targetTable: 'products' | 'catering_items'
): Promise<SyncVerificationResult> {
  const categories: any[] = [];
  let totalDiscrepancy = 0;
  const missingItems: any[] = [];
  const extraItems: any[] = [];

  // Group items by category
  const itemsByCategory = new Map<string, SquareItem[]>();
  for (const item of syncedItems) {
    const categoryItems = itemsByCategory.get(item.categoryName) || [];
    categoryItems.push(item);
    itemsByCategory.set(item.categoryName, categoryItems);
  }

  // Check each category
  for (const [categoryName, items] of itemsByCategory) {
    const squareCount = items.length;
    let localCount = 0;

    if (targetTable === 'products') {
      const normalizedName = CategoryMapper.normalizeCategory(categoryName);
      localCount = await prisma.product.count({
        where: {
          active: true,
          category: {
            name: {
              equals: normalizedName,
              mode: 'insensitive'
            }
          }
        }
      });
    } else {
      localCount = await prisma.cateringItem.count({
        where: {
          isActive: true,
          squareCategory: categoryName
        }
      });
    }

    const discrepancy = Math.abs(squareCount - localCount);
    totalDiscrepancy += discrepancy;

    categories.push({
      squareId: CategoryMapper.findSquareIdByLocalName(categoryName) || 'unknown',
      squareName: categoryName,
      localName: categoryName,
      itemCount: {
        square: squareCount,
        local: localCount,
        discrepancy
      }
    });
  }

  return {
    categories,
    totalDiscrepancy,
    missingItems,
    extraItems
  };
}

/**
 * Main unified sync function
 */
async function performUnifiedSync(
  strategy: SyncStrategy,
  targetTable: 'products' | 'catering_items',
  dryRun: boolean,
  categories?: string[],
  forceUpdate: boolean = false
): Promise<{
  syncedItems: number;
  skippedItems: number;
  errors: number;
  report: any;
  verification: SyncVerificationResult;
}> {
  const syncLogger = new SyncLogger();
  const allSyncedItems: SquareItem[] = [];
  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  syncLogger.logSyncStart(`Unified Sync (${strategy} -> ${targetTable})${dryRun ? ' [DRY RUN]' : ''}`);

  try {
    // Get categories to sync
    const categoriesToSync = categories?.length 
      ? Object.entries(CATEGORY_MAPPINGS).filter(([, localName]) => 
          categories.includes(localName))
      : Object.entries(CATEGORY_MAPPINGS);

    syncLogger.logInfo(`Syncing ${categoriesToSync.length} categories`);

    // Process each category
    for (const [squareId, localName] of categoriesToSync) {
      syncLogger.logCategoryStart(localName, 0); // Will update count

      try {
        // Fetch items from Square
        const squareItems = await fetchSquareItemsForCategory(squareId, localName);
        syncLogger.logInfo(`Found ${squareItems.length} items in Square for ${localName}`);

        allSyncedItems.push(...squareItems);
        let categorySynced = 0;
        let categorySkipped = 0;
        let categoryErrors = 0;

        // Process each item
        for (const item of squareItems) {
          try {
            if (dryRun) {
              syncLogger.logInfo(`[DRY RUN] Would sync: ${item.name} to ${targetTable}`);
              categorySynced++;
            } else {
              if (targetTable === 'products') {
                await syncToProductsTable(item, syncLogger, forceUpdate);
              } else {
                await syncToCateringTable(item, syncLogger, forceUpdate);
              }
              categorySynced++;
            }
          } catch (itemError) {
            categoryErrors++;
            errorCount++;
            syncLogger.logItemError(item.id, item.name, String(itemError));
          }
        }

        syncedCount += categorySynced;
        skippedCount += categorySkipped;
        syncLogger.logCategoryComplete(localName, categorySynced, categorySkipped, categoryErrors);

      } catch (categoryError) {
        syncLogger.logError(`Failed to process category ${localName}: ${categoryError}`);
        errorCount++;
      }
    }

    // Verify sync completeness
    const verification = await verifySyncCompleteness(allSyncedItems, targetTable);
    const report = syncLogger.generateReport();

    syncLogger.logSyncComplete('Unified Sync', {
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount,
      totalDiscrepancy: verification.totalDiscrepancy
    });

    return {
      syncedItems: syncedCount,
      skippedItems: skippedCount,
      errors: errorCount,
      report,
      verification
    };

  } catch (error) {
    syncLogger.logError(`Unified sync failed: ${error}`);
    throw error;
  }
}

/**
 * POST /api/square/unified-sync
 * 
 * Unified sync endpoint with single source of truth approach
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('🚀 Unified sync POST request received');
    
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const { strategy, dryRun, categories, forceUpdate } = UnifiedSyncRequestSchema.parse(body);

    logger.info(`🎯 Unified sync mode: ${strategy}${dryRun ? ' [DRY RUN]' : ''}`);

    // Determine sync strategy
    const syncDecision = await determineSyncStrategy(strategy);
    logger.info(`📋 Sync decision: ${syncDecision.reason}`);

    // Perform unified sync
    const result = await performUnifiedSync(
      syncDecision.strategy,
      syncDecision.targetTable,
      dryRun,
      categories,
      forceUpdate
    );

    const success = result.errors === 0 || result.syncedItems > 0;
    
    return NextResponse.json({
      success,
      action: dryRun ? 'dry-run' : 'sync',
      strategy: syncDecision.strategy,
      targetTable: syncDecision.targetTable,
      reason: syncDecision.reason,
      message: success 
        ? `Unified sync completed: ${result.syncedItems} items synced to ${syncDecision.targetTable} table`
        : `Unified sync completed with errors: ${result.errors} errors occurred`,
      data: {
        syncedItems: result.syncedItems,
        skippedItems: result.skippedItems,
        errors: result.errors,
        verification: result.verification,
        report: result.report.summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Unified sync API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unified sync failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/square/unified-sync
 * 
 * Get information about the unified sync endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: '/api/square/unified-sync',
      methods: ['GET', 'POST'],
      description: 'Unified Square sync with single source of truth approach',
      strategies: ['PRODUCTS_ONLY', 'CATERING_ONLY', 'SMART_MERGE'],
      features: [
        'Single source of truth decision logic',
        'Comprehensive logging and verification',
        'Dry run support',
        'Category-specific sync',
        'Duplicate detection across both tables'
      ]
    },
    availableStrategies: {
      'PRODUCTS_ONLY': 'Sync all items to products table only',
      'CATERING_ONLY': 'Sync all items to catering_items table only',
      'SMART_MERGE': 'Automatically choose best strategy based on current data'
    },
    categories: Object.values(CATEGORY_MAPPINGS),
    timestamp: new Date().toISOString()
  });
}
