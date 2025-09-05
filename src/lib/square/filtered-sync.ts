/**
 * Filtered Square Sync Manager
 * 
 * This service handles syncing only alfajores and empanadas from Square
 * while protecting all catering items from modification.
 */

import { randomUUID } from 'crypto';
import { squareClient } from './client';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

import { 
  FilteredSyncConfig, 
  SyncResult, 
  PreviewResult, 
  SyncHistory,
  FILTERED_SYNC_CONFIG,
  SyncErrorType,
  SyncError
} from '@/types/square-sync';

export class FilteredSyncManager {
  private config: FilteredSyncConfig;
  private syncId: string;
  private stats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    protected: 0,
    errors: 0,
    imagesProcessed: 0
  };

  constructor(config: Partial<FilteredSyncConfig> = {}) {
    this.config = { ...FILTERED_SYNC_CONFIG, ...config };
    this.syncId = randomUUID(); // Generates proper UUID v4 format
  }

  /**
   * Main sync method that only processes alfajores and empanadas
   */
  async syncProducts(): Promise<SyncResult> {
    const startTime = new Date();
    
    try {
      logger.info('🚀 Starting filtered Square sync...', {
        syncId: this.syncId,
        config: this.config,
        timestamp: startTime.toISOString()
      });

      // Step 1: Initialize catering protection - DISABLED (catering_items table removed)
      // await cateringProtection.initialize();

      // Step 2: Create sync history record
      await this.createSyncHistory(startTime);

      // Step 3: Backup catering images if needed - DISABLED (catering_items table removed)
      // const imageBackup = this.config.enableImageSync ? 
      //   await cateringProtection.backupCateringImages() : {};
      const imageBackup = {};

      // Step 4: Fetch filtered catalog from Square
      const catalogData = await this.fetchFilteredCatalog();
      if (!catalogData.success) {
        throw new Error(`Failed to fetch Square catalog: ${catalogData.error}`);
      }

      logger.info(`📸 Related objects for image extraction: ${catalogData.relatedObjects.length} objects`, {
        types: [...new Set(catalogData.relatedObjects.map(obj => obj.type))],
        imageObjects: catalogData.relatedObjects.filter(obj => obj.type === 'IMAGE').length
      });

      // Step 5: Process products in batches
      const syncResult = await this.processProductsBatch(
        catalogData.products,
        catalogData.relatedObjects
      );

      // Step 6: Skip catering image restoration for filtered sync
      // Filtered sync only handles alfajores/empanadas, no catering items
      logger.info('🚫 Skipping catering image restoration (filtered sync only)');

      // Step 7: Update sync history
      const endTime = new Date();
      await this.updateSyncHistory(true, endTime);

      // Step 8: Generate final report
      return this.generateSyncReport(true, syncResult, startTime, endTime);

    } catch (error) {
      logger.error('❌ Filtered sync failed:', error);
      
      // Update sync history with failure
      await this.updateSyncHistory(false, new Date(), error);

      return this.generateSyncReport(false, null, startTime, new Date(), error);
    }
  }

  /**
   * Preview what products will be synced without actually syncing them
   */
  async previewSync(): Promise<PreviewResult> {
    try {
      logger.info('👀 Generating sync preview...');

      // Initialize protection to identify what should be skipped - DISABLED (catering_items table removed)
      // await cateringProtection.initialize();

      // Fetch catalog data
      const catalogData = await this.fetchFilteredCatalog();
      if (!catalogData.success) {
        throw new Error(`Failed to fetch Square catalog: ${catalogData.error}`);
      }

      const productsToSync: PreviewResult['productsToSync'] = [];
      const itemsToSkip: PreviewResult['itemsToSkip'] = [];

      for (const product of catalogData.products) {
        const analysis = await this.analyzeProduct(product, catalogData.relatedObjects);
        
        if (analysis.shouldSync) {
          productsToSync.push({
            id: product.id,
            name: analysis.productName,
            category: analysis.categoryName || 'Unknown',
            action: analysis.existingProduct ? 'UPDATE' : 'CREATE'
          });
        } else {
          itemsToSkip.push({
            id: product.id,
            name: analysis.productName,
            reason: analysis.skipReason || 'Does not match filter criteria'
          });
        }
      }

      return {
        productsToSync,
        itemsToSkip,
        summary: {
          totalProducts: catalogData.products.length,
          willSync: productsToSync.length,
          willSkip: itemsToSkip.length,
          protectedItems: this.stats.protected
        }
      };

    } catch (error) {
      logger.error('❌ Failed to generate sync preview:', error);
      throw error;
    }
  }

  /**
   * Fetch filtered catalog data from Square
   */
  private async fetchFilteredCatalog(): Promise<{
    success: boolean;
    products: any[];
    relatedObjects: any[];
    error?: string;
  }> {
    try {
      const catalogApi = squareClient.catalogApi;
      
      if (!catalogApi) {
        throw new Error('Square catalog API is not available');
      }
      
      // Use the correct Square API format (matching working examples in sync.ts and quickstart.ts)
      const requestBody = {
        object_types: ['ITEM', 'CATEGORY'], // Include CATEGORY to get category data in related_objects
        include_deleted_objects: false,
        include_related_objects: true,
        limit: 1000
      };
      
      const response = await catalogApi.searchCatalogObjects(requestBody);

      if (!response.result) {
        return {
          success: false,
          products: [],
          relatedObjects: [],
          error: 'No result from Square API'
        };
      }

      const objects = response.result.objects || [];
      const relatedObjects = response.result.related_objects || [];

      // Log all categories found for debugging (they're in related_objects, not main objects)
      const categoriesInObjects = objects.filter(obj => obj.type === 'CATEGORY');
      const categoriesInRelated = relatedObjects.filter(obj => obj.type === 'CATEGORY');
      const allCategories = [...categoriesInObjects, ...categoriesInRelated];
      
      // Get all images for image extraction
      const allImages = relatedObjects.filter(obj => obj.type === 'IMAGE');
      
      logger.info(`📋 Found ${allCategories.length} categories in Square (${categoriesInObjects.length} in objects, ${categoriesInRelated.length} in related):`, 
        allCategories.map(cat => ({ 
          id: cat.id, 
          name: cat.category_data?.name || 'Unknown' 
        }))
      );

      logger.info(`📸 Found ${allImages.length} images in related objects:`, 
        allImages.slice(0, 3).map(img => ({ 
          id: img.id, 
          hasUrl: !!img.image_data?.url 
        }))
      );

      // Combine all categories from both objects and related_objects for category matching
      const allCategoryObjects = [...categoriesInObjects, ...categoriesInRelated];
      
      // Filter products to only include items that match our criteria
      const filteredProducts = objects.filter(obj => this.shouldProcessProduct(obj, allCategoryObjects));

      logger.info(`📦 Fetched ${objects.length} total products, ${filteredProducts.length} match filter criteria`);

      // Return ALL related objects (categories AND images) for proper extraction
      return {
        success: true,
        products: filteredProducts,
        relatedObjects: [...allCategoryObjects, ...allImages] // Include both categories and images
      };

    } catch (error) {
      logger.error('❌ Failed to fetch Square catalog:', error);
      return {
        success: false,
        products: [],
        relatedObjects: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a Square product should be processed based on our filter criteria
   */
  private shouldProcessProduct(product: any, relatedObjects: any[] = []): boolean {
    const itemData = product.item_data;
    if (!itemData) {
      logger.debug(`❌ Product ${product.id} has no item_data`);
      return false;
    }

    const productName = itemData.name || '';
    logger.debug(`🔍 Evaluating product: "${productName}" (ID: ${product.id})`);
    
    // FIRST: Check if product is in a protected category (catering protection)
    const categoryIds = itemData.categories?.map((cat: any) => cat.id) || [];
    const legacyCategoryId = itemData.category_id;
    const allCategoryIds = [...categoryIds, legacyCategoryId].filter(Boolean);

    // Check each category to see if it's protected
    for (const categoryId of allCategoryIds) {
      const categoryMatch = this.checkCategoryMatch(categoryId, relatedObjects);
      if (categoryMatch.categoryName) {
        // Check if this category is protected (catering)
        const isProtectedCategory = this.config.protectedCategories.some(protectedCat =>
          categoryMatch.categoryName!.toUpperCase().includes(protectedCat.toUpperCase()) ||
          protectedCat.toUpperCase().includes(categoryMatch.categoryName!.toUpperCase()) ||
          categoryMatch.categoryName!.toUpperCase().startsWith('CATERING')
        );

        if (isProtectedCategory) {
          logger.info(`🛡️ Product "${productName}" is in protected category "${categoryMatch.categoryName}" - SKIPPING`);
          return false;
        }
      }
    }
    
    // SECOND: Check if product name matches allowed patterns (only if not protected)
    const nameMatches = this.config.allowedProductNames.some(pattern => 
      pattern.test(productName)
    );

    if (nameMatches) {
      logger.info(`✅ Product "${productName}" matches name pattern`);
      return true;
    }

    // THIRD: Check if product is in an allowed category
    if (allCategoryIds.length > 0) {
      for (const categoryId of allCategoryIds) {
        const categoryMatch = this.checkCategoryMatch(categoryId, relatedObjects);
        if (categoryMatch.matches) {
          logger.info(`✅ Product "${productName}" matches allowed category: ${categoryMatch.categoryName}`);
          return true;
        } else {
          logger.debug(`❌ Product "${productName}" in category "${categoryMatch.categoryName}" - not in allowed list`);
        }
      }
    } else {
      logger.debug(`❌ Product "${productName}" has no category information`);
    }

    logger.debug(`❌ Product "${productName}" does not match any filter criteria`);
    return false;
  }

  /**
   * Check if a category ID matches our allowed categories
   */
  private checkCategoryMatch(categoryId: string, relatedObjects: any[]): { matches: boolean; categoryName?: string } {
    // Debug: log what categories are available
    const availableCategories = relatedObjects.filter(obj => obj.type === 'CATEGORY');
    logger.debug(`🔍 Looking for category ${categoryId} among ${availableCategories.length} available categories:`, 
      availableCategories.map(cat => ({ id: cat.id, name: cat.category_data?.name }))
    );

    // Find the category object in relatedObjects
    const categoryObject = relatedObjects.find(obj => 
      obj.type === 'CATEGORY' && obj.id === categoryId
    );

    if (!categoryObject || !categoryObject.category_data) {
      logger.debug(`🔍 Category ${categoryId} not found in relatedObjects`);
      return { matches: false };
    }

    const categoryName = categoryObject.category_data.name || '';
    logger.debug(`🔍 Found category: "${categoryName}" for ID: ${categoryId}`);

    // Use selectedCategories if provided, otherwise fall back to allowedCategories
    const categoriesToCheck = this.config.selectedCategories && this.config.selectedCategories.length > 0 
      ? this.config.selectedCategories 
      : this.config.allowedCategories;

    // Check if category name matches any of our allowed/selected categories
    const matches = categoriesToCheck.some(allowedCategory => 
      categoryName.toUpperCase().includes(allowedCategory.toUpperCase()) ||
      allowedCategory.toUpperCase().includes(categoryName.toUpperCase())
    );

    logger.debug(`🔍 Category "${categoryName}" matches ${this.config.selectedCategories ? 'selected' : 'allowed'} categories: ${matches}`);

    return { matches, categoryName };
  }

  /**
   * Analyze a product to determine sync action
   */
  private async analyzeProduct(product: any, relatedObjects: any[]): Promise<{
    shouldSync: boolean;
    productName: string;
    categoryName?: string;
    existingProduct?: any;
    skipReason?: string;
  }> {
    const itemData = product.item_data;
    const productName = itemData?.name || 'Unknown Product';

    // Extract category name from the product
    let categoryName: string | undefined;
    
    // Get category IDs from the product
    const categoryIds = itemData?.categories?.map((cat: any) => cat.id) || [];
    const legacyCategoryId = itemData?.category_id;
    const allCategoryIds = [...categoryIds, legacyCategoryId].filter(Boolean);

    // Find the first category that has a name
    for (const categoryId of allCategoryIds) {
      const categoryMatch = this.checkCategoryMatch(categoryId, relatedObjects);
      if (categoryMatch.categoryName) {
        categoryName = categoryMatch.categoryName;
        break;
      }
    }

    // Check if this product is protected
    const existingProduct = await prisma.product.findFirst({
      where: { squareId: product.id },
      include: { category: true }
    });

    if (existingProduct) {
      // Protection check disabled - catering_items table removed
      // const isProtected = await cateringProtection.isProductProtected(
      //   existingProduct.id,
      //   existingProduct.squareId || undefined,
      //   existingProduct.category?.name
      // );
      const isProtected = false; // No protection needed with unified data model

      if (isProtected) {
        this.stats.protected++;
        return {
          shouldSync: false,
          productName,
          categoryName: categoryName || existingProduct.category?.name || 'Protected',
          skipReason: 'Product is protected (catering item)',
          existingProduct
        };
      }
    }

    // Check if product matches our filter criteria
    const shouldSync = this.shouldProcessProduct(product, relatedObjects);

    if (!shouldSync) {
      return {
        shouldSync: false,
        productName,
        categoryName: categoryName || 'Unmatched',
        skipReason: 'Does not match alfajores/empanadas filter criteria'
      };
    }

    return {
      shouldSync: true,
      productName,
      categoryName: categoryName || 'Uncategorized',
      existingProduct
    };
  }

  /**
   * Process products in batches
   */
  private async processProductsBatch(products: any[], relatedObjects: any[]): Promise<any> {
    const batchSize = this.config.batchSize || 50;
    const batches = [];

    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }

    const results = [];

    for (let i = 0; i < batches.length; i++) {
      logger.info(`📦 Processing batch ${i + 1}/${batches.length} (${batches[i].length} products)`);
      
      const batchResult = await this.processBatch(batches[i], relatedObjects);
      results.push(batchResult);

      // Add small delay between batches to avoid overwhelming the database
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Process a single batch of products
   */
  private async processBatch(products: any[], relatedObjects: any[]): Promise<any> {
    let batchSynced = 0;
    let batchSkipped = 0;
    let batchErrors = 0;

    for (const product of products) {
      try {
        const beforeSkipped = this.stats.skipped;
        await this.processProduct(product, relatedObjects);
        
        // Check if product was skipped or actually processed
        if (this.stats.skipped > beforeSkipped) {
          batchSkipped++;
        } else {
          batchSynced++;
          this.stats.processed++;
        }
      } catch (error) {
        batchErrors++;
        this.stats.errors++;
        logger.error(`❌ Failed to process product ${product.id}:`, error);
      }
    }

    logger.debug(`📊 Batch complete: ${batchSynced} synced, ${batchSkipped} skipped, ${batchErrors} errors`);
    return { synced: batchSynced, skipped: batchSkipped, errors: batchErrors };
  }

  /**
   * Process a single product
   */
  private async processProduct(product: any, relatedObjects: any[]): Promise<void> {
    const analysis = await this.analyzeProduct(product, relatedObjects);
    
    if (!analysis.shouldSync) {
      this.stats.skipped++;
      return;
    }

    const itemData = product.item_data;
    if (!itemData) {
      logger.debug(`❌ Product ${product.id} has no item_data, skipping sync`);
      return;
    }

    // Get or create appropriate category for this product
    const category = await this.ensureProductCategory(product, relatedObjects);

    // Extract and validate product data
    const extractedPrice = this.extractPrice(itemData);
    const extractedImages = this.config.enableImageSync ? this.extractImages(product, relatedObjects) : [];
    
    // Log extraction results
    logger.info(`📦 Processing product: ${itemData.name}`, {
      squareId: product.id,
      extractedPrice,
      expectedImageCount: product.item_data?.image_ids?.length || 0,
      actualImageCount: extractedImages.length,
      categoryName: category.name,
      categoryId: category.id
    });

    // Validation warnings
    if (extractedPrice === 0) {
      logger.warn(`⚠️  Price extraction failed for product ${itemData.name} (${product.id})`);
    }
    
    if (this.config.enableImageSync && product.item_data?.image_ids?.length > 0 && extractedImages.length === 0) {
      logger.warn(`⚠️  Image extraction failed for product ${itemData.name} (${product.id}) - has ${product.item_data.image_ids.length} image IDs but extracted 0 URLs`);
    }

    // Determine if product should be active based on Square settings
    const visibility = itemData.visibility || 'PUBLIC';
    const availableOnline = itemData.available_online ?? true;
    const presentAtAllLocations = itemData.present_at_all_locations ?? true;
    const isNotDeleted = !product.is_deleted;
    
    // Product should be active if it's not deleted, available online, and present at locations
    const shouldBeActive = isNotDeleted && availableOnline && presentAtAllLocations && visibility !== 'PRIVATE';
    
    // Log visibility status for debugging
    if (!shouldBeActive) {
      const reasons = [];
      if (product.is_deleted) reasons.push('deleted in Square');
      if (!availableOnline) reasons.push('not available online');
      if (!presentAtAllLocations) reasons.push('not present at all locations');
      if (visibility === 'PRIVATE') reasons.push('visibility set to private');
      logger.info(`🔒 Setting product "${itemData.name}" as inactive: ${reasons.join(', ')}`);
    }

    // Prepare product data
    const productData = {
      name: itemData.name || 'Unknown Product',
      description: itemData.description || '',
      price: extractedPrice,
      squareId: product.id,
      categoryId: category.id,
      images: extractedImages,
      active: shouldBeActive,
      updatedAt: new Date()
    };

    if (this.config.dryRun) {
      // Dry run mode - don't actually modify the database
      if (analysis.existingProduct) {
        this.stats.updated++;
        logger.info(`🔄 [DRY RUN] Would update product: ${productData.name}`);
      } else {
        this.stats.created++;
        logger.info(`🔄 [DRY RUN] Would create product: ${productData.name}`);
      }
    } else {
      // Actually modify the database
      if (analysis.existingProduct) {
        // Update existing product
        const updatedProduct = await prisma.product.update({
          where: { id: analysis.existingProduct.id },
          data: productData
        });
        this.stats.updated++;
        logger.info(`✅ Updated product: ${productData.name}`, {
          id: updatedProduct.id,
          oldPrice: analysis.existingProduct.price,
          newPrice: productData.price,
          oldImageCount: analysis.existingProduct.images?.length || 0,
          newImageCount: productData.images.length,
          category: category.name
        });
      } else {
        // Create new product
        const newProduct = await prisma.product.create({
          data: {
            ...productData,
            slug: this.generateSlug(productData.name),
            ordinal: 0
          }
        });
        this.stats.created++;
        logger.info(`✅ Created product: ${productData.name}`, {
          id: newProduct.id,
          price: productData.price,
          imageCount: productData.images.length,
          category: category.name
        });
      }
    }

    if (this.config.enableImageSync && productData.images.length > 0) {
      this.stats.imagesProcessed++;
    }
  }

  /**
   * Extract price from Square item data
   */
  private extractPrice(itemData: any): number {
    const variations = itemData.variations || [];
    if (variations.length === 0) return 0;

    const firstVariation = variations[0];
    // Fix: Use correct field names from Square API
    const priceData = firstVariation.item_variation_data?.price_money;
    
    if (priceData && priceData.amount) {
      // Handle both number and BigInt types from Square API
      return parseInt(priceData.amount.toString()) / 100; // Convert from cents to dollars
    }

    return 0;
  }

  /**
   * Extract images from Square product data
   */
  private extractImages(product: any, relatedObjects: any[]): string[] {
    const images: string[] = [];
    
    // Fix: Use correct field names from Square API
    if (product.item_data?.image_ids) {
      logger.debug(`🔍 Looking for images for product ${product.item_data.name}:`, {
        imageIds: product.item_data.image_ids,
        relatedObjectCount: relatedObjects.length,
        imageObjectsAvailable: relatedObjects.filter(obj => obj.type === 'IMAGE').map(obj => obj.id)
      });

      for (const imageId of product.item_data.image_ids) {
        const imageObject = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');
        if (imageObject?.image_data?.url) {
          images.push(imageObject.image_data.url);
          logger.debug(`✅ Found image URL for ${imageId}: ${imageObject.image_data.url}`);
        } else {
          logger.warn(`❌ Could not find image object for ID ${imageId}`, {
            availableObjects: relatedObjects.filter(obj => obj.id === imageId).map(obj => ({ id: obj.id, type: obj.type }))
          });
        }
      }
    }

    return images;
  }

  /**
   * Generate URL-safe slug from product name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Ensure appropriate category exists for the product
   */
  private async ensureProductCategory(product: any, relatedObjects: any[]) {
    // Extract category from Square data
    const categoryIds = product.item_data?.categories?.map((cat: any) => cat.id) || [];
    
    if (categoryIds.length > 0) {
      const categoryId = categoryIds[0];
      const categoryMatch = this.checkCategoryMatch(categoryId, relatedObjects);
      
      if (categoryMatch.categoryName) {
        // Try to find existing category in database
        const existingCategory = await prisma.category.findFirst({
          where: { 
            OR: [
              { name: categoryMatch.categoryName },
              { squareId: categoryId }
            ]
          }
        });

        if (existingCategory) {
          // Update the squareId if it's missing
          if (!existingCategory.squareId) {
            await prisma.category.update({
              where: { id: existingCategory.id },
              data: { squareId: categoryId }
            });
          }
          return existingCategory;
        }

        // Create new category
        const slug = categoryMatch.categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const order = categoryMatch.categoryName === 'ALFAJORES' ? 1 : 
                     categoryMatch.categoryName === 'EMPANADAS' ? 2 : 999;

        return await prisma.category.create({
          data: {
            name: categoryMatch.categoryName,
            description: `${categoryMatch.categoryName} from Square`,
            slug,
            order,
            active: true,
            squareId: categoryId
          }
        });
      }
    }

    // Fallback to default category
    return await this.ensureDefaultCategory();
  }

  /**
   * Ensure default category exists
   */
  private async ensureDefaultCategory() {
    const existing = await prisma.category.findFirst({
      where: { name: 'Products' }
    });

    if (existing) return existing;

    return await prisma.category.create({
      data: {
        name: 'Products',
        description: 'Default category for Square products',
        slug: 'products',
        order: 999,
        active: true
      }
    });
  }

  /**
   * Create sync history record
   */
  private async createSyncHistory(startTime: Date): Promise<void> {
    try {
      await prisma.syncHistory.create({
        data: {
          id: this.syncId,
          syncType: 'FILTERED',
          startedAt: startTime,
          productsSynced: 0,
          productsSkipped: 0,
          errors: [],
          metadata: {
            config: JSON.parse(JSON.stringify(this.config)),
            strategy: 'FILTERED'
          }
        }
      });
    } catch (error) {
      logger.warn('⚠️ Failed to create sync history record:', error);
    }
  }

  /**
   * Update sync history record
   */
  private async updateSyncHistory(success: boolean, endTime: Date, error?: any): Promise<void> {
    try {
      await prisma.syncHistory.update({
        where: { id: this.syncId },
        data: {
          completedAt: endTime,
          productsSynced: this.stats.created + this.stats.updated,
          productsSkipped: this.stats.skipped + this.stats.protected,
          errors: error ? [error instanceof Error ? error.message : String(error)] : [],
          metadata: {
            config: JSON.parse(JSON.stringify(this.config)),
            strategy: 'FILTERED',
            stats: JSON.parse(JSON.stringify(this.stats)),
            success
          }
        }
      });
    } catch (updateError) {
      logger.warn('⚠️ Failed to update sync history record:', updateError);
    }
  }

  /**
   * Generate final sync report
   */
  private generateSyncReport(
    success: boolean, 
    syncResult: any, 
    startTime: Date, 
    endTime: Date, 
    error?: any
  ): SyncResult {
    const duration = endTime.getTime() - startTime.getTime();
    
    return {
      success,
      message: success 
        ? `Filtered sync completed successfully. Synced ${this.stats.created + this.stats.updated} products, protected ${this.stats.protected} catering items.`
        : `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      syncedProducts: this.stats.created + this.stats.updated,
      protectedItems: this.stats.protected,
      errors: error ? [error instanceof Error ? error.message : String(error)] : [],
      warnings: [],
      productDetails: {
        created: this.stats.created,
        updated: this.stats.updated,
        withImages: this.stats.imagesProcessed,
        withoutImages: (this.stats.created + this.stats.updated) - this.stats.imagesProcessed,
        skipped: this.stats.skipped
      },
      metadata: {
        syncId: this.syncId,
        startedAt: startTime,
        completedAt: endTime,
        strategy: 'FILTERED'
      }
    };
  }
}

/**
 * Main function to perform filtered sync
 */
export async function syncFilteredProducts(config?: Partial<FilteredSyncConfig>): Promise<SyncResult> {
  const manager = new FilteredSyncManager(config);
  return await manager.syncProducts();
}

/**
 * Preview filtered sync without executing it
 */
export async function previewFilteredSync(config?: Partial<FilteredSyncConfig>): Promise<PreviewResult> {
  const manager = new FilteredSyncManager(config);
  return await manager.previewSync();
}