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
import { VariationGrouper } from '@/lib/square/variation-grouper';
import { searchCatalogObjects } from '@/lib/square/catalog-api';
import { cachedSearchCatalogObjects } from '@/lib/square/api-cache';
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

// Category caching system for performance optimization
const categoryCache = new Map<string, any>();

/**
 * Preload all categories into memory for fast lookups during sync
 */
async function preloadCategoryCache(): Promise<void> {
  logger.info('🔄 Preloading category cache...');
  const startTime = Date.now();
  
  try {
    const categories = await prisma.category.findMany();
    categoryCache.clear();
    
    categories.forEach(cat => {
      if (cat.squareId) {
        categoryCache.set(`square:${cat.squareId}`, cat);
      }
      categoryCache.set(`name:${cat.name}`, cat);
    });
    
    const loadTime = Date.now() - startTime;
    logger.info(`✅ Loaded ${categories.length} categories into cache (${loadTime}ms)`);
  } catch (error) {
    logger.error('❌ Failed to preload category cache:', error);
    throw error;
  }
}

/**
 * Pre-load all existing slugs for performance optimization
 */
let existingSlugsCache: Set<string> | null = null;

async function loadExistingSlugs(): Promise<Set<string>> {
  if (existingSlugsCache) {
    return existingSlugsCache;
  }
  
  const products = await prisma.product.findMany({
    select: { slug: true },
    where: { slug: { not: null } }
  });
  
  existingSlugsCache = new Set(products.map(p => p.slug).filter((slug): slug is string => slug !== null));
  logger.info(`📋 Loaded ${existingSlugsCache.size} existing slugs for duplicate checking`);
  return existingSlugsCache;
}

/**
 * Clear caches for fresh sync
 */
function clearSyncCaches(): void {
  existingSlugsCache = null;
  categoryCache.clear();
  logger.info('🗑️ Cleared sync caches for fresh start');
}

/**
 * Generate a unique slug for a product (optimized with caching)
 */
async function generateUniqueSlug(name: string, squareId: string, existingSlug?: string): Promise<string> {
  // If updating an existing product and it already has a slug, use it
  if (existingSlug) {
    return existingSlug;
  }
  
  // Load existing slugs cache for performance
  const existingSlugs = await loadExistingSlugs();
  
  // Generate base slug
  const baseSlug = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Check if base slug is available (using cache)
  if (!existingSlugs.has(baseSlug)) {
    existingSlugs.add(baseSlug); // Add to cache to prevent duplicates in same batch
    return baseSlug;
  }
  
  // If slug exists, append Square ID for uniqueness
  const uniqueSlug = `${baseSlug}-${squareId.substring(0, 8).toLowerCase()}`;
  
  // Check unique slug (using cache)
  if (!existingSlugs.has(uniqueSlug)) {
    existingSlugs.add(uniqueSlug); // Add to cache
    return uniqueSlug;
  }
  
  // Ultimate fallback: append timestamp
  const timestampSlug = `${baseSlug}-${squareId.substring(0, 8).toLowerCase()}-${Date.now()}`;
  existingSlugs.add(timestampSlug); // Add to cache
  return timestampSlug;
}

/**
 * Get or create category using cache for performance
 */
async function getOrCreateCategory(squareId: string, name: string): Promise<any> {
  // Check cache first by Square ID
  let category = categoryCache.get(`square:${squareId}`);
  if (category) {
    return category;
  }
  
  // Normalize name consistently (always "CATERING- " format with space after hyphen)
  const normalizedName = name
    .replace(/\s*-\s*/g, '- ')  // Always "CATERING- " format
    .replace(/,\s*/g, ', ');    // Always ", " format
  
  // Check cache by normalized name
  category = categoryCache.get(`name:${normalizedName}`);
  if (category) {
    // Update Square ID if it wasn't set before
    if (!category.squareId && squareId) {
      category = await prisma.category.update({
        where: { id: category.id },
        data: { squareId }
      });
      categoryCache.set(`square:${squareId}`, category);
    }
    return category;
  }
  
  // Try to find existing in database (fallback if cache miss)
  category = await prisma.category.findFirst({
    where: { 
      OR: [
        { squareId }, 
        { name: normalizedName }
      ] 
    }
  });
  
  if (!category) {
    // Create new category
    category = await prisma.category.create({
      data: { 
        name: normalizedName, 
        squareId,
        slug: normalizedName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
      }
    });
  }
  
  // Update cache with new/found category
  categoryCache.set(`square:${squareId}`, category);
  categoryCache.set(`name:${normalizedName}`, category);
  
  return category;
}

