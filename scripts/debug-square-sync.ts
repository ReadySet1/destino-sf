/**
 * Debug script to inspect raw Square data and identify sync issues
 * Run with: npx tsx scripts/debug-square-sync.ts
 */

import { squareClient } from '../src/lib/square/client';
import { logger } from '../src/utils/logger';
import { prisma } from '../src/lib/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface DebugSquareItem {
  id: string;
  name: string;
  hasImages: boolean;
  imageIds: string[];
  imageUrls: string[];
  hasPrice: boolean;
  priceAmount: number;
  priceDollars: number;
  categoryId?: string;
  categoryName?: string;
  variations: any[];
  rawData?: any;
}

async function debugSquareSync() {
  try {
    logger.info('🔍 Starting Square sync debug analysis...');

    // Step 1: Fetch Square catalog data
    logger.info('📡 Fetching Square catalog...');
    
    if (!squareClient.catalogApi) {
      throw new Error('Square catalog API is not initialized');
    }
    
    const response = await squareClient.catalogApi.searchCatalogObjects({
      object_types: ['ITEM', 'CATEGORY'],
      include_related_objects: true,
      include_deleted_objects: false,
      limit: 20 // Limit for debugging
    });

    const objects = response.result?.objects || [];
    const relatedObjects = response.result?.related_objects || [];
    
    // Filter items and categories
    const items = objects.filter(obj => obj.type === 'ITEM');
    const categories = [...objects.filter(obj => obj.type === 'CATEGORY'), ...relatedObjects.filter(obj => obj.type === 'CATEGORY')];
    const images = relatedObjects.filter(obj => obj.type === 'IMAGE');

    logger.info(`📊 Found ${items.length} items, ${categories.length} categories, ${images.length} images`);

    // Step 2: Analyze each item
    const analyzedItems: DebugSquareItem[] = [];
    
    for (const item of items) {
      if (!item.item_data) continue;
      
      const analysis = analyzeSquareItem(item, categories, images);
      analyzedItems.push(analysis);
      
      // Log detailed analysis for first few items
      if (analyzedItems.length <= 5) {
        logger.info(`\n=== ITEM ANALYSIS: ${analysis.name} ===`);
        logger.info(`🆔 ID: ${analysis.id}`);
        logger.info(`🖼️  Images: ${analysis.hasImages ? 'YES' : 'NO'} (${analysis.imageIds.length} IDs, ${analysis.imageUrls.length} URLs)`);
        if (analysis.imageIds.length > 0) {
          logger.info(`   Image IDs: ${analysis.imageIds.join(', ')}`);
          analysis.imageUrls.forEach((url, i) => {
            logger.info(`   Image ${i + 1}: ${url}`);
          });
        }
        logger.info(`💰 Price: ${analysis.hasPrice ? 'YES' : 'NO'} ($${analysis.priceDollars} from ${analysis.priceAmount} cents)`);
        logger.info(`📁 Category: ${analysis.categoryName || 'NONE'} (ID: ${analysis.categoryId || 'NONE'})`);
        logger.info(`🔧 Variations: ${analysis.variations.length}`);
        
        // Show raw price data
        if (analysis.variations.length > 0) {
          const firstVar = analysis.variations[0];
          logger.info(`   Raw price data: ${JSON.stringify(firstVar.item_variation_data?.price_money)}`);
        }
      }
    }

    // Step 3: Summary statistics
    const stats = {
      totalItems: analyzedItems.length,
      withImages: analyzedItems.filter(item => item.hasImages).length,
      withoutImages: analyzedItems.filter(item => !item.hasImages).length,
      withPrice: analyzedItems.filter(item => item.hasPrice).length,
      withoutPrice: analyzedItems.filter(item => !item.hasPrice).length,
      withCategory: analyzedItems.filter(item => item.categoryName).length,
      withoutCategory: analyzedItems.filter(item => !item.categoryName).length,
      alfajores: analyzedItems.filter(item => item.categoryName === 'ALFAJORES').length,
      empanadas: analyzedItems.filter(item => item.categoryName === 'EMPANADAS').length,
    };

    logger.info('\n📊 === SUMMARY STATISTICS ===');
    logger.info(`Total items: ${stats.totalItems}`);
    logger.info(`With images: ${stats.withImages} (${((stats.withImages/stats.totalItems)*100).toFixed(1)}%)`);
    logger.info(`Without images: ${stats.withoutImages} (${((stats.withoutImages/stats.totalItems)*100).toFixed(1)}%)`);
    logger.info(`With price: ${stats.withPrice} (${((stats.withPrice/stats.totalItems)*100).toFixed(1)}%)`);
    logger.info(`Without price: ${stats.withoutPrice} (${((stats.withoutPrice/stats.totalItems)*100).toFixed(1)}%)`);
    logger.info(`With category: ${stats.withCategory} (${((stats.withCategory/stats.totalItems)*100).toFixed(1)}%)`);
    logger.info(`ALFAJORES: ${stats.alfajores} items`);
    logger.info(`EMPANADAS: ${stats.empanadas} items`);

    // Step 4: Compare with database
    logger.info('\n🗄️  === DATABASE COMPARISON ===');
    
    const dbProducts = await prisma.product.findMany({
      include: { category: true },
      take: 10
    });

    logger.info(`Database products: ${dbProducts.length}`);
    
    for (const dbProduct of dbProducts.slice(0, 5)) {
      const squareItem = analyzedItems.find(item => item.id === dbProduct.squareId);
      logger.info(`\n📦 DB Product: ${dbProduct.name}`);
      logger.info(`   Square ID: ${dbProduct.squareId}`);
      logger.info(`   DB Price: $${dbProduct.price}`);
      logger.info(`   DB Images: ${dbProduct.images.length} (${dbProduct.images.join(', ').substring(0, 100)}...)`);
      logger.info(`   DB Category: ${dbProduct.category?.name}`);
      
      if (squareItem) {
        logger.info(`   Square Price: $${squareItem.priceDollars} (should match DB)`);
        logger.info(`   Square Images: ${squareItem.imageUrls.length}`);
        logger.info(`   Square Category: ${squareItem.categoryName}`);
        
        // Identify mismatches
        const priceMismatch = Math.abs(parseFloat(dbProduct.price.toString()) - squareItem.priceDollars) > 0.01;
        const imageMismatch = dbProduct.images.length !== squareItem.imageUrls.length;
        const categoryMismatch = dbProduct.category?.name !== squareItem.categoryName;
        
        if (priceMismatch || imageMismatch || categoryMismatch) {
          logger.info(`   ⚠️  MISMATCHES DETECTED:`);
          if (priceMismatch) logger.info(`      - Price: DB=$${dbProduct.price} vs Square=$${squareItem.priceDollars}`);
          if (imageMismatch) logger.info(`      - Images: DB=${dbProduct.images.length} vs Square=${squareItem.imageUrls.length}`);
          if (categoryMismatch) logger.info(`      - Category: DB="${dbProduct.category?.name}" vs Square="${squareItem.categoryName}"`);
        }
      } else {
        logger.info(`   ❌ No matching Square item found!`);
      }
    }

    // Step 5: Test sync transformation logic
    logger.info('\n🔧 === TESTING SYNC TRANSFORMATION ===');
    
    const testItem = items[0]; // Test first item
    if (testItem) {
      logger.info(`Testing transformation for: ${testItem.item_data?.name}`);
      
      // Test current (broken) logic
      const brokenImageIds = testItem.itemData?.imageIds; // This will be undefined
      const brokenPrice = extractPriceBroken(testItem.item_data);
      
      // Test fixed logic
      const fixedImageIds = testItem.item_data?.image_ids; // This should work
      const fixedPrice = extractPriceFixed(testItem.item_data);
      const fixedImages = extractImagesFixed(testItem, images);
      
      logger.info(`Broken image extraction: ${brokenImageIds?.length || 0} images`);
      logger.info(`Fixed image extraction: ${fixedImageIds?.length || 0} image IDs → ${fixedImages.length} URLs`);
      logger.info(`Broken price extraction: $${brokenPrice}`);
      logger.info(`Fixed price extraction: $${fixedPrice}`);
    }

    logger.info('\n✅ Debug analysis complete!');

  } catch (error) {
    logger.error('❌ Debug analysis failed:', error);
    throw error;
  }
}

