/**
 * Enhanced Square Sync API Endpoint
 *
 * Syncs ALL missing catering items from Square to the unified products table
 * while protecting existing items. Uses intelligent duplicate detection
 * and category-by-category processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/utils/logger';
import { z } from 'zod';
import { CateringDuplicateDetector } from '@/lib/catering-duplicate-detector';
import { searchCatalogObjects } from '@/lib/square/catalog-api';
import { prisma, withRetry } from '@/lib/db-unified';

// Explicit Vercel runtime configuration
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Request validation schema
const EnhancedSyncRequestSchema = z
  .object({
    preview: z.boolean().optional().default(false),
  })
  .strict();

// Category mappings from Square to our DB
const CATERING_CATEGORY_MAPPINGS = {
  UF2WY4B4635ZDAH4TCJVDQAN: 'CATERING- APPETIZERS',
  UOWY2ZPV24Q6K6BBD5CZRM4B: 'CATERING- BUFFET, STARTERS',
  HKLMA3HI34UUW6OCDMEKE224: 'CATERING- BUFFET, ENTREES',
  ZOWZ26OBOK3KUCT4ZBE6AV26: 'CATERING- BUFFET, SIDES',
  '4YZ7LW7PRJRDICUM76U3FTGU': 'CATERING- SHARE PLATTERS',
  '5ZH6ON3LTLXC2775JLBI3T3V': 'CATERING- DESSERTS',
  B527RVCSLNZ5XR3OZR76VNIH: 'CATERING- LUNCH, STARTERS',
  K2O3B7JUWT7QD7HGQ5AL2R2N: 'CATERING- LUNCH, ENTREES',
  '7F45BAY6KVJOBF4YXYBSL4JH': 'CATERING- LUNCH, SIDES',
};

interface SquareItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  variations: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}

interface CategorySummary {
  name: string;
  squareItems: number;
  dbItems: number;
  missing: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    hasImage: boolean;
  }>;
}

interface SyncSummary {
  category: string;
  synced: number;
  protected: number;
  skipped: number;
}

// Helper function to normalize category name for products table
function normalizeCategoryName(categoryName: string): string {
  // Normalize category names to match the unified products table format
  return categoryName
    .toUpperCase()
    .replace(/\s*-\s*/g, '-') // Remove spaces around hyphens
    .replace(/,\s*/g, '-') // Replace commas with hyphens
    .replace(/\s+/g, '-') // Replace remaining spaces with hyphens
    .trim();
}

