/**
 * Square Sync Verification API Endpoint
 * 
 * Phase 1 of the fix plan: Diagnosis & Verification
 * This endpoint verifies the sync status between Square and local database
 * to identify discrepancies and missing items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/utils/logger';
import { searchCatalogObjects } from '@/lib/square/catalog-api';
import { prisma, withRetry } from '@/lib/db-unified';
import type { CategoryMapping, SyncVerificationResult } from '@/types/square-sync';

// Category mappings from Square to local DB (from enhanced-sync)
const CATERING_CATEGORY_MAPPINGS = {
  'UF2WY4B4635ZDAH4TCJVDQAN': 'CATERING- APPETIZERS',
  'UOWY2ZPV24Q6K6BBD5CZRM4B': 'CATERING- BUFFET, STARTERS', 
  'HKLMA3HI34UUW6OCDMEKE224': 'CATERING- BUFFET, ENTREES',
  'ZOWZ26OBOK3KUCT4ZBE6AV26': 'CATERING- BUFFET, SIDES',
  '4YZ7LW7PRJRDICUM76U3FTGU': 'CATERING- SHARE PLATTERS',
  '5ZH6ON3LTLXC2775JLBI3T3V': 'CATERING- DESSERTS',
  'B527RVCSLNZ5XR3OZR76VNIH': 'CATERING- LUNCH, STARTERS',
  'K2O3B7JUWT7QD7HGQ5AL2R2N': 'CATERING- LUNCH, ENTREES',
  '7F45BAY6KVJOBF4YXYBSL4JH': 'CATERING- LUNCH, SIDES',
} as const;

/**
 * Fetch items from Square for a specific category
 */
async function fetchSquareItemsForCategory(categoryId: string): Promise<any[]> {
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

    if (!data.objects) {
      return [];
    }

    return data.objects.filter((obj: any) => obj.type === 'ITEM');
  } catch (error) {
    logger.error(`Error fetching Square items for category ${categoryId}:`, error);
    throw error;
  }
}

/**
 * Get counts from local database for both products and catering_items tables
 */
async function getLocalItemCounts(): Promise<Record<string, { products: number; cateringItems: number; total: number }>> {
  try {
    const counts: Record<string, { products: number; cateringItems: number; total: number }> = {};

    // Get counts from products table
    const productsWithCategories = await prisma.product.findMany({
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
      }
    });

    // Get catering products from products table (catering_items table removed)
    const cateringProducts = productsWithCategories.filter(product => 
      product.category.name.includes('CATERING')
    );

    // Count products by category
    for (const product of productsWithCategories) {
      const categoryName = product.category.name;
      if (!counts[categoryName]) {
        counts[categoryName] = { products: 0, cateringItems: 0, total: 0 };
      }
      counts[categoryName].products++;
    }

    // Catering items are now counted in the products section above
    // (catering_items table removed - using unified products approach)

    // Calculate totals (cateringItems count now always 0)
    for (const categoryName in counts) {
      counts[categoryName].cateringItems = 0; // Always 0 since table removed
      counts[categoryName].total = counts[categoryName].products;
    }

    return counts;
  } catch (error) {
    logger.error('Error getting local item counts:', error);
    throw error;
  }
}

/**
 * Find missing items by comparing Square and local data
 */
async function findMissingItems(): Promise<Array<{ squareId: string; name: string; category: string }>> {
  const missingItems: Array<{ squareId: string; name: string; category: string }> = [];

  for (const [squareCategoryId, localCategoryName] of Object.entries(CATERING_CATEGORY_MAPPINGS)) {
    try {
      const squareItems = await fetchSquareItemsForCategory(squareCategoryId);
      
      for (const squareItem of squareItems) {
        const squareId = squareItem.id;
        const name = squareItem.item_data?.name || 'Unnamed Item';

        // Check if item exists in products table
        const existsInProducts = await prisma.product.findFirst({
          where: {
            squareId: squareId
          },
          include: {
            category: true
          }
        });

        // Check if item exists in catering categories in products table
        // (catering_items table removed - checking catering categories in products)
        const existsInCatering = existsInProducts && existsInProducts.category.name.includes('CATERING');

        if (!existsInProducts) {
          missingItems.push({
            squareId,
            name,
            category: localCategoryName
          });
        }
      }
    } catch (error) {
      logger.error(`Error checking missing items for category ${localCategoryName}:`, error);
    }
  }

  return missingItems;
}

/**
 * Find extra items that exist locally but not in Square
 */
