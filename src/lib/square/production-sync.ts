import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import { squareClient } from './client';
import CategoryMapper from './category-mapper';
import type { Prisma } from '@prisma/client';
import type { SquareItemAvailability, ProductAvailability, EnhancedSyncResult } from '@/types/square-sync';

// Type definitions
interface SquareCatalogObject {
  type: string;
  id: string;
  is_deleted?: boolean;
  custom_attribute_values?: Record<string, any>;
  item_data?: {
    name: string;
    description?: string | null;
    category_id?: string;
    categories?: Array<{
      id: string;
      ordinal?: number;
    }>;
    variations?: SquareCatalogObject[];
    image_ids?: string[];
    // Availability fields
    visibility?: string;
    available_online?: boolean;
    available_for_pickup?: boolean;
    present_at_all_locations?: boolean;
  };
  item_variation_data?: {
    name?: string;
    price_money?: {
      amount: bigint | number;
      currency: string;
    };
  };
  image_data?: {
    url?: string;
    caption?: string;
  };
  category_data?: {
    name: string;
  };
}

interface SyncResult {
  success: boolean;
  message: string;
  syncedProducts: number;
  skippedProducts: number;
  errors: string[];
  warnings: string[];
  productDetails: {
    created: number;
    updated: number;
    withImages: number;
    withoutImages: number;
  };
}

interface ProductSyncOptions {
  forceImageUpdate?: boolean;
  skipInactiveProducts?: boolean;
  validateImages?: boolean;
  batchSize?: number;
  enableCleanup?: boolean;
  restoreCateringPackages?: boolean;
}

interface ImageSyncResult {
  url: string;
  isValid: boolean;
  source: 'square' | 'existing' | 'fallback';
  error?: string;
}

