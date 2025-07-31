/**
 * Filtered Square Sync Manager
 * 
 * This service handles syncing only alfajores and empanadas from Square
 * while protecting all catering items from modification.
 */

import { squareClient } from './client';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { cateringProtection } from './catering-protection';
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
    this.syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

      // Step 1: Initialize catering protection
      await cateringProtection.initialize();

      // Step 2: Create sync history record
      await this.createSyncHistory(startTime);

      // Step 3: Backup catering images if needed
      const imageBackup = this.config.enableImageSync ? 
        await cateringProtection.backupCateringImages() : {};

      // Step 4: Fetch filtered catalog from Square
      const catalogData = await this.fetchFilteredCatalog();
      if (!catalogData.success) {
        throw new Error(`Failed to fetch Square catalog: ${catalogData.error}`);
      }

      // Step 5: Process products in batches
      const syncResult = await this.processProductsBatch(
        catalogData.products,
        catalogData.relatedObjects
      );

      // Step 6: Restore catering images
      if (this.config.enableImageSync && Object.keys(imageBackup).length > 0) {
        await cateringProtection.restoreCateringImages(imageBackup);
      }

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

      // Initialize protection to identify what should be skipped
      await cateringProtection.initialize();

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
      
      const response = await catalogApi.searchCatalogObjects({
        objectTypes: ['ITEM'],
        query: {
          sortedAttributeQuery: {
            attributeName: 'name'
          }
        },
        includeRelatedObjects: true,
        limit: 1000
      });

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

      // Filter products to only include items that match our criteria
      const filteredProducts = objects.filter(obj => this.shouldProcessProduct(obj));

      logger.info(`📦 Fetched ${objects.length} total products, ${filteredProducts.length} match filter criteria`);

      return {
        success: true,
        products: filteredProducts,
        relatedObjects
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
  private shouldProcessProduct(product: any): boolean {
    const itemData = product.itemData;
    if (!itemData) return false;

    const productName = itemData.name || '';
    
    // Check if product name matches allowed patterns
    const nameMatches = this.config.allowedProductNames.some(pattern => 
      pattern.test(productName)
    );

    if (nameMatches) {
      logger.debug(`✅ Product "${productName}" matches name pattern`);
      return true;
    }

    // Check if product is in an allowed category
    if (itemData.categoryId) {
      // Note: We would need to fetch category data to check names
      // For now, we'll rely on name patterns primarily
      logger.debug(`🔍 Product "${productName}" has category ${itemData.categoryId}, checking against allowed list`);
    }

    return false;
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
    const itemData = product.itemData;
    const productName = itemData?.name || 'Unknown Product';

    // Check if this product is protected
    const existingProduct = await prisma.product.findFirst({
      where: { squareId: product.id },
      include: { category: true }
    });

    if (existingProduct) {
      const isProtected = await cateringProtection.isProductProtected(
        existingProduct.id,
        existingProduct.squareId || undefined,
        existingProduct.category?.name
      );

      if (isProtected) {
        this.stats.protected++;
        return {
          shouldSync: false,
          productName,
          skipReason: 'Product is protected (catering item)',
          existingProduct
        };
      }
    }

    // Check if product matches our filter criteria
    const shouldSync = this.shouldProcessProduct(product);

    if (!shouldSync) {
      return {
        shouldSync: false,
        productName,
        skipReason: 'Does not match alfajores/empanadas filter criteria'
      };
    }

    return {
      shouldSync: true,
      productName,
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
    for (const product of products) {
      try {
        await this.processProduct(product, relatedObjects);
        this.stats.processed++;
      } catch (error) {
        this.stats.errors++;
        logger.error(`❌ Failed to process product ${product.id}:`, error);
      }
    }
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

    const itemData = product.itemData;
    if (!itemData) return;

    // Get or create default category for products
    const defaultCategory = await this.ensureDefaultCategory();

    // Prepare product data
    const productData = {
      name: itemData.name || 'Unknown Product',
      description: itemData.description || '',
      price: this.extractPrice(itemData),
      squareId: product.id,
      categoryId: defaultCategory.id,
      images: this.config.enableImageSync ? this.extractImages(product, relatedObjects) : [],
      active: !itemData.isDeleted,
      updatedAt: new Date()
    };

    if (analysis.existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: analysis.existingProduct.id },
        data: productData
      });
      this.stats.updated++;
      logger.debug(`✅ Updated product: ${productData.name}`);
    } else {
      // Create new product
      await prisma.product.create({
        data: {
          ...productData,
          slug: this.generateSlug(productData.name),
          ordinal: 0
        }
      });
      this.stats.created++;
      logger.debug(`✅ Created product: ${productData.name}`);
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
    const priceData = firstVariation.itemVariationData?.priceMoney;
    
    if (priceData && priceData.amount) {
      return parseInt(priceData.amount) / 100; // Convert from cents to dollars
    }

    return 0;
  }

  /**
   * Extract images from Square product data
   */
  private extractImages(product: any, relatedObjects: any[]): string[] {
    const images: string[] = [];
    
    if (product.itemData?.imageIds) {
      for (const imageId of product.itemData.imageIds) {
        const imageObject = relatedObjects.find(obj => obj.id === imageId);
        if (imageObject?.imageData?.url) {
          images.push(imageObject.imageData.url);
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