/**
 * Determine the sync strategy - simplified to use only products table
 */
async function determineSyncStrategy(): Promise<SyncDecision> {
  // Get current state of products table for all synced categories
  const productsCount = await prisma.product.count({
    where: {
      active: true,
      category: {
        name: {
          in: Object.values(LEGACY_CATEGORY_MAPPINGS)
        }
      }
    }
  });

  logger.info(`Current state: ${productsCount} items in synced categories`);

  return {
    strategy: 'PRODUCTS_ONLY',
    targetTable: 'products',
    reason: 'Unified data model - products table only'
  };
}

/**
 * Auto-restore products that were incorrectly archived due to API issues
 */
async function autoRestoreIncorrectlyArchivedProducts(categoryName: string): Promise<number> {
  try {
    // Find products that were recently archived (within last hour) for this category
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const restoredCount = await prisma.product.updateMany({
      where: {
        active: false,
        updatedAt: { gte: oneHourAgo },
        category: {
          name: categoryName
        }
      },
      data: {
        active: true,
        updatedAt: new Date()
      }
    });
    
    if (restoredCount.count > 0) {
      logger.info(`🔄 Auto-restored ${restoredCount.count} products in category "${categoryName}"`);
    }
    
    return restoredCount.count;
  } catch (error) {
    logger.error(`❌ Error auto-restoring products in category "${categoryName}":`, error);
    return 0;
  }
}

/**
 * Detect categories that might have API issues (expected products but got 0 from Square)
 */
async function detectSuspiciousCategories(allValidSquareIds: string[]): Promise<Array<{name: string, expectedProducts: number}>> {
  try {
    const suspiciousCategories: Array<{name: string, expectedProducts: number}> = [];
    
    // Get current product counts by category from database (including inactive ones recently archived)
    const categoryStats = await prisma.category.findMany({
      include: {
        products: {
          where: { 
            OR: [
              { active: true },
              { 
                active: false, 
                updatedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Recently archived
              }
            ]
          },
          select: { squareId: true, active: true }
        }
      }
    });
    
    // Check each category that has products in DB
    for (const category of categoryStats) {
      if (category.products.length > 0) {
        // Count how many of this category's products are in the "valid Square IDs" list
        const foundInSquare = category.products.filter(p => 
          p.squareId && allValidSquareIds.includes(p.squareId)
        ).length;
        
        // If we have products in DB but none found in Square, it's suspicious
        if (foundInSquare === 0 && category.products.length > 0) {
          suspiciousCategories.push({
            name: category.name,
            expectedProducts: category.products.length
          });
          
          // Auto-restore if this looks like an API issue
          await autoRestoreIncorrectlyArchivedProducts(category.name);
        }
      }
    }
    
    return suspiciousCategories;
  } catch (error) {
    logger.error('❌ Error detecting suspicious categories:', error);
    return [];
  }
}

/**
 * Get ALL active Square product IDs from ALL categories to prevent false archiving
 * Now uses parallel fetching for improved performance
 */