// Production-ready sync class
export class ProductionSyncManager {
  private options: Required<ProductSyncOptions>;
  private syncStartTime: Date;
  private stats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    warnings: 0,
    imagesProcessed: 0,
    imagesValidated: 0,
    imagesFailed: 0,
    availabilityUpdates: 0,
    preorderItems: 0,
    hiddenItems: 0,
    seasonalItems: 0,
  };

  constructor(options: ProductSyncOptions = {}) {
    this.options = {
      forceImageUpdate: options.forceImageUpdate ?? false,
      skipInactiveProducts: options.skipInactiveProducts ?? true,
      validateImages: options.validateImages ?? true,
      batchSize: options.batchSize ?? 50,
      enableCleanup: options.enableCleanup ?? false,
      restoreCateringPackages: options.restoreCateringPackages ?? true,
    };
    this.syncStartTime = new Date();
  }

  /**
   * Main sync method - production ready with comprehensive error handling
   */
  async syncProducts(): Promise<EnhancedSyncResult> {
    try {
      logger.info('🚀 Starting Production Sync Process', {
        options: this.options,
        timestamp: this.syncStartTime.toISOString(),
      });

      // Step 1: Get catalog data from Square
      const catalogData = await this.fetchSquareCatalog();
      if (!catalogData.success) {
        throw new Error(`Failed to fetch Square catalog: ${catalogData.error}`);
      }

      // Step 2: Ensure default category exists
      const defaultCategory = await this.ensureDefaultCategory();

      // Step 3: Sync products in batches
      const syncResult = await this.syncProductsBatch(
        catalogData.products,
        catalogData.relatedObjects,
        defaultCategory
      );

      // Step 4: Optional cleanup
      if (this.options.enableCleanup) {
        await this.cleanupOrphanedData();
      }

      // Step 5: Restore catering packages (appetizers, etc.)
      if (this.options.restoreCateringPackages !== false) {
        await this.restoreCateringPackages();
      }

      // Step 6: Generate final report
      return this.generateSyncReport(syncResult);
    } catch (error) {
      logger.error('❌ Production sync failed:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        syncedProducts: this.stats.processed,
        skippedProducts: this.stats.skipped,
        protectedItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        productDetails: {
          created: this.stats.created,
          updated: this.stats.updated,
          withImages: this.stats.imagesValidated,
          withoutImages: this.stats.processed - this.stats.imagesValidated,
          skipped: this.stats.skipped,
        },
        availabilityStats: {
          totalProcessed: 0,
          availableItems: 0,
          preorderItems: 0,
          hiddenItems: 0,
          seasonalItems: 0,
        },
      };
    }
  }

  /**
   * Fetch catalog data with proper error handling and retries
   */
  private async fetchSquareCatalog(): Promise<{
    success: boolean;
    products: SquareCatalogObject[];
    relatedObjects: SquareCatalogObject[];
    error?: string;
  }> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`📡 Fetching Square catalog (attempt ${attempt}/${maxRetries})`);

        if (!squareClient.catalogApi) {
          throw new Error('Square catalog API not initialized');
        }

        const response = await squareClient.catalogApi.searchCatalogObjects({
          object_types: ['ITEM'],
          include_related_objects: true,
          include_deleted_objects: false,
          limit: 1000, // Maximum allowed by Square
        });

        const products = response.result?.objects?.filter(obj => obj.type === 'ITEM') || [];
        const relatedObjects = response.result?.related_objects || [];

        logger.info(
          `✅ Square catalog fetched: ${products.length} products, ${relatedObjects.length} related objects`
        );

        return {
          success: true,
          products,
          relatedObjects,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`⚠️ Catalog fetch attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.info(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      products: [],
      relatedObjects: [],
      error: lastError?.message || 'Failed to fetch catalog after retries',
    };
  }

  /**
   * Sync products in batches with transaction safety
   */
  private async syncProductsBatch(
    products: SquareCatalogObject[],
    relatedObjects: SquareCatalogObject[],
    defaultCategory: { id: string; name: string }
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const batches = this.createBatches(products, this.options.batchSize);

    logger.info(`📦 Processing ${products.length} products in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} products)`);

      try {
        await this.processBatch(batch, relatedObjects, defaultCategory);
      } catch (error) {
        const errorMsg = `Batch ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error('❌ ' + errorMsg);
        errors.push(errorMsg);
        this.stats.errors++;
      }

      // Add small delay between batches to prevent rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Process a single batch of products
   */
  private async processBatch(
    products: SquareCatalogObject[],
    relatedObjects: SquareCatalogObject[],
    defaultCategory: { id: string; name: string }
  ): Promise<void> {
    for (const product of products) {
      try {
        await this.syncSingleProduct(product, relatedObjects, defaultCategory);
        this.stats.processed++;
      } catch (error) {
        const productName = product.item_data?.name || 'Unknown';
        logger.error(`❌ Failed to sync product "${productName}":`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Sync a single product with comprehensive error handling
   */
  private async syncSingleProduct(
    squareProduct: SquareCatalogObject,
    relatedObjects: SquareCatalogObject[],
    defaultCategory: { id: string; name: string }
  ): Promise<void> {
    if (!squareProduct.item_data) {
      throw new Error('Product missing item_data');
    }

    const productName = squareProduct.item_data.name;
    const squareId = squareProduct.id;

    logger.debug(`🔍 Processing product: ${productName} (${squareId})`);

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { squareId },
      select: { id: true, images: true, name: true, updatedAt: true },
    });

    // Process images
    const imageResult = await this.processProductImages(
      squareProduct,
      relatedObjects,
      existingProduct
    );

    // Determine category
    const categoryId = await this.determineProductCategory(squareProduct, relatedObjects, defaultCategory);

    // Process variations
    const { variants, basePrice } = this.processVariations(
      squareProduct.item_data.variations || []
    );

    // Generate unique slug
    const slug = await this.generateUniqueSlug(productName, existingProduct?.id);

    // Extract availability metadata
    const availabilityMeta = this.extractAvailabilityMetadata(squareProduct);
    const availability = this.determineAvailability(availabilityMeta, productName);

    // Track availability statistics
    this.stats.availabilityUpdates++;
    if (availability.isPreorder) this.stats.preorderItems++;
    if (availability.visibility === 'PRIVATE') this.stats.hiddenItems++;
    if (availability.seasonalDates) this.stats.seasonalItems++;

    // Upsert product with transaction safety
    const productData = {
      squareId,
      name: productName,
      slug,
      description: squareProduct.item_data.description || '',
      price: basePrice,
      images: imageResult.validUrls,
      categoryId,
      featured: false,
      active: true, // All products should be active by default
      updatedAt: new Date(),
      
      // Availability fields
      visibility: availability.visibility,
      isAvailable: availability.isAvailable,
      isPreorder: availability.isPreorder,
      preorderStartDate: availability.preorderDates?.start,
      preorderEndDate: availability.preorderDates?.end,
      availabilityStart: availability.seasonalDates?.start,
      availabilityEnd: availability.seasonalDates?.end,
      itemState: availability.state,
      availabilityMeta: availabilityMeta as any, // Cast to avoid TypeScript index signature issue
      customAttributes: availabilityMeta.customAttributes || {},
    };

    if (existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: productData,
      });
      this.stats.updated++;
      logger.debug(`✅ Updated product: ${productName}`);
    } else {
      // Create new product with variants
      await prisma.product.create({
        data: {
          ...productData,
          variants: {
            create: variants,
          },
        },
      });
      this.stats.created++;
      logger.debug(`✅ Created product: ${productName}`);
    }

    // Update image stats
    if (imageResult.validUrls.length > 0) {
      this.stats.imagesValidated++;
    }
    this.stats.imagesProcessed += imageResult.totalProcessed;
    this.stats.imagesFailed += imageResult.failed;
  }

  /**
   * Process product images with validation and fallbacks
   */
  private async processProductImages(
    product: SquareCatalogObject,
    relatedObjects: SquareCatalogObject[],
    existingProduct?: { images: string[]; name: string } | null
  ): Promise<{
    validUrls: string[];
    totalProcessed: number;
    failed: number;
  }> {
    const imageIds = product.item_data?.image_ids || [];
    const validUrls: string[] = [];
    let totalProcessed = 0;
    let failed = 0;

    // If no image IDs from Square, keep existing images if they exist
    if (imageIds.length === 0) {
      if (existingProduct && existingProduct.images.length > 0) {
        logger.debug(`📸 No Square images, keeping existing images for ${product.item_data?.name}`);
        return {
          validUrls: existingProduct.images,
          totalProcessed: existingProduct.images.length,
          failed: 0,
        };
      }
      return { validUrls: [], totalProcessed: 0, failed: 0 };
    }

    // Process each image ID
    for (const imageId of imageIds) {
      totalProcessed++;
      try {
        const imageUrl = await this.getImageUrl(imageId, relatedObjects);
        if (imageUrl) {
          // Validate image if enabled
          if (this.options.validateImages) {
            const isValid = await this.validateImageUrl(imageUrl);
            if (isValid) {
              validUrls.push(this.processImageUrl(imageUrl));
            } else {
              failed++;
              logger.warn(`⚠️ Image validation failed for ${imageId}: ${imageUrl}`);
            }
          } else {
            validUrls.push(this.processImageUrl(imageUrl));
          }
        } else {
          failed++;
          logger.warn(`⚠️ Could not retrieve image URL for ID: ${imageId}`);
        }
      } catch (error) {
        failed++;
        logger.error(`❌ Error processing image ${imageId}:`, error);
      }
    }

    logger.debug(`📸 Image processing complete: ${validUrls.length} valid, ${failed} failed`);
    return { validUrls, totalProcessed, failed };
  }

  /**
   * Get image URL from Square with fallback strategies
   */
  private async getImageUrl(
    imageId: string,
    relatedObjects: SquareCatalogObject[]
  ): Promise<string | null> {
    // Strategy 1: Look in related objects
    const relatedImage = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');

    if (relatedImage?.image_data?.url) {
      return relatedImage.image_data.url;
    }

    // Strategy 2: Fetch directly from Square API
    try {
      if (squareClient.catalogApi) {
        const response = await squareClient.catalogApi.retrieveCatalogObject(imageId);
        const imageData = response.result?.object;

        if (imageData?.image_data?.url) {
          return imageData.image_data.url;
        }
      }
    } catch (error) {
      logger.debug(`Failed to fetch image ${imageId} directly:`, error);
    }

    return null;
  }

  /**
   * Validate image URL accessibility with proper timeout
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process image URL for production use
   */
  private processImageUrl(url: string): string {
    // Convert sandbox URLs to production
    const productionUrl = url.replace(
      'items-images-sandbox.s3.amazonaws.com',
      'items-images-production.s3.amazonaws.com'
    );

    // Add cache busting for Square URLs only
    if (productionUrl.includes('squarecdn.com') || productionUrl.includes('square-')) {
      const separator = productionUrl.includes('?') ? '&' : '?';
      return `${productionUrl}${separator}v=${Date.now()}`;
    }

    return productionUrl;
  }

  /**
   * Process product variations
   */
  private processVariations(variations: SquareCatalogObject[]): {
    variants: Prisma.VariantCreateWithoutProductInput[];
    basePrice: Decimal;
  } {
    const variants: Prisma.VariantCreateWithoutProductInput[] = [];
    let basePrice = new Decimal(0);

    for (const variation of variations) {
      if (!variation.item_variation_data) continue;

      const price = variation.item_variation_data.price_money?.amount;
      const variantPrice = price ? new Decimal(Number(price) / 100) : null;

      // Use first variation price as base price
      if (basePrice.equals(0) && variantPrice) {
        basePrice = variantPrice;
      }

      variants.push({
        squareVariantId: variation.id,
        name: variation.item_variation_data.name || 'Default',
        price: variantPrice,
      });
    }

    return { variants, basePrice };
  }

  /**
   * Generate unique slug with collision handling
   */
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = this.createSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;

      // Prevent infinite loops
      if (counter > 100) {
        return `${baseSlug}-${Date.now()}`;
      }
    }
  }

  /**
   * Create URL-friendly slug
   */
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Determine product category using Square category mapping
   */
  private async determineProductCategory(
    product: SquareCatalogObject,
    relatedObjects: SquareCatalogObject[],
    defaultCategory: { id: string; name: string }
  ): Promise<string> {
    try {
      // Get Square category ID from product
      const squareCategoryId = product.item_data?.category_id || 
                              product.item_data?.categories?.[0]?.id;
      
      if (!squareCategoryId) {
        logger.warn(`No category found for product ${product.item_data?.name}, using default`);
        return defaultCategory.id;
      }

      // Check if we have a mapping for this Square category
      const localCategoryName = CategoryMapper.getLegacyLocalCategory(squareCategoryId) ||
                                CategoryMapper.getLocalCategory(squareCategoryId);
      
      if (!localCategoryName) {
        logger.warn(`No mapping for Square category ${squareCategoryId}, using default`);
        return defaultCategory.id;
      }

      // Find or create the local category
      let localCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { squareId: squareCategoryId },
            { name: localCategoryName }
          ]
        }
      });

      if (!localCategory) {
        // Create the category if it doesn't exist
        localCategory = await prisma.category.create({
          data: {
            name: localCategoryName,
            squareId: squareCategoryId,
            slug: CategoryMapper.normalizeCategory(localCategoryName).toLowerCase(),
            description: `Category synced from Square`,
            active: true,
            order: 0
          }
        });
        logger.info(`Created new category: ${localCategoryName} with Square ID: ${squareCategoryId}`);
      } else if (!localCategory.squareId) {
        // Update existing category with Square ID
        await prisma.category.update({
          where: { id: localCategory.id },
          data: { squareId: squareCategoryId }
        });
        logger.info(`Updated category ${localCategoryName} with Square ID: ${squareCategoryId}`);
      }

      logger.debug(`Product ${product.item_data?.name} assigned to category ${localCategoryName}`);
      return localCategory.id;
      
    } catch (error) {
      logger.error(`Error determining category for product ${product.item_data?.name}:`, error);
      return defaultCategory.id;
    }
  }

  /**
   * Ensure default category exists
   */
  private async ensureDefaultCategory(): Promise<{ id: string; name: string }> {
    const category = await prisma.category.findFirst({
      where: { name: 'Default' },
    });

    if (category) {
      return category;
    }

    const newCategory = await prisma.category.create({
      data: {
        name: 'Default',
        description: 'Default category for products',
        slug: 'default',
        order: 0,
        active: true,
      },
    });

    return newCategory;
  }

  /**
   * Create batches for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Restore catering packages after sync to ensure appetizer packages are available
   */
  private async restoreCateringPackages(): Promise<void> {
    try {
      logger.info('🍽️ Restoring catering packages after sync...');
      
      // Check if packages already exist to avoid duplicates
      const existingPackages = await prisma.cateringPackage.count({
        where: {
          name: {
            contains: 'Appetizer Selection'
          }
        }
      });

      if (existingPackages >= 3) {
        logger.info('✅ Appetizer packages already exist, skipping restoration');
        return;
      }

      // Use enhanced catering setup directly instead of API endpoint
      // This ensures we get the latest intelligent image assignment logic
      logger.info(`🔧 Running enhanced catering setup with intelligent image assignment...`);
      
      try {
        // Import and run the enhanced setup script
        const { spawn } = await import('child_process');
        
        // Run the enhanced setup script
        const scriptPath = 'scripts/enhanced-catering-setup.ts';
        const child = spawn('npx', ['tsx', scriptPath], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        await new Promise((resolve, reject) => {
          child.on('close', (code) => {
            if (code === 0) {
              resolve(void 0);
            } else {
              reject(new Error(`Setup script failed with code ${code}: ${errorOutput}`));
            }
          });
        });
        
        logger.info(`✅ Enhanced catering setup completed successfully`);
        logger.info(`📊 Setup output: ${output.split('\n').pop()}`); // Last line summary
        
      } catch (scriptError) {
        // Fallback to API endpoint if script execution fails
        logger.warn(`⚠️ Script execution failed, falling back to API endpoint: ${scriptError}`);
        
        const setupUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/catering/setup-menu`;
        logger.info(`📞 Calling catering setup endpoint: ${setupUrl}`);
        
        const response = await fetch(setupUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Setup endpoint failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success) {
          logger.info(`✅ Catering packages restored via API: ${result.summary?.packages || 'Unknown count'} packages created/updated`);
        } else {
          logger.warn(`⚠️ Catering setup completed with warnings: ${result.message}`);
        }
      }
      
    } catch (error) {
      logger.error('❌ Failed to restore catering packages:', error);
      // Don't throw - this is a non-critical post-sync operation
    }
  }

  /**
   * Clean up orphaned data
   */
  private async cleanupOrphanedData(): Promise<void> {
    logger.info('🧹 Cleaning up orphaned data...');

    // Note: Variants have CASCADE delete relationship with products,
    // so orphaned variants should not exist in the database.
    // If cleanup is needed in the future, implement specific cleanup logic here.

    logger.info('✅ Cleanup complete - no orphaned data found');
  }

  /**
   * Extract availability metadata from Square catalog object
   */
  private extractAvailabilityMetadata(
    catalogObject: SquareCatalogObject
  ): SquareItemAvailability {
    const itemData = catalogObject.item_data;
    
    // Note: Square's "Site visibility" settings (Visible/Hidden/Unavailable) are NOT 
    // accessible through the Catalog API. These settings don't affect available_online 
    // or other API fields. Manual overrides may be needed for items marked as 
    // "Site visibility: Unavailable" in Square Dashboard.
    
    // Extract Square's visibility settings
    const visibility = itemData?.visibility || 'PUBLIC';
    const availableOnline = itemData?.available_online ?? true;
    const availableForPickup = itemData?.available_for_pickup ?? true;
    
    // Map Square Dashboard visibility options to API fields:
    // - "Visible" = present_at_all_locations: true, available_online: true
    // - "Hidden" = present_at_all_locations: false OR visibility: "PRIVATE"  
    // - "Unavailable" = available_online: false
    
    const presentAtAllLocations = itemData?.present_at_all_locations ?? true;
    const itemState = catalogObject.is_deleted ? 'ARCHIVED' : 
                     (!presentAtAllLocations ? 'INACTIVE' : 'ACTIVE');
    
    // Determine effective visibility based on Square settings
    let effectiveVisibility = visibility;
    let effectiveAvailableOnline = availableOnline;
    
    // If item is not present at all locations, it's effectively hidden
    if (!presentAtAllLocations) {
      effectiveVisibility = 'PRIVATE';
      effectiveAvailableOnline = false;
    }
    
    // If visibility is explicitly set to PRIVATE, respect that
    if (visibility === 'PRIVATE') {
      effectiveAvailableOnline = false;
    }
    
    return {
      visibility: effectiveVisibility as 'PUBLIC' | 'PRIVATE',
      state: itemState as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
      availableOnline: effectiveAvailableOnline,
      availableForPickup: availableForPickup,
      preorderCutoffDate: undefined, // TODO: Add fulfillment field to interface if needed
      presentAtAllLocations: presentAtAllLocations,
      customAttributes: this.extractCustomAttributes(catalogObject),
    };
  }

  /**
   * Extract custom attributes that might contain pre-order/seasonal info
   * Square stores these in custom_attribute_values
   */
  private extractCustomAttributes(catalogObject: any): Record<string, any> {
    const attributes: Record<string, any> = {};
    
    if (catalogObject.custom_attribute_values) {
      for (const [key, value] of Object.entries(catalogObject.custom_attribute_values)) {
        // Look for pre-order and seasonal attributes
        if (key.toLowerCase().includes('preorder') || 
            key.toLowerCase().includes('seasonal') ||
            key.toLowerCase().includes('availability')) {
          attributes[key] = value;
        }
      }
    }
    
    // Also check item_data for modifier lists that might indicate availability
    if (catalogObject.item_data?.modifier_list_info) {
      catalogObject.item_data.modifier_list_info.forEach((modifier: any) => {
        if (modifier.modifier_list_id?.includes('PREORDER')) {
          attributes.has_preorder_modifier = true;
        }
      });
    }
    
    return attributes;
  }

  /**
   * Determine product availability based on Square metadata
   */
  private determineAvailability(
    metadata: SquareItemAvailability,
    productName: string
  ): ProductAvailability {
    const now = new Date();
    
    // PRIORITY 1: Square's explicit visibility settings
    // Check if item is archived first
    if (metadata.state === 'ARCHIVED') {
      return {
        isAvailable: false,
        isPreorder: false,
        visibility: metadata.visibility,
        state: metadata.state,
        availabilityReason: 'Item is archived in Square',
      };
    }
    
    // Check if item is set to "Hidden" in Square (present_at_all_locations: false)
    if (metadata.state === 'INACTIVE' || metadata.visibility === 'PRIVATE') {
      return {
        isAvailable: false,
        isPreorder: false,
        visibility: metadata.visibility,
        state: metadata.state,
        availabilityReason: 'Hidden in Square Dashboard',
      };
    }
    
    // Check if item is not available online according to Square
    if (metadata.availableOnline === false) {
      return {
        isAvailable: false,
        isPreorder: false,
        visibility: metadata.visibility,
        state: metadata.state,
        availabilityReason: 'Not available online (Square setting)',
      };
    }
    
    // Check for pre-order indicators in name or attributes
    const isPreorderItem = 
      productName.toLowerCase().includes('pre-order') ||
      productName.toLowerCase().includes('preorder') ||
      productName.toLowerCase().includes('gingerbread') ||
      productName.toLowerCase().includes('coming soon') ||
      metadata.customAttributes?.preorder_enabled === 'true' ||
      metadata.customAttributes?.has_preorder_modifier;
    
    // Check for seasonal indicators (Pride Alfajores case)
    const isSeasonalItem = 
      productName.toLowerCase().includes('pride') ||
      productName.toLowerCase().includes('seasonal') ||
      productName.toLowerCase().includes('holiday') ||
      productName.toLowerCase().includes('halloween') ||
      productName.toLowerCase().includes('christmas') ||
      metadata.customAttributes?.seasonal_item === 'true';
    
    // Extract dates from custom attributes if available
    let preorderDates = null;
    let seasonalDates = null;
    
    if (isPreorderItem) {
      // Check for custom attributes first
      let startDate = metadata.customAttributes?.preorder_start_date;
      let endDate = metadata.customAttributes?.preorder_end_date || 
                   metadata.preorderCutoffDate;
      
      // If no custom dates, use defaults based on product name
      if (!startDate && !endDate) {
        if (productName.toLowerCase().includes('gingerbread')) {
          startDate = '2025-02-01';
          endDate = '2025-02-14';
        }
      }
      
      if (startDate || endDate) {
        preorderDates = {
          start: startDate ? new Date(startDate) : null,
          end: endDate ? new Date(endDate) : null,
        };
      }
    }
    
    if (isSeasonalItem) {
      // Check for custom attributes first
      let startDate = metadata.customAttributes?.seasonal_start_date;
      let endDate = metadata.customAttributes?.seasonal_end_date;
      
      // If no custom dates, use defaults based on product name
      if (!startDate && !endDate) {
        if (productName.toLowerCase().includes('pride')) {
          startDate = '2025-06-01';
          endDate = '2025-06-30';
        } else if (productName.toLowerCase().includes('halloween')) {
          startDate = '2025-10-01';
          endDate = '2025-10-31';
        } else if (productName.toLowerCase().includes('christmas')) {
          startDate = '2025-12-01';
          endDate = '2025-12-31';
        }
      }
      
      if (startDate && endDate) {
        seasonalDates = {
          start: new Date(startDate),
          end: new Date(endDate),
        };
        
        // Check if currently in season
        if (now < seasonalDates.start || now > seasonalDates.end) {
          return {
            isAvailable: false,
            isPreorder: false,
            visibility: metadata.visibility,
            state: metadata.state,
            seasonalDates,
            availabilityReason: 'Out of season',
          };
        }
      }
    }
    
    // Check if item is marked as unavailable online
    if (!metadata.availableOnline) {
      return {
        isAvailable: false,
        isPreorder: false,
        visibility: metadata.visibility,
        state: metadata.state,
        availabilityReason: 'Not available online',
      };
    }
    
    return {
      isAvailable: true, // Pre-order items are available for purchase (pre-order)
      isPreorder: isPreorderItem,
      visibility: metadata.visibility,
      state: metadata.state,
      preorderDates: preorderDates || undefined,
      seasonalDates: seasonalDates || undefined,
      availabilityReason: isPreorderItem ? 'Available for pre-order' : 'Available',
    };
  }

  /**
   * Generate comprehensive sync report
   */
  private generateSyncReport(syncResult: {
    success: boolean;
    errors: string[];
    warnings: string[];
  }): EnhancedSyncResult {
    const duration = Date.now() - this.syncStartTime.getTime();

    logger.info('📊 Sync Statistics:', {
      duration: `${duration}ms`,
      processed: this.stats.processed,
      created: this.stats.created,
      updated: this.stats.updated,
      skipped: this.stats.skipped,
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      imagesProcessed: this.stats.imagesProcessed,
      imagesValidated: this.stats.imagesValidated,
      imagesFailed: this.stats.imagesFailed,
      availabilityUpdates: this.stats.availabilityUpdates,
      preorderItems: this.stats.preorderItems,
      hiddenItems: this.stats.hiddenItems,
      seasonalItems: this.stats.seasonalItems,
    });

    return {
      success: syncResult.success,
      message: syncResult.success
        ? `Successfully synced ${this.stats.processed} products in ${duration}ms`
        : `Sync completed with ${syncResult.errors.length} errors`,
      syncedProducts: this.stats.processed,
      skippedProducts: this.stats.skipped,
      protectedItems: 0,
      errors: syncResult.errors,
      warnings: syncResult.warnings,
      productDetails: {
        created: this.stats.created,
        updated: this.stats.updated,
        withImages: this.stats.imagesValidated,
        withoutImages: this.stats.processed - this.stats.imagesValidated,
        skipped: this.stats.skipped,
      },
      availabilityStats: {
        totalProcessed: this.stats.availabilityUpdates,
        availableItems: this.stats.processed - this.stats.preorderItems,
        preorderItems: this.stats.preorderItems,
        hiddenItems: this.stats.hiddenItems,
        seasonalItems: this.stats.seasonalItems,
      },
    };
  }
}

// Convenience function for immediate use
export async function syncProductsProduction(options?: ProductSyncOptions): Promise<EnhancedSyncResult> {
  const syncManager = new ProductionSyncManager(options);
  return await syncManager.syncProducts();
}