// Helper function to fetch items from Square for a specific category
async function fetchSquareItemsForCategory(categoryId: string): Promise<SquareItem[]> {
  try {
    const requestBody = {
      object_types: ['ITEM'],
      query: {
        exact_query: {
          attribute_name: 'category_id',
          attribute_value: categoryId,
        },
      },
      limit: 100,
      include_related_objects: true,
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
            price = variation.item_variation_data.price_money.amount / 100; // Convert cents to dollars
          } else if (variation?.item_variation_data?.pricing_type === 'VARIABLE_PRICING') {
            // Handle variable pricing items - set reasonable base prices for Share Platters
            const itemName = item.item_data.name.toLowerCase();
            if (itemName.includes('plantain')) {
              price = 45.0; // Plantain Chips Platter base price
            } else if (itemName.includes('cheese') && itemName.includes('charcuterie')) {
              price = 150.0; // Cheese & Charcuterie Platter base price
            } else if (itemName.includes('cocktail') && itemName.includes('prawn')) {
              price = 80.0; // Cocktail Prawn Platter base price
            } else {
              // Default variable pricing base
              price = 50.0;
            }
          }

          // Find image from related objects
          let imageUrl: string | undefined;
          if (item.item_data.image_ids?.[0] && data.related_objects) {
            const imageObj = data.related_objects.find(
              (obj: any) => obj.type === 'IMAGE' && obj.id === item.item_data.image_ids[0]
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
            imageUrl,
            variations:
              item.item_data.variations?.map((v: any) => ({
                id: v.id,
                name: v.item_variation_data?.name || 'Regular',
                price: v.item_variation_data?.price_money?.amount
                  ? v.item_variation_data.price_money.amount / 100
                  : undefined,
              })) || [],
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

// Helper function to get current DB items count for a category
async function getDbItemsCountForCategory(categoryName: string): Promise<number> {
  try {
    const normalizedName = normalizeCategoryName(categoryName);
    const count = await prisma.product.count({
      where: {
        active: true,
        category: {
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
      },
    });

    logger.info(`Found ${count} existing items in ${categoryName} (products table)`);
    return count;
  } catch (error) {
    logger.error(`Error getting DB count for ${categoryName}:`, error);
    return 0;
  }
}

// Main function to preview missing items
async function previewMissingItems(): Promise<{
  totalMissing: number;
  categories: CategorySummary[];
}> {
  logger.info('🔍 Starting enhanced sync preview...');

  const categories: CategorySummary[] = [];
  let totalMissing = 0;

  for (const [squareCategoryId, categoryName] of Object.entries(CATERING_CATEGORY_MAPPINGS)) {
    try {
      const squareItems = await fetchSquareItemsForCategory(squareCategoryId);
      const dbItemsCount = await getDbItemsCountForCategory(categoryName);

      // Filter out items that already exist using our duplicate detector
      const missingItems: any[] = [];

      for (const squareItem of squareItems) {
        const { isDuplicate } = await CateringDuplicateDetector.checkForDuplicate({
          name: squareItem.name,
          squareProductId: squareItem.id,
          squareCategory: categoryName,
        });

        if (!isDuplicate) {
          missingItems.push({
            id: squareItem.id,
            name: squareItem.name,
            price: squareItem.price,
            hasImage: !!squareItem.imageUrl,
          });
        }
      }

      const categorySummary: CategorySummary = {
        name: categoryName,
        squareItems: squareItems.length,
        dbItems: dbItemsCount,
        missing: missingItems.length,
        items: missingItems,
      };

      categories.push(categorySummary);
      totalMissing += missingItems.length;

      logger.info(
        `📊 ${categoryName}: ${squareItems.length} in Square, ${dbItemsCount} in DB, ${missingItems.length} missing`
      );
    } catch (error) {
      logger.error(`❌ Error processing category ${categoryName}:`, error);
    }
  }

  return { totalMissing, categories };
}

// Main function to sync missing items
async function syncMissingItems(): Promise<{
  syncedItems: number;
  skippedItems: number;
  protectedItems: number;
  newCategories: string[];
  categoryBreakdown: SyncSummary[];
  errors: string[];
}> {
  logger.info('🚀 Starting enhanced sync execution...');

  let syncedItems = 0;
  let skippedItems = 0;
  let protectedItems = 0;
  const newCategories: string[] = [];
  const categoryBreakdown: SyncSummary[] = [];
  const errors: string[] = [];

  for (const [squareCategoryId, categoryName] of Object.entries(CATERING_CATEGORY_MAPPINGS)) {
    try {
      const squareItems = await fetchSquareItemsForCategory(squareCategoryId);
      let categorySynced = 0;
      let categoryProtected = 0;
      let categorySkipped = 0;

      logger.info(`🔄 Processing ${categoryName} (${squareItems.length} items)...`);

      for (const squareItem of squareItems) {
        try {
          const { isDuplicate, existingItem, matchType } =
            await CateringDuplicateDetector.checkForDuplicate({
              name: squareItem.name,
              squareProductId: squareItem.id,
              squareCategory: categoryName,
            });

          if (isDuplicate && existingItem) {
            if (existingItem.source === 'square') {
              // Item already synced from Square - protect it
              categoryProtected++;
              protectedItems++;
              logger.info(`🛡️  Protected \"${squareItem.name}\" - already synced from Square`);
            } else {
              // Manual item with similar name - skip to avoid conflicts
              categorySkipped++;
              skippedItems++;
              logger.info(`⏭️  Skipped \"${squareItem.name}\" - ${matchType} with manual item`);
            }
            continue;
          }

          // Item doesn't exist - sync it to products table
          logger.info(
            `Syncing new item: "${squareItem.name}" ($${squareItem.price}) to ${categoryName}`
          );

          // Get or create category in products table
          const normalizedCategoryName = normalizeCategoryName(categoryName);
          let category = await prisma.category.findFirst({
            where: {
              name: {
                equals: normalizedCategoryName,
                mode: 'insensitive',
              },
            },
          });

          if (!category) {
            category = await prisma.category.create({
              data: {
                name: normalizedCategoryName,
                description: `Category for ${normalizedCategoryName} products`,
                slug: normalizedCategoryName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                order: 0,
                active: true,
              },
            });
            logger.info(`Created new category: ${normalizedCategoryName}`);
          }

          // Create unique slug for the product
          const baseSlug = squareItem.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const existingSlug = await prisma.product.findFirst({
            where: { slug: baseSlug },
          });
          const slug = existingSlug ? `${baseSlug}-${squareItem.id.substring(0, 8)}` : baseSlug;

          // Create the product in the database
          const createdProduct = await prisma.product.create({
            data: {
              squareId: squareItem.id,
              name: squareItem.name,
              slug,
              description: squareItem.description || '',
              price: squareItem.price,
              images: squareItem.imageUrl ? [squareItem.imageUrl] : [],
              categoryId: category.id,
              featured: false,
              active: true,
              variants: {
                create: squareItem.variations.map(v => ({
                  name: v.name,
                  price: v.price || null,
                  squareVariantId: v.id,
                })),
              },
            },
          });

          categorySynced++;
          syncedItems++;
          logger.info(
            `✅ Synced \"${squareItem.name}\" - $${squareItem.price} to products table (ID: ${createdProduct.id})`
          );
        } catch (itemError) {
          const errorMsg = `Failed to sync ${squareItem.name}: ${itemError}`;
          errors.push(errorMsg);
          logger.error(`❌ ${errorMsg}`);
          categorySkipped++;
          skippedItems++;
        }
      }

      categoryBreakdown.push({
        category: categoryName,
        synced: categorySynced,
        protected: categoryProtected,
        skipped: categorySkipped,
      });

      logger.info(
        `📊 ${categoryName} complete: ${categorySynced} synced, ${categoryProtected} protected, ${categorySkipped} skipped`
      );
    } catch (error) {
      const errorMsg = `Failed to process category ${categoryName}: ${error}`;
      errors.push(errorMsg);
      logger.error(`❌ ${errorMsg}`);
    }
  }

  return {
    syncedItems,
    skippedItems,
    protectedItems,
    newCategories,
    categoryBreakdown,
    errors,
  };
}

/**
 * POST /api/square/enhanced-sync
 *
 * Enhanced sync endpoint that processes all missing catering items
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('🚀 Enhanced sync POST request received');

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

    // Validate request
    let body;
    try {
      const text = await request.text();
      logger.info(`📝 Request body text: "${text}"`);

      if (!text.trim()) {
        // Empty body, use default values
        logger.info('📭 Empty body received, using defaults');
        body = { preview: false };
      } else {
        body = JSON.parse(text);
        logger.info('📦 Parsed body:', body);
      }
    } catch (error) {
      logger.error('❌ Failed to parse request body:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Parse and validate the request schema
    let preview: boolean;
    try {
      const parsed = EnhancedSyncRequestSchema.parse(body);
      preview = parsed.preview;
      logger.info(`🎯 Enhanced sync mode: ${preview ? 'PREVIEW' : 'EXECUTE'}`);
    } catch (error) {
      logger.error('Invalid request schema:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format. Expected: { preview?: boolean }',
        },
        { status: 400 }
      );
    }

    if (preview) {
      // Preview mode - show what would be synced
      const previewResult = await previewMissingItems();

      return NextResponse.json({
        success: true,
        action: 'preview',
        data: previewResult,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Execute mode - perform the actual sync
      const syncResult = await syncMissingItems();

      const success = syncResult.errors.length === 0 || syncResult.syncedItems > 0;

      return NextResponse.json({
        success,
        action: 'sync',
        message: success
          ? `Enhanced sync completed: ${syncResult.syncedItems} items synced, ${syncResult.protectedItems} items protected`
          : `Enhanced sync completed with errors: ${syncResult.errors.length} errors occurred`,
        data: syncResult,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('❌ Enhanced sync API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Enhanced sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/square/enhanced-sync
 *
 * Get information about the enhanced sync endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: '/api/square/enhanced-sync',
      methods: ['GET', 'POST'],
      description:
        'Enhanced Square sync - syncs ALL missing catering items to unified products table while protecting existing items',
      protection: 'Existing products are protected using intelligent duplicate detection',
      authentication: 'Required',
      target: 'products table (unified data model)',
    },
    availableActions: {
      'POST with preview: true': 'Preview what items will be synced',
      'POST with preview: false': 'Execute enhanced sync',
    },
    categories: Object.values(CATERING_CATEGORY_MAPPINGS),
    timestamp: new Date().toISOString(),
  });
}