async function getAllActiveSquareProductIds(): Promise<string[]> {
  const allSquareIds: string[] = [];
  
  try {
    logger.info('🔍 Fetching ALL Square product IDs for archive verification (parallel)...');
    
    // Get ALL categories (both CATERING and CORE PRODUCTS)
    const allCategories = Object.entries(LEGACY_CATEGORY_MAPPINGS);
    
    // Create promises for parallel execution
    const fetchPromises = allCategories.map(async ([squareId, categoryName]) => {
      try {
        const items = await fetchSquareItemsForCategory(squareId, categoryName, true); // true = use cache
        const categoryIds = items.map(item => item.id);
        logger.info(`✅ Category "${categoryName}": ${categoryIds.length} items`);
        return { success: true, categoryName, ids: categoryIds };
      } catch (error) {
        logger.error(`❌ Failed to fetch items for category "${categoryName}" (${squareId}):`, error);
        return { success: false, categoryName, ids: [], error };
      }
    });
    
    // Execute all fetches in parallel
    const results = await Promise.all(fetchPromises);
    
    // Collect all IDs from successful fetches
    for (const result of results) {
      if (result.success) {
        allSquareIds.push(...result.ids);
      }
    }
    
    logger.info(`📊 Total active Square products found: ${allSquareIds.length}`);
    return allSquareIds;
  } catch (error) {
    logger.error('❌ Error fetching all Square product IDs:', error);
    throw error;
  }
}

/**
 * Fetch items from Square for a specific category
 * Now supports caching for improved performance
 */
