/**
 * Debug API endpoint for inspecting Square sync data
 * GET /api/square/debug?itemId=[square_item_id] - Debug specific item
 * GET /api/square/debug - Debug all items with issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { squareClient } from '@/lib/square/client';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

interface DebugInfo {
  itemId?: string;
  rawSquareData?: any;
  extractedData?: {
    name: string;
    imageIds: string[];
    imageUrls: string[];
    price: {
      amount: number;
      dollars: number;
    };
    category: {
      id?: string;
      name?: string;
    };
  };
  databaseData?: {
    id: string;
    name: string;
    price: string;
    images: string[];
    categoryName?: string;
  };
  issues?: string[];
  transformationTest?: {
    brokenExtraction: any;
    fixedExtraction: any;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication using Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, allow all authenticated users (you can add role checking later)
    logger.info(`🔐 Debug endpoint accessed by user: ${user.email}`);

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (itemId) {
      // Debug specific item
      const debugInfo = await debugSpecificItem(itemId);
      return NextResponse.json({
        success: true,
        itemId,
        debug: debugInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      // Debug all items - show summary of issues
      const summary = await debugAllItems();
      return NextResponse.json({
        success: true,
        summary,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Debug a specific Square item
 */
async function debugSpecificItem(itemId: string): Promise<DebugInfo> {
  const debugInfo: DebugInfo = {
    itemId,
    issues: []
  };

  try {
    if (!squareClient.catalogApi) {
      throw new Error('Square catalog API is not initialized');
    }
    
    // Fetch item from Square
    const itemResponse = await squareClient.catalogApi.retrieveCatalogObject(itemId);
    const squareItem = itemResponse.result?.object;

    if (!squareItem) {
      debugInfo.issues?.push('Item not found in Square');
      return debugInfo;
    }

    debugInfo.rawSquareData = squareItem;

    // Fetch related objects (images, categories)
    const relatedIds = [];
    if (squareItem.item_data?.image_ids) {
      relatedIds.push(...squareItem.item_data.image_ids);
    }
    if (squareItem.item_data?.categories) {
      relatedIds.push(...squareItem.item_data.categories.map((cat: any) => cat.id));
    }

    let relatedObjects: any[] = [];
    if (relatedIds.length > 0) {
      try {
        if (!squareClient.catalogApi) {
          throw new Error('Square catalog API is not initialized');
        }
        
        // Retrieve related objects one by one since batch method doesn't exist
        const relatedPromises = relatedIds.map(id => 
          squareClient.catalogApi!.retrieveCatalogObject(id)
        );
        const relatedResponses = await Promise.all(relatedPromises);
        relatedObjects = relatedResponses
          .map(response => response.result?.object)
          .filter(Boolean);
      } catch (error) {
        debugInfo.issues?.push(`Failed to fetch related objects: ${error}`);
      }
    }

    // Extract data using current logic (which has issues)
    debugInfo.extractedData = extractItemData(squareItem, relatedObjects);

    // Check for issues
    if (debugInfo.extractedData.imageIds.length > 0 && debugInfo.extractedData.imageUrls.length === 0) {
      debugInfo.issues?.push('Has image IDs but no image URLs extracted');
    }
    if (debugInfo.extractedData.price.dollars === 0) {
      debugInfo.issues?.push('Price extraction failed - showing $0.00');
    }
    if (!debugInfo.extractedData.category.name) {
      debugInfo.issues?.push('Category name not extracted');
    }

    // Find corresponding database record
    const dbProduct = await prisma.product.findFirst({
      where: { squareId: itemId },
      include: { category: true }
    });

    if (dbProduct) {
      debugInfo.databaseData = {
        id: dbProduct.id,
        name: dbProduct.name,
        price: dbProduct.price.toString(),
        images: dbProduct.images,
        categoryName: dbProduct.category?.name
      };

      // Compare Square vs Database
      const priceMismatch = Math.abs(parseFloat(dbProduct.price.toString()) - debugInfo.extractedData.price.dollars) > 0.01;
      const imageMismatch = dbProduct.images.length !== debugInfo.extractedData.imageUrls.length;
      const categoryMismatch = dbProduct.category?.name !== debugInfo.extractedData.category.name;

      if (priceMismatch) {
        debugInfo.issues?.push(`Price mismatch: DB=$${dbProduct.price} vs Square=$${debugInfo.extractedData.price.dollars}`);
      }
      if (imageMismatch) {
        debugInfo.issues?.push(`Image count mismatch: DB=${dbProduct.images.length} vs Square=${debugInfo.extractedData.imageUrls.length}`);
      }
      if (categoryMismatch) {
        debugInfo.issues?.push(`Category mismatch: DB="${dbProduct.category?.name}" vs Square="${debugInfo.extractedData.category.name}"`);
      }
    } else {
      debugInfo.issues?.push('Item not found in database');
    }

    // Test transformation with broken vs fixed logic
    debugInfo.transformationTest = {
      brokenExtraction: {
        price: extractPriceBroken(squareItem.item_data),
        imageIds: (squareItem as any).itemData?.imageIds, // This will be undefined
      },
      fixedExtraction: {
        price: extractPriceFixed(squareItem.item_data),
        imageIds: squareItem.item_data?.image_ids,
        imageUrls: extractImagesFixed(squareItem, relatedObjects)
      }
    };

  } catch (error) {
    debugInfo.issues?.push(`Debug error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return debugInfo;
}

/**
 * Debug all items - return summary of issues
 */
async function debugAllItems() {
  try {
    if (!squareClient.catalogApi) {
      throw new Error('Square catalog API is not initialized');
    }
    
    // Fetch sample of items from Square
    const response = await squareClient.catalogApi.searchCatalogObjects({
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false,
      limit: 20
    });

    const items = response.result?.objects || [];
    const relatedObjects = response.result?.related_objects || [];

    const stats = {
      totalItems: items.length,
      withImages: 0,
      withoutImages: 0,
      withValidPrice: 0,
      withoutValidPrice: 0,
      withCategory: 0,
      withoutCategory: 0,
      itemsWithIssues: [] as any[]
    };

    for (const item of items) {
      if (!item.item_data) continue;

      const extracted = extractItemData(item, relatedObjects);
      const hasImages = extracted.imageUrls.length > 0;
      const hasValidPrice = extracted.price.dollars > 0;
      const hasCategory = !!extracted.category.name;

      if (hasImages) stats.withImages++;
      else stats.withoutImages++;

      if (hasValidPrice) stats.withValidPrice++;
      else stats.withoutValidPrice++;

      if (hasCategory) stats.withCategory++;
      else stats.withoutCategory++;

      // Items with issues
      if (!hasImages || !hasValidPrice || !hasCategory) {
        stats.itemsWithIssues.push({
          id: item.id,
          name: item.item_data.name,
          issues: {
            noImages: !hasImages,
            noPrice: !hasValidPrice,
            noCategory: !hasCategory
          }
        });
      }
    }

    // Database comparison
    const dbProductCount = await prisma.product.count();
    const dbProductsWithIssues = await prisma.product.count({
      where: {
        OR: [
          { price: 0 },
          { images: { equals: [] } }
        ]
      }
    });

    return {
      square: stats,
      database: {
        totalProducts: dbProductCount,
        productsWithIssues: dbProductsWithIssues
      },
      recommendations: generateRecommendations(stats)
    };

  } catch (error) {
    throw new Error(`Failed to debug all items: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract data from Square item (current logic with issues)
 */
function extractItemData(item: any, relatedObjects: any[]) {
  const itemData = item.item_data;
  const name = itemData?.name || 'Unknown';

  // Extract images (current broken logic)
  const imageIds = itemData?.image_ids || [];
  const imageUrls: string[] = [];
  
  for (const imageId of imageIds) {
    const imageObj = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');
    if (imageObj?.image_data?.url) {
      imageUrls.push(imageObj.image_data.url);
    }
  }

  // Extract price (current broken logic)
  const variations = itemData?.variations || [];
  let priceAmount = 0;
  let priceDollars = 0;

  if (variations.length > 0) {
    const firstVar = variations[0];
    const priceData = firstVar.item_variation_data?.price_money;
    if (priceData?.amount) {
      priceAmount = parseInt(priceData.amount.toString());
      priceDollars = priceAmount / 100;
    }
  }

  // Extract category
  const categories = itemData?.categories || [];
  let categoryId: string | undefined;
  let categoryName: string | undefined;

  if (categories.length > 0) {
    categoryId = categories[0].id;
    const categoryObj = relatedObjects.find(obj => obj.id === categoryId && obj.type === 'CATEGORY');
    categoryName = categoryObj?.category_data?.name;
  }

  return {
    name,
    imageIds,
    imageUrls,
    price: {
      amount: priceAmount,
      dollars: priceDollars
    },
    category: {
      id: categoryId,
      name: categoryName
    }
  };
}

/**
 * Test broken price extraction
 */
function extractPriceBroken(itemData: any): number {
  const variations = itemData?.variations || [];
  if (variations.length === 0) return 0;

  const firstVariation = variations[0];
  const priceData = firstVariation.itemVariationData?.priceMoney; // Wrong field name
  
  if (priceData && priceData.amount) {
    return parseInt(priceData.amount) / 100;
  }

  return 0;
}

/**
 * Test fixed price extraction
 */
function extractPriceFixed(itemData: any): number {
  const variations = itemData?.variations || [];
  if (variations.length === 0) return 0;

  const firstVariation = variations[0];
  const priceData = firstVariation.item_variation_data?.price_money; // Fixed field name
  
  if (priceData && priceData.amount) {
    return parseInt(priceData.amount.toString()) / 100;
  }

  return 0;
}

/**
 * Test fixed image extraction
 */
function extractImagesFixed(product: any, relatedObjects: any[]): string[] {
  const images: string[] = [];
  
  if (product.item_data?.image_ids) {
    for (const imageId of product.item_data.image_ids) {
      const imageObject = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');
      if (imageObject?.image_data?.url) {
        images.push(imageObject.image_data.url);
      }
    }
  }

  return images;
}

/**
 * Generate recommendations based on debug results
 */
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.withoutImages > 0) {
    recommendations.push(`Fix image extraction: ${stats.withoutImages} items missing images`);
  }

  if (stats.withoutValidPrice > 0) {
    recommendations.push(`Fix price extraction: ${stats.withoutValidPrice} items with $0.00 price`);
  }

  if (stats.withoutCategory > 0) {
    recommendations.push(`Fix category mapping: ${stats.withoutCategory} items without categories`);
  }

  if (recommendations.length === 0) {
    recommendations.push('All items look good! The sync should be working correctly.');
  }

  return recommendations;
}