/**
 * Analyze a single Square item
 */
function analyzeSquareItem(item: any, categories: any[], images: any[]): DebugSquareItem {
  const itemData = item.item_data;
  const name = itemData?.name || 'Unknown';
  
  // Extract image information
  const imageIds = itemData?.image_ids || [];
  const imageUrls: string[] = [];
  
  for (const imageId of imageIds) {
    const imageObj = images.find(img => img.id === imageId);
    if (imageObj?.image_data?.url) {
      imageUrls.push(imageObj.image_data.url);
    }
  }
  
  // Extract price information
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
  
  // Extract category information
  const categoryIds = itemData?.categories?.map((cat: any) => cat.id) || [];
  let categoryName: string | undefined;
  let categoryId: string | undefined;
  
  if (categoryIds.length > 0) {
    categoryId = categoryIds[0];
    const categoryObj = categories.find(cat => cat.id === categoryId);
    categoryName = categoryObj?.category_data?.name;
  }
  
  return {
    id: item.id,
    name,
    hasImages: imageUrls.length > 0,
    imageIds,
    imageUrls,
    hasPrice: priceDollars > 0,
    priceAmount,
    priceDollars,
    categoryId,
    categoryName,
    variations,
    rawData: item
  };
}

/**
 * Test broken price extraction (current logic)
 */
function extractPriceBroken(itemData: any): number {
  const variations = itemData.variations || [];
  if (variations.length === 0) return 0;

  const firstVariation = variations[0];
  const priceData = firstVariation.itemVariationData?.priceMoney; // This field doesn't exist
  
  if (priceData && priceData.amount) {
    return parseInt(priceData.amount) / 100;
  }

  return 0;
}

/**
 * Test fixed price extraction
 */
function extractPriceFixed(itemData: any): number {
  const variations = itemData.variations || [];
  if (variations.length === 0) return 0;

  const firstVariation = variations[0];
  const priceData = firstVariation.item_variation_data?.price_money; // Fixed field name
  
  if (priceData && priceData.amount) {
    return parseInt(priceData.amount.toString()) / 100; // Handle BigInt
  }

  return 0;
}

/**
 * Test fixed image extraction
 */
function extractImagesFixed(product: any, relatedObjects: any[]): string[] {
  const images: string[] = [];
  
  if (product.item_data?.image_ids) { // Fixed field name
    for (const imageId of product.item_data.image_ids) {
      const imageObject = relatedObjects.find(obj => obj.id === imageId);
      if (imageObject?.image_data?.url) {
        images.push(imageObject.image_data.url);
      }
    }
  }

  return images;
}

// Run the debug script if executed directly
debugSquareSync()
  .then(() => {
    logger.info('🎉 Debug script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('💥 Debug script failed:', error);
    process.exit(1);
  });

export { debugSquareSync };