async function fetchSquareItemsForCategory(categoryId: string, categoryName: string, useCache: boolean = false): Promise<SquareItem[]> {
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

    // Add detailed logging for debugging
    logger.info(`🔍 Square API request for category "${categoryName}" (${categoryId}):`, {
      requestBody: JSON.stringify(requestBody),
      useCache,
      categoryId,
      categoryName
    });

    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        response = useCache 
          ? await cachedSearchCatalogObjects(requestBody, 10 * 60 * 1000) // 10min cache
          : await searchCatalogObjects(requestBody);
        break; // Success - exit retry loop
      } catch (apiError: any) {
        retryCount++;
        const isTimeout = apiError?.name === 'TimeoutError' || apiError?.message?.includes('timeout');
        
        if (isTimeout && retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
          logger.warn(`⏱️ Timeout for category "${categoryName}" (attempt ${retryCount}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        logger.error(`❌ Square API error for category "${categoryName}" (${categoryId}) after ${retryCount} attempts:`, {
          error: apiError,
          isTimeout,
          requestBody: JSON.stringify(requestBody)
        });
        throw apiError;
      }
    }
    
    const data = response.result;
    
    // Enhanced logging for debugging empty results
    const isEmpty = !data.objects || data.objects.length === 0;
    logger.info(`📥 Square API response for category "${categoryName}":`, {
      objectCount: data.objects?.length || 0,
      relatedObjectCount: data.related_objects?.length || 0,
      hasObjects: !!data.objects,
      isEmpty,
      firstItemName: data.objects?.[0]?.item_data?.name || 'N/A',
      firstItemCategoryId: data.objects?.[0]?.item_data?.category_id || 'N/A',
      cursor: data.cursor || 'N/A',
      // Log full response if empty for debugging
      fullResponse: isEmpty ? JSON.stringify(data, null, 2) : 'Not empty - omitted for brevity'
    });
    
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

    // Log summary of items found for debugging
    logger.info(`📊 Found ${items.length} items in Square for category "${categoryName}" (${categoryId}):`, {
      itemCount: items.length,
      itemNames: items.slice(0, 3).map(i => i.name), // Log first 3 item names
      allItemsSameCategory: items.every(i => i.categoryId === categoryId),
      uniqueCategoryIds: [...new Set(items.map(i => i.categoryId))]
    });

    return items;
  } catch (error) {
    logger.error(`Error fetching Square items for category ${categoryId}:`, error);
    throw error;
  }
}

/**
 * Batch sync items to products table with variation grouping support
 */
async function batchSyncToProducts(
  items: SquareItem[], 
  syncLogger: SyncLogger,
  forceUpdate: boolean = false
): Promise<{ synced: number; skipped: number; errors: number }> {
  if (items.length === 0) return { synced: 0, skipped: 0, errors: 0 };
  
  logger.info(`🔄 Batch syncing ${items.length} items to products table...`);
  
  try {
    logger.info(`🔄 Starting batch sync of ${items.length} items to products table`);
    
    // Check if this is SHARE PLATTERS category (only category that needs variation grouping)
    const isSharePlattersCategory = items.length > 0 && 
      items[0].categoryName === 'CATERING- SHARE PLATTERS';
    
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    if (isSharePlattersCategory) {
      // SHARE PLATTERS: Use intelligent variation grouping with Square's native variations
      logger.info(`📦 Processing SHARE PLATTERS with enhanced variation grouping`);
      
      // Group variations using the VariationGrouper to detect size patterns
      const groupedProducts = VariationGrouper.groupVariations(items);
      
      logger.info(`🔍 Grouped ${items.length} items into ${groupedProducts.length} products with variations:`, {
        totalItems: items.length,
        groupedProducts: groupedProducts.length,
        withMultipleSizes: groupedProducts.filter(g => g.hasMultipleSizes).length
      });
      
      for (const groupedProduct of groupedProducts) {
        try {
          // Use the base name for the product (without size indicators)
          const baseName = groupedProduct.baseName;
          const category = await getOrCreateCategory(groupedProduct.categoryId, groupedProduct.category);
          
          // Look for existing product by base name pattern or any variation's Square ID
          const variationSquareIds = groupedProduct.variations.map(v => v.id);
          let existingProduct = await prisma.product.findFirst({
            where: {
              OR: [
                { squareId: { in: variationSquareIds } },
                { name: baseName },
                { name: { contains: baseName, mode: 'insensitive' } }
              ]
            },
            include: { variants: true }
          });
          
          if (existingProduct && !forceUpdate) {
            syncLogger.logItemProcessed(variationSquareIds[0], baseName, 'duplicate', 'Product already exists');
            skippedCount++;
            continue;
          }
          
          // Generate unique slug using base name
          const uniqueSlug = await generateUniqueSlug(baseName, variationSquareIds[0], existingProduct?.slug || undefined);
          
          // Find the best base price (usually the smallest/regular size)
          const sortedVariations = groupedProduct.variations.sort((a, b) => {
            const sizeOrder = { 'small': 1, 'regular': 2, 'medium': 2, 'large': 3 };
            const orderA = sizeOrder[a.size as keyof typeof sizeOrder] || 2;
            const orderB = sizeOrder[b.size as keyof typeof sizeOrder] || 2;
            return orderA - orderB;
          });
          const basePrice = sortedVariations[0]?.price || 0;
          
          let baseProduct: typeof existingProduct;
          
          if (!existingProduct) {
            // Create new product with base name
            baseProduct = await prisma.product.create({
              data: {
                name: baseName,
                description: groupedProduct.variations[0]?.description || '',
                price: basePrice,
                squareId: variationSquareIds[0], // Use first variation ID as primary
                category: { connect: { id: category.id } },
                active: true,
                images: groupedProduct.baseImageUrl ? [groupedProduct.baseImageUrl] : [],
                slug: uniqueSlug,
              },
              include: { variants: true }
            });
            syncLogger.logItemSynced(variationSquareIds[0], baseName, `Created grouped product with ${groupedProduct.variations.length} variations`);
          } else {
            // Update existing product
            baseProduct = await prisma.product.update({
              where: { id: existingProduct.id },
              data: {
                name: baseName,
                description: groupedProduct.variations[0]?.description || '',
                price: basePrice,
                images: groupedProduct.baseImageUrl ? [groupedProduct.baseImageUrl] : [],
                active: true,
              },
              include: { variants: true }
            });
            syncLogger.logItemSynced(variationSquareIds[0], baseName, `Updated grouped product with ${groupedProduct.variations.length} variations`);
          }
          
          // Clear existing variants if this is an update to avoid orphaned variants
          if (baseProduct.variants && baseProduct.variants.length > 0) {
            await prisma.variant.deleteMany({
              where: { productId: baseProduct.id }
            });
          }
          
          // Create variants for each size variation
          for (const variation of groupedProduct.variations) {
            const variantName = groupedProduct.hasMultipleSizes 
              ? `${VariationGrouper.getSizeDisplayName(variation.size)}` 
              : baseName;
            
            await prisma.variant.create({
              data: {
                productId: baseProduct.id,
                squareVariantId: variation.squareVariantId || variation.id,
                name: variantName,
                price: variation.price,
              }
            });
            
            logger.info(`🔧 Created variant "${variantName}" for ${baseName}: $${variation.price}`);
          }
          
          logger.info(`✅ Successfully processed SHARE PLATTER: "${baseName}" with ${groupedProduct.variations.length} size variations`, {
            productId: baseProduct.id,
            variations: groupedProduct.variations.map(v => ({ 
              size: v.size, 
              price: v.price,
              squareId: v.id 
            }))
          });
          
          syncedCount++;
          
        } catch (error) {
          errorCount++;
          logger.error(`❌ Error processing SHARE PLATTER group "${groupedProduct.baseName}":`, error);
          syncLogger.logError(groupedProduct.baseName, error as Error);
        }
      }
    } else {
      // ALL OTHER CATEGORIES: Individual products (existing logic)
      logger.info(`📦 Processing regular category "${items[0]?.categoryName}" as individual products`);
      
      for (const item of items) {
        try {
          const existingProduct = await prisma.product.findFirst({
            where: { squareId: item.id }
          });
          const isUpdate = !!existingProduct;
          
          // Check for duplicates if it's a new item
          if (!isUpdate) {
            const { isDuplicate, existingItem } = await CateringDuplicateDetector.checkForDuplicate({
              name: item.name,
              squareProductId: item.id,
            });
            
            if (isDuplicate && existingItem) {
              syncLogger.logItemProcessed(item.id, item.name, 'duplicate', `Duplicate of existing item: ${existingItem.name}`);
              skippedCount++;
              continue;
            }
          }
          
          // Get or create category
          const category = await getOrCreateCategory(item.categoryId, item.categoryName);
          
          // Generate unique slug
          const uniqueSlug = await generateUniqueSlug(item.name, item.id, existingProduct?.slug || undefined);
          
          const productData = {
            name: item.name,
            description: item.description || '',
            price: item.price,
            squareId: item.id,
            category: { connect: { id: category.id } },
            active: true,
            images: item.imageUrl ? [item.imageUrl] : [],
            slug: uniqueSlug,
          };
          
          if (isUpdate) {
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: productData
            });
            syncLogger.logItemSynced(item.id, item.name, 'Updated individual product');
          } else {
            await prisma.product.create({
              data: productData
            });
            syncLogger.logItemSynced(item.id, item.name, 'Created individual product');
          }
          
          syncedCount++;
          
        } catch (error) {
          errorCount++;
          logger.error(`❌ Error processing item ${item.name}:`, error);
          syncLogger.logError(item.name, error as Error);
        }
      }
    }
    
    logger.info(`✅ Batch sync completed: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`);
    
    return { synced: syncedCount, skipped: skippedCount, errors: errorCount };
    
  } catch (error) {
    logger.error('❌ Error in batch sync:', error);
    throw error;
  }
}

/**
 * Sync item to products table (legacy function, replaced by batchSyncToProducts)
 */
async function syncToProductsTable(
  item: SquareItem, 
  syncLogger: SyncLogger,
  forceUpdate: boolean = false
): Promise<void> {
  try {
    // Check for existing item by Square ID first
    const existingProduct = await prisma.product.findFirst({
      where: {
        squareId: item.id
      }
    });

    // If item exists with same Square ID, it's an update, not a duplicate
    const isUpdate = !!existingProduct;
    
    // Only check for duplicates by name if it's a new item (no existing Square ID match)
    if (!isUpdate) {
      const { isDuplicate, existingItem } = await CateringDuplicateDetector.checkForDuplicate({
        name: item.name,
        squareProductId: item.id,
        squareCategory: item.categoryName
      });

      if (isDuplicate && !forceUpdate) {
        syncLogger.logItemDuplicate(item.id, item.name, `Already exists: ${existingItem?.source}`);
        return;
      }
    }

    // Get or create category with improved duplicate prevention
    const normalizedCategoryName = item.categoryName
      .replace(/\s*-\s*/g, '- ')  // Ensure single space after hyphen: "CATERING- APPETIZERS"
      .replace(/,\s*/g, ', ')     // Ensure single space after comma: "BUFFET, STARTERS"
      .trim();
    
    // Find existing category by Square ID first (most reliable)
    let category = await prisma.category.findFirst({
      where: {
        squareId: item.categoryId
      }
    });
    
    // If not found by Square ID, try to find by normalized name
    if (!category) {
      category = await prisma.category.findFirst({
        where: {
          OR: [
            { name: normalizedCategoryName },
            { name: { equals: normalizedCategoryName, mode: 'insensitive' } },
            // Also check for variations without spaces around hyphens
            { name: normalizedCategoryName.replace(/\s*-\s*/g, '-') },
            { name: normalizedCategoryName.replace(/\s*-\s*/g, '- ') }
          ]
        }
      });
    }

    if (!category) {
      // Generate unique slug
      const baseSlug = normalizedCategoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const existingSlugCategory = await prisma.category.findFirst({
        where: { slug: baseSlug }
      });
      const uniqueSlug = existingSlugCategory ? `${baseSlug}-${Date.now()}` : baseSlug;

      try {
        category = await prisma.category.create({
          data: {
            name: normalizedCategoryName,
            description: `Category for ${normalizedCategoryName} products`,
            slug: uniqueSlug,
            squareId: item.categoryId, // Store Square ID to prevent duplicates
            order: 0,
            active: true
          }
        });
        syncLogger.logInfo(`✅ Created new category: ${normalizedCategoryName} (Square ID: ${item.categoryId})`);
      } catch (error) {
        // If it still fails, try to find the category again (race condition)
        category = await prisma.category.findFirst({
          where: {
            OR: [
              { squareId: item.categoryId },
              { name: { equals: normalizedCategoryName, mode: 'insensitive' } }
            ]
          }
        });
        if (!category) {
          throw error;
        }
        syncLogger.logInfo(`♻️ Using existing category: ${normalizedCategoryName}`);
      }
    } else if (category.name !== normalizedCategoryName || !category.squareId) {
      // Update existing category to normalize name and add Square ID if missing
      try {
        await prisma.category.update({
          where: { id: category.id },
          data: { 
            name: normalizedCategoryName,
            squareId: category.squareId || item.categoryId
          }
        });
        syncLogger.logInfo(`🔧 Normalized category name: "${category.name}" -> "${normalizedCategoryName}"`);
        category.name = normalizedCategoryName; // Update local reference
      } catch (updateError) {
        syncLogger.logInfo(`⚠️ Could not update category name (${updateError}), using existing: ${category.name}`);
      }
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(item.name, item.id);

    // Sync to products table
    const productData = {
      squareId: item.id,
      name: item.name,
      slug,
      description: item.description,
      price: item.price,
      images: item.imageUrl ? [item.imageUrl] : [],
      category: {
        connect: { id: category.id }
      },
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

    if (isUpdate && existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          ...productData,
          variants: {
            deleteMany: {},
            create: productData.variants.create
          },
          updatedAt: new Date()
        }
      });
      syncLogger.logItemSynced(item.id, item.name, 'Updated existing product');
    } else {
      // Create new product
      await prisma.product.create({
        data: productData
      });
      syncLogger.logItemSynced(item.id, item.name, 'Created new product');
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
 * Performance monitoring utilities
 */
interface PerformanceTimings {
  squareFetch: number;
  dbOperations: number;
  archiveCheck: number;
  categoryProcessing: Record<string, number>;
  totalSync: number;
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
  timings: PerformanceTimings;
}> {
  const syncLogger = new SyncLogger();
  const allSyncedItems: SquareItem[] = [];
  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let archiveResult = null;

  // Performance monitoring
  const startTime = Date.now();
  const timings: PerformanceTimings = {
    squareFetch: 0,
    dbOperations: 0,
    archiveCheck: 0,
    categoryProcessing: {},
    totalSync: 0
  };

  const syncId = `sync_${Date.now()}`;
  syncLogger.logSyncStart(`Unified Sync (PRODUCTS_ONLY)${dryRun ? ' [DRY RUN]' : ''}`, { syncId, timestamp: new Date().toISOString() });

  try {
    // Clear caches for fresh start
    clearSyncCaches();
    
    // Preload category cache for performance
    await preloadCategoryCache();
    
    // Get categories to sync (use LEGACY_CATEGORY_MAPPINGS to match database format)
    const categoriesToSync = categories?.length 
      ? Object.entries(LEGACY_CATEGORY_MAPPINGS).filter(([, localName]) => 
          categories.includes(localName))
      : Object.entries(LEGACY_CATEGORY_MAPPINGS);

    syncLogger.logInfo(`Syncing ${categoriesToSync.length} categories (catering + core products)`, { count: categoriesToSync.length, categories: categoriesToSync.map(([,name]) => name) });

    // Process each category
    for (const [squareId, localName] of categoriesToSync) {
      const categoryStartTime = Date.now();
      syncLogger.logCategoryStart(localName, 0); // Will update count

      try {
        // Fetch items from Square with caching (with timing)
        const fetchStartTime = Date.now();
        const squareItems = await fetchSquareItemsForCategory(squareId, localName, true); // true = use cache
        const fetchTime = Date.now() - fetchStartTime;
        timings.squareFetch += fetchTime;
        
        syncLogger.logInfo(`Found ${squareItems.length} items in Square for ${localName} (${fetchTime}ms)`);

        allSyncedItems.push(...squareItems);
        let categorySynced = 0;
        let categorySkipped = 0;
        let categoryErrors = 0;

        // Process items in batch for improved performance (with timing)
        const dbStartTime = Date.now();
        if (dryRun) {
          // During dry run, log items as if they would be synced so they appear in the report
          squareItems.forEach(item => {
            syncLogger.logItemProcessed(item.id, item.name, 'synced', '[DRY RUN] Would sync to products table');
          });
          categorySynced = squareItems.length;
        } else {
          // Use batch sync for better performance
          const batchResult = await batchSyncToProducts(squareItems, syncLogger, forceUpdate);
          categorySynced = batchResult.synced;
          categorySkipped += batchResult.skipped;
          categoryErrors = batchResult.errors;
          errorCount += batchResult.errors;
        }
        const dbTime = Date.now() - dbStartTime;
        timings.dbOperations += dbTime;

        const categoryTotalTime = Date.now() - categoryStartTime;
        timings.categoryProcessing[localName] = categoryTotalTime;

        syncedCount += categorySynced;
        skippedCount += categorySkipped;
        syncLogger.logCategoryComplete(localName, categorySynced, categorySkipped, categoryErrors);
        
        // Performance warning for slow categories
        if (categoryTotalTime > 30000) { // 30 seconds
          syncLogger.logInfo(`⚠️ Slow category processing: ${localName} took ${Math.round(categoryTotalTime/1000)}s`);
        }

      } catch (categoryError) {
        const categoryTotalTime = Date.now() - categoryStartTime;
        timings.categoryProcessing[localName] = categoryTotalTime;
        
        syncLogger.logError(`Failed to process category ${localName}: ${categoryError}`);
        errorCount++;
      }
    }

    // Archive products that are no longer in Square (if not dry run)
    if (!dryRun) {
      const archiveStartTime = Date.now();
      try {
        // CRITICAL FIX: Get ALL Square product IDs, not just from current sync run
        syncLogger.logInfo('🔍 Getting ALL active Square product IDs for archive verification...');
        const allValidSquareIds = await getAllActiveSquareProductIds();
        syncLogger.logInfo(`📊 Archive check will use ${allValidSquareIds.length} total Square product IDs`);
        
        // SAFETY CHECK: Prevent archiving if no Square IDs found (could indicate API failure)
        if (allValidSquareIds.length === 0) {
          syncLogger.logInfo('⚠️ SAFETY CHECK: No Square IDs found - skipping archive to prevent data loss');
          syncLogger.logInfo('This could indicate a Square API issue or connectivity problem');
          archiveResult = {
            archived: 0,
            errors: 0,
            skipped: 'No Square IDs found - safety check prevented archiving'
          };
        } else {
          // ENHANCED SAFETY CHECK: Double-check categories with suspected issues
          const suspiciousCategories = await detectSuspiciousCategories(allValidSquareIds);
          if (suspiciousCategories.length > 0) {
            syncLogger.logInfo(`⚠️ ENHANCED SAFETY CHECK: Found ${suspiciousCategories.length} suspicious categories with potential API issues`);
            for (const cat of suspiciousCategories) {
              syncLogger.logInfo(`   • ${cat.name}: ${cat.expectedProducts} products in DB, but 0 from Square API`);
            }
            
            // Still proceed with archive but with extra logging
            syncLogger.logInfo('🔍 Proceeding with archive but monitoring suspicious categories...');
          }
          
          archiveResult = await archiveRemovedSquareProducts(allValidSquareIds);
        }
        const archiveTime = Date.now() - archiveStartTime;
        timings.archiveCheck = archiveTime;
        
        syncLogger.logInfo(`🗃️ Archive operation: ${archiveResult.archived} products archived, ${archiveResult.errors} errors (${archiveTime}ms)`);
        
        // Performance warning for slow archive operations
        if (archiveTime > 15000) { // 15 seconds
          syncLogger.logInfo(`⚠️ Slow archive operation: took ${Math.round(archiveTime/1000)}s`);
        }
      } catch (archiveError) {
        const archiveTime = Date.now() - archiveStartTime;
        timings.archiveCheck = archiveTime;
        
        syncLogger.logError(`❌ Archive operation failed: ${archiveError}`);
        errorCount++;
      }
    }

    // Verify sync completeness
    const verification = await verifySyncCompleteness(allSyncedItems);
    const report = syncLogger.generateReport();

    // Calculate total sync time and log performance summary
    timings.totalSync = Date.now() - startTime;
    
    const performanceSummary = {
      totalTime: Math.round(timings.totalSync / 1000),
      squareFetchTime: Math.round(timings.squareFetch / 1000),
      dbOperationsTime: Math.round(timings.dbOperations / 1000),
      archiveTime: Math.round(timings.archiveCheck / 1000),
      averageTimePerCategory: Math.round(timings.totalSync / categoriesToSync.length / 1000)
    };

    syncLogger.logSyncComplete('Unified Sync', {
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount,
      totalDiscrepancy: verification.totalDiscrepancy,
      performance: performanceSummary
    });

    // Log performance warnings
    if (timings.totalSync > 120000) { // 2 minutes
      syncLogger.logInfo(`⚠️ SLOW SYNC WARNING: Total sync took ${performanceSummary.totalTime}s`);
    }
    if (timings.squareFetch > 60000) { // 1 minute
      syncLogger.logInfo(`⚠️ SLOW SQUARE API: Square API calls took ${performanceSummary.squareFetchTime}s`);
    }
    if (timings.dbOperations > 45000) { // 45 seconds
      syncLogger.logInfo(`⚠️ SLOW DATABASE: Database operations took ${performanceSummary.dbOperationsTime}s`);
    }

    // Log detailed category timings for analysis
    const slowCategories = Object.entries(timings.categoryProcessing)
      .filter(([, time]) => time > 20000) // 20 seconds
      .sort(([, a], [, b]) => b - a);
    
    if (slowCategories.length > 0) {
      syncLogger.logInfo(`🐌 Slow categories (>20s):`);
      for (const [category, time] of slowCategories) {
        syncLogger.logInfo(`   • ${category}: ${Math.round(time/1000)}s`);
      }
    }

    return {
      syncedItems: syncedCount,
      skippedItems: skippedCount,
      errors: errorCount,
      report,
      verification,
      archiveResult,
      timings
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
        archive: result.archiveResult || null,
        performance: {
          totalTimeSeconds: Math.round(result.timings.totalSync / 1000),
          squareFetchSeconds: Math.round(result.timings.squareFetch / 1000),
          dbOperationsSeconds: Math.round(result.timings.dbOperations / 1000),
          archiveCheckSeconds: Math.round(result.timings.archiveCheck / 1000),
          categoryTimings: Object.fromEntries(
            Object.entries(result.timings.categoryProcessing).map(([cat, time]) => [
              cat, 
              Math.round(time / 1000)
            ])
          )
        }
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
      description: 'Comprehensive Square sync for all main product categories - products table only',
      strategy: 'PRODUCTS_ONLY',
      features: [
        'Single source of truth - products table only',
        'Syncs ALL main categories (Catering + Core Products)',
        'Comprehensive logging and verification',
        'Dry run support',
        'Category-specific sync',
        'Proper archiving of discontinued products'
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