async function findExtraItems(): Promise<Array<{ id: string; name: string; category: string }>> {
  const extraItems: Array<{ id: string; name: string; category: string }> = [];

  try {
    // Get all Square item IDs for comparison
    const allSquareIds = new Set<string>();
    
    for (const [squareCategoryId] of Object.entries(CATERING_CATEGORY_MAPPINGS)) {
      const squareItems = await fetchSquareItemsForCategory(squareCategoryId);
      for (const item of squareItems) {
        allSquareIds.add(item.id);
      }
    }

    // Check products table for items with Square IDs not in Square
    const productsWithSquareIds = await prisma.product.findMany({
      where: {
        squareId: {
          not: null
        } as any,
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

    for (const product of productsWithSquareIds) {
      if (product.squareId && !allSquareIds.has(product.squareId)) {
        extraItems.push({
          id: product.id,
          name: product.name,
          category: product.category.name
        });
      }
    }

    // Catering products are already checked in the productsWithSquareIds loop above
    // (catering_items table removed - using unified products approach)

  } catch (error) {
    logger.error('Error finding extra items:', error);
  }

  return extraItems;
}

/**
 * Compare categories and generate mappings with discrepancies
 */
async function compareCategories(): Promise<CategoryMapping[]> {
  const categoryMappings: CategoryMapping[] = [];
  const localCounts = await getLocalItemCounts();

  for (const [squareId, localName] of Object.entries(CATERING_CATEGORY_MAPPINGS)) {
    try {
      // Get Square count
      const squareItems = await fetchSquareItemsForCategory(squareId);
      const squareCount = squareItems.length;

      // Get local count (from both tables)
      const localCount = localCounts[localName]?.total || 0;
      const discrepancy = Math.abs(squareCount - localCount);

      categoryMappings.push({
        squareId,
        squareName: localName, // We use local name as Square name for simplicity
        localName,
        itemCount: {
          square: squareCount,
          local: localCount,
          discrepancy
        }
      });

      logger.info(`Category ${localName}: Square=${squareCount}, Local=${localCount}, Discrepancy=${discrepancy}`);
    } catch (error) {
      logger.error(`Error comparing category ${localName}:`, error);
      // Add category with error state
      categoryMappings.push({
        squareId,
        squareName: localName,
        localName,
        itemCount: {
          square: 0,
          local: localCounts[localName]?.total || 0,
          discrepancy: localCounts[localName]?.total || 0
        }
      });
    }
  }

  return categoryMappings;
}

/**
 * Generate recommendations based on verification results
 */
function generateRecommendations(verificationResult: SyncVerificationResult): string[] {
  const recommendations: string[] = [];

  if (verificationResult.totalDiscrepancy > 0) {
    recommendations.push(`Found ${verificationResult.totalDiscrepancy} total discrepancies across categories`);
  }

  if (verificationResult.missingItems.length > 0) {
    recommendations.push(`${verificationResult.missingItems.length} items exist in Square but not locally - consider running enhanced sync`);
  }

  if (verificationResult.extraItems.length > 0) {
    recommendations.push(`${verificationResult.extraItems.length} items exist locally but not in Square - check for orphaned data`);
  }

  // Check for dual storage issues
  const categoriesWithBothTables = verificationResult.categories.filter(cat => {
    // This is a simplified check - in real implementation we'd track which table has items
    return cat.itemCount.local > cat.itemCount.square;
  });

  if (categoriesWithBothTables.length > 0) {
    recommendations.push('Some categories may have items in both products and catering_items tables - consider data consolidation');
  }

  if (recommendations.length === 0) {
    recommendations.push('Sync appears to be in good state - no major discrepancies detected');
  }

  return recommendations;
}

/**
 * GET /api/square/verify-sync
 * 
 * Verify sync status between Square and local database
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 Starting Square sync verification...');

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

    // Perform verification
    const startTime = Date.now();

    const [categoryMappings, missingItems, extraItems] = await Promise.all([
      compareCategories(),
      findMissingItems(),
      findExtraItems()
    ]);

    const totalDiscrepancy = categoryMappings.reduce((sum, cat) => sum + cat.itemCount.discrepancy, 0);

    const verificationResult: SyncVerificationResult = {
      categories: categoryMappings,
      totalDiscrepancy,
      missingItems,
      extraItems
    };

    const recommendations = generateRecommendations(verificationResult);
    const duration = Date.now() - startTime;

    logger.info(`✅ Sync verification completed in ${duration}ms`);
    logger.info(`📊 Results: ${totalDiscrepancy} discrepancies, ${missingItems.length} missing, ${extraItems.length} extra`);

    return NextResponse.json({
      success: true,
      data: verificationResult,
      recommendations,
      metadata: {
        verificationId: `verify-${Date.now()}`,
        timestamp: new Date().toISOString(),
        duration,
        categoriesChecked: categoryMappings.length
      }
    });

  } catch (error) {
    logger.error('❌ Sync verification error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync verification failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST /api/square/verify-sync
 * 
 * Run verification with optional parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryFilter, includeDetails = true } = body;

    logger.info(`🔍 Starting targeted sync verification with filter: ${categoryFilter}`);

    // For now, delegate to GET but with potential for filtered verification
    // This can be expanded to handle specific category verification
    return GET(request);

  } catch (error) {
    logger.error('❌ Targeted sync verification error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Targeted verification failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
