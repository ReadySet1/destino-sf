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
import { CategoryMapper, CATEGORY_MAPPINGS, LEGACY_CATEGORY_MAPPINGS } from '@/lib/square/category-mapper';
import { CateringDuplicateDetector } from '@/lib/catering-duplicate-detector';
import { searchCatalogObjects } from '@/lib/square/catalog-api';
import { prisma } from '@/lib/db';
import { archiveRemovedSquareProducts } from '@/lib/square/archive-handler';
import type { SyncVerificationResult } from '@/types/square-sync';

// Request validation schema
const UnifiedSyncRequestSchema = z.object({
  strategy: z.enum(['PRODUCTS_ONLY', 'CATERING_ONLY', 'SMART_MERGE']).optional(), // Ignored for backward compatibility
  dryRun: z.boolean().optional().default(false),
  categories: z.array(z.string()).optional(), // Specific categories to sync
  forceUpdate: z.boolean().optional().default(false),
}).strict();

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
  strategy: 'PRODUCTS_ONLY';
  targetTable: 'products';
  reason: string;
}

/**
 * Determine the sync strategy - simplified to use only products table
 */
async function determineSyncStrategy(): Promise<SyncDecision> {
  // Get current state of products table
  const productsCount = await prisma.product.count({
    where: {
      active: true,
      category: {
        name: {
          contains: 'CATERING'
        }
      }
    }
  });

  logger.info(`Current state: ${productsCount} catering items in products table`);

  return {
    strategy: 'PRODUCTS_ONLY',
    targetTable: 'products',
    reason: 'Unified data model - products table only'
  };
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
          } else if (variation?.item_variation_data?.pricing_type === 'VARIABLE_PRICING') {
            // Handle variable pricing items - set reasonable base prices for Share Platters
            const itemName = item.item_data.name.toLowerCase();
            if (itemName.includes('plantain')) {
              price = 45.00; // Plantain Chips Platter base price
            } else if (itemName.includes('cheese') && itemName.includes('charcuterie')) {
              price = 150.00; // Cheese & Charcuterie Platter base price
            } else if (itemName.includes('cocktail') && itemName.includes('prawn')) {
              price = 80.00; // Cocktail Prawn Platter base price
            } else {
              // Default variable pricing base for other items
              price = 50.00;
            }
            logger.info(`🔧 Variable pricing detected for "${item.item_data.name}" - using base price: $${price}`);
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
 * Verify sync completeness
 */
async function verifySyncCompleteness(
  syncedItems: SquareItem[]
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

  // Check each category in products table only
  for (const [categoryName, items] of itemsByCategory) {
    const squareCount = items.length;
    const normalizedName = CategoryMapper.normalizeCategory(categoryName);
    
    const localCount = await prisma.product.count({
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
  dryRun: boolean,
  categories?: string[],
  forceUpdate: boolean = false
): Promise<{
  syncedItems: number;
  skippedItems: number;
  errors: number;
  report: any;
  verification: SyncVerificationResult;
  archiveResult: any;
}> {
  const syncLogger = new SyncLogger();
  const allSyncedItems: SquareItem[] = [];
  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let archiveResult = null;

  const syncId = `sync_${Date.now()}`;
  syncLogger.logSyncStart(`Unified Sync (PRODUCTS_ONLY)${dryRun ? ' [DRY RUN]' : ''}`, { syncId, timestamp: new Date().toISOString() });

  try {
    // Get categories to sync (use LEGACY_CATEGORY_MAPPINGS to match database format)
    const categoriesToSync = categories?.length 
      ? Object.entries(LEGACY_CATEGORY_MAPPINGS).filter(([, localName]) => 
          categories.includes(localName))
      : Object.entries(LEGACY_CATEGORY_MAPPINGS);

    syncLogger.logInfo(`Syncing ${categoriesToSync.length} categories`, { count: categoriesToSync.length, categories: categoriesToSync.map(([,name]) => name) });

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
              // During dry run, log items as if they would be synced so they appear in the report
              syncLogger.logItemProcessed(item.id, item.name, 'synced', '[DRY RUN] Would sync to products table');
              categorySynced++;
            } else {
              await syncToProductsTable(item, syncLogger, forceUpdate);
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

    // Archive products that are no longer in Square (if not dry run)
    if (!dryRun) {
      try {
        const allValidSquareIds = allSyncedItems.map(item => item.id);
        archiveResult = await archiveRemovedSquareProducts(allValidSquareIds);
        syncLogger.logInfo(`🗃️ Archive operation: ${archiveResult.archived} products archived, ${archiveResult.errors} errors`);
      } catch (archiveError) {
        syncLogger.logError(`❌ Archive operation failed: ${archiveError}`);
        errorCount++;
      }
    }

    // Verify sync completeness
    const verification = await verifySyncCompleteness(allSyncedItems);
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
      verification,
      archiveResult
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
    const { strategy: _ignoredStrategy, dryRun, categories, forceUpdate } = UnifiedSyncRequestSchema.parse(body);

    // Log any deprecated strategy parameter for monitoring
    if (_ignoredStrategy && _ignoredStrategy !== 'PRODUCTS_ONLY') {
      logger.warn(`🔄 Deprecated strategy '${_ignoredStrategy}' ignored - using PRODUCTS_ONLY (unified data model)`);
    }

    logger.info(`🎯 Unified sync mode: PRODUCTS_ONLY${dryRun ? ' [DRY RUN]' : ''}`);

    // Determine sync strategy
    const syncDecision = await determineSyncStrategy();
    logger.info(`📋 Sync decision: ${syncDecision.reason}`);

    // Perform unified sync
    const result = await performUnifiedSync(
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
      message: dryRun
        ? success 
          ? `[DRY RUN] Unified sync preview completed: ${result.syncedItems} items would be synced to products table`
          : `[DRY RUN] Unified sync preview completed with errors: ${result.errors} errors occurred`
        : success 
          ? `Unified sync completed: ${result.syncedItems} items synced to products table`
          : `Unified sync completed with errors: ${result.errors} errors occurred`,
      data: {
        syncedItems: result.syncedItems,
        skippedItems: result.skippedItems,
        errors: result.errors,
        verification: result.verification,
        report: result.report.summary,
        archive: result.archiveResult || null
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
      description: 'Unified Square sync with single source of truth approach - products table only',
      strategy: 'PRODUCTS_ONLY',
      features: [
        'Single source of truth - products table only',
        'Comprehensive logging and verification',
        'Dry run support',
        'Category-specific sync',
        'Simplified duplicate detection'
      ],
      deprecatedParameters: [
        'strategy - Always uses PRODUCTS_ONLY, other values are ignored for backward compatibility'
      ]
    },
    strategy: {
      'PRODUCTS_ONLY': 'Sync all items to products table only - unified data model',
      'DEPRECATED': 'CATERING_ONLY and SMART_MERGE strategies are no longer supported'
    },
    categories: Object.values(LEGACY_CATEGORY_MAPPINGS),
    timestamp: new Date().toISOString()
  });
}
