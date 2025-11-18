// src/lib/square/sync.ts

import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db';
// import { createSanityProduct } from '@/lib/sanity/createProduct'; // Removed Sanity import
import { Decimal } from '@prisma/client/runtime/library';
import { squareClient, getCatalogClient } from './client';
import type { SquareClient, SquareCatalogApi } from '@/types/square';

// Import types from Prisma
import type { Prisma } from '@prisma/client';

// Define Square types to match the snake_case from the API
interface SquareCatalogObject {
  type: string;
  id: string;
  is_deleted?: boolean;
  item_data?: {
    name: string;
    description?: string | null;
    description_html?: string | null;
    description_plaintext?: string | null;
    category_id?: string; // Legacy field, kept for backward compatibility
    categories?: Array<{
      id: string;
      ordinal?: number;
    }>;
    variations?: SquareCatalogObject[];
    image_ids?: string[];
    // Square API availability fields
    visibility?: string;
    available_online?: boolean;
    available_for_pickup?: boolean;
    present_at_all_locations?: boolean;
    // Nutrition information from Square API
    food_and_beverage_details?: {
      calorie_count?: number;
      dietary_preferences?: string[];
      ingredients?: string;
    };
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
  message?: string;
  syncedProducts: number;
  errors?: string[];
  debugInfo?: any; // Added for debugging
}

/**
 * Information about duplicate categories detected during sync
 */
interface DuplicateCategoryInfo {
  categoryName: string;
  categories: Array<{
    squareId: string;
    itemCount: number;
  }>;
  winnerId: string; // Category with most items
  duplicateIds: string[]; // Categories to merge
}

// Define a helper type for variant creation
type VariantCreate = Prisma.VariantCreateWithoutProductInput;

// Enhanced batch processing constants with rate limiting
const BATCH_SIZE = 5; // Reduced from 10 to be more conservative
const IMAGE_BATCH_SIZE = 3; // Reduced from 5
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent API calls
const RATE_LIMIT_DELAY = 250; // 250ms between requests
const RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff
const MAX_RETRIES = 3;

// Rate limiting utilities
class RateLimiter {
  private lastRequestTime = 0;
  private requestQueue: Array<() => void> = [];
  private processing = false;

  async throttle(): Promise<void> {
    return new Promise(resolve => {
      this.requestQueue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest >= RATE_LIMIT_DELAY) {
      // Can make request immediately
      this.executeNext();
    } else {
      // Need to wait
      const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
      setTimeout(() => this.executeNext(), delay);
    }
  }

  private executeNext(): void {
    const next = this.requestQueue.shift();
    if (next) {
      this.lastRequestTime = Date.now();
      next();
    }

    this.processing = false;
    if (this.requestQueue.length > 0) {
      this.processQueue();
    }
  }
}

// Database connection retry utility
async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a database connection error
      if (
        errorMessage.includes("Can't reach database server") ||
        errorMessage.includes('Connection terminated') ||
        errorMessage.includes('Connection refused')
      ) {
        if (attempt === maxRetries) {
          logger.error(`Database operation failed after ${maxRetries} attempts:`, error);
          throw error;
        }

        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        logger.warn(`Database connection failed (attempt ${attempt}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For non-connection errors, throw immediately
      throw error;
    }
  }

  throw new Error(`Database operation failed after ${maxRetries} attempts`);
}

// Square API retry utility with exponential backoff
async function withSquareRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle rate limiting specifically
      if (errorMessage.includes('429') || errorMessage.includes('RATE_LIMITED')) {
        if (attempt === maxRetries) {
          logger.error(`Square API rate limited after ${maxRetries} attempts`);
          throw error;
        }

        // Exponential backoff with jitter for rate limiting
        const baseDelay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        logger.warn(`Rate limited (attempt ${attempt}), waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Handle other API errors
      if (
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503')
      ) {
        if (attempt === maxRetries) {
          logger.error(`Square API server error after ${maxRetries} attempts:`, error);
          throw error;
        }

        const delay = RETRY_DELAY_BASE * attempt;
        logger.warn(`Square API server error (attempt ${attempt}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw new Error(`Square API operation failed after ${maxRetries} attempts`);
}

// Initialize rate limiter
const rateLimiter = new RateLimiter();

async function getOrCreateDefaultCategory() {
  try {
    // Try to get the default category from the database
    const defaultCategory = await prisma.category.findFirst({
      where: { name: 'Default' },
    });

    if (defaultCategory) {
      return defaultCategory;
    }

    // Create a default category if it doesn't exist
    logger.info('Default category not found, creating...');
    const newCategory = await prisma.category.create({
      data: {
        name: 'Default',
        description: 'Default category for imported products',
        slug: 'default', // Ensure slug is unique and URL-friendly
        order: 0, // Or determine order based on existing categories
        active: true, // Assuming new categories should be active
        // Remove metadata if not defined in your Prisma schema
        // metadata: {
        //   createdAt: new Date().toISOString(),
        //   updatedAt: new Date().toISOString(),
        // }
      },
    });
    logger.info(`Created default category with ID: ${newCategory.id}`);

    // Sanity creation block removed here

    return newCategory;
  } catch (error) {
    logger.error('Error getting/creating default category:', error);
    // Consider re-throwing or returning null/undefined based on error handling strategy
    throw error; // Re-throw for the main sync function to catch
  }
}

// Function to check if a category name is a catering category
function isCateringCategory(name: string): boolean {
  // Normalize by trimming spaces and converting to uppercase
  const normalizedName = name.trim().toUpperCase();
  // Detailed logging for debugging
  logger.info(`Category name check: "${name}" normalized to "${normalizedName}"`);

  // Check for both formats with and without space after hyphen
  const isCatering =
    normalizedName === 'CATERING' ||
    normalizedName.startsWith('CATERING-') ||
    normalizedName.startsWith('CATERING- ');

  if (isCatering) {
    logger.info(`✓ DETECTED AS CATERING CATEGORY: "${name}"`);
  }

  return isCatering;
}

/**
 * Detects duplicate category names in Square catalog and determines which one to use
 * Returns information about duplicates, with the "winner" being the category with most items
 */
function detectDuplicateCategories(
  categories: SquareCatalogObject[],
  items: SquareCatalogObject[]
): DuplicateCategoryInfo[] {
  const duplicates: DuplicateCategoryInfo[] = [];
  
  // Group categories by name (case-insensitive)
  const categoryGroups = new Map<string, SquareCatalogObject[]>();
  
  for (const category of categories) {
    if (category.type !== 'CATEGORY' || !category.category_data?.name) {
      continue;
    }
    
    const normalizedName = category.category_data.name.trim().toUpperCase();
    const existing = categoryGroups.get(normalizedName) || [];
    existing.push(category);
    categoryGroups.set(normalizedName, existing);
  }
  
  // Find duplicates (more than one category with same name)
  for (const [normalizedName, categoryGroup] of categoryGroups.entries()) {
    if (categoryGroup.length <= 1) {
      continue; // Not a duplicate
    }
    
    // Count items in each category
    const categoriesWithCounts = categoryGroup.map(cat => {
      const itemCount = items.filter(item => {
        if (item.type !== 'ITEM' || !item.item_data) return false;
        
        // Check both legacy category_id and modern categories array
        const categoryIdFromItem = item.item_data.categories?.[0]?.id || item.item_data.category_id;
        return categoryIdFromItem === cat.id;
      }).length;
      
      return {
        squareId: cat.id,
        itemCount,
      };
    });
    
    // Sort by item count descending - winner has most items
    categoriesWithCounts.sort((a, b) => b.itemCount - a.itemCount);
    
    const winnerId = categoriesWithCounts[0].squareId;
    const duplicateIds = categoriesWithCounts.slice(1).map(c => c.squareId);
    
    duplicates.push({
      categoryName: categoryGroup[0].category_data?.name || normalizedName,
      categories: categoriesWithCounts,
      winnerId,
      duplicateIds,
    });
  }
  
  return duplicates;
}

// Enhanced function to get or create a category with proper upsert logic
async function getOrCreateCategoryByName(
  name: string,
  squareId?: string
): Promise<{ id: string; name: string }> {
  try {
    // Generate the slug first
    const slug = createSlug(name);
    logger.debug(`Looking for category "${name}" with slug "${slug}"`);

    // First priority: Find by Square ID if provided
    if (squareId) {
      const categoryBySquareId = await prisma.category.findFirst({
        where: { squareId },
      });

      if (categoryBySquareId) {
        logger.debug(
          `Found existing category by Square ID ${squareId}: "${categoryBySquareId.name}"`
        );
        return categoryBySquareId;
      }
    }

    // Second priority: Find by exact name match
    let category = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (category) {
      // Update with Square ID if provided and missing
      if (squareId && !category.squareId) {
        category = await prisma.category.update({
          where: { id: category.id },
          data: { squareId },
        });
        logger.debug(`Updated category "${name}" with Square ID: ${squareId}`);
      }
      return category;
    }

    // Third priority: Find by slug
    category = await prisma.category.findFirst({
      where: { slug },
    });

    if (category) {
      // Update with Square ID if provided and missing
      if (squareId && !category.squareId) {
        category = await prisma.category.update({
          where: { id: category.id },
          data: { squareId },
        });
        logger.debug(`Updated category "${category.name}" with Square ID: ${squareId}`);
      }
      return category;
    }

    // If we reach here, we need to create a new category
    logger.debug(`Category "${name}" not found, creating...`);

    // Use upsert to handle race conditions
    try {
      category = await prisma.category.upsert({
        where: { name },
        create: {
          name,
          description: `Category for ${name} products`,
          slug,
          squareId,
          order: 0,
          active: true,
        },
        update: {
          // Update Square ID if it was missing
          ...(squareId && { squareId }),
          active: true, // Ensure it's active
        },
      });

      if (category) {
        logger.debug(`Category "${name}" created/updated with ID: ${category.id}`);
        return category;
      }
    } catch (upsertError) {
      const error = upsertError as { code?: string; meta?: { target?: string[] } };

      if (error.code === 'P2002') {
        // Still getting unique constraint violation, try alternative approaches
        const field = error.meta?.target?.[0];
        logger.warn(`Unique constraint violation on ${field} for category "${name}"`);

        // Try to find by name one more time (might have been created between checks)
        const retryCategory = await prisma.category.findFirst({
          where: {
            OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }],
          },
        });

        if (retryCategory) {
          logger.debug(`Found category after retry: "${retryCategory.name}"`);
          return retryCategory;
        }

        // Last resort: create with timestamp-based unique identifiers
        const timestamp = Date.now();
        const uniqueName = `${name}`;
        const uniqueSlug = `${slug}-${timestamp}`;

        category = await prisma.category.create({
          data: {
            name: uniqueName,
            description: `Category for ${name} products`,
            slug: uniqueSlug,
            squareId,
            order: 0,
            active: true,
          },
        });

        logger.warn(`Created category with unique identifiers: "${uniqueName}" (${uniqueSlug})`);
        return category;
      }

      // For other errors, just rethrow
      throw upsertError;
    }

    // This should never be reached, but just in case
    throw new Error(`Failed to create category "${name}" - unexpected state`);
  } catch (error) {
    logger.error(`Error in getOrCreateCategoryByName for "${name}":`, error);
    throw error;
  }
}

// Helper function to ensure we have at least one CATERING category for testing
async function ensureTestCateringCategory(): Promise<void> {
  try {
    // Check if we already have a CATERING category
    const existingCateringCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: 'CATERING',
          mode: 'insensitive',
        },
      },
    });

    if (!existingCateringCategory) {
      logger.info('No CATERING category found, creating a test one...');
      // Create a test CATERING category
      const testCategory = await prisma.category.create({
        data: {
          name: 'CATERING-TEST',
          description: 'Test catering category for debugging',
          slug: 'catering-test',
          order: 1000, // High order number to place at the end
          active: true,
        },
      });
      logger.info(`Created test catering category with ID ${testCategory.id}`);
    } else {
      logger.info(`Found existing catering category: ${existingCateringCategory.name}`);
    }
  } catch (error) {
    logger.warn('Error creating test catering category:', error);
    // Don't throw, just log the error - this is a fallback function
  }
}

export async function syncSquareProducts(): Promise<SyncResult> {
  const errors: string[] = [];
  let syncedCount = 0;
  const debugInfo: any = {};
  const validSquareIds: string[] = [];

  try {
    logger.info('Starting Square product sync with enhanced rate limiting...');

    // Get the default category first with retry logic
    const defaultCategory = await withDatabaseRetry(async () => {
      return await getOrCreateDefaultCategory();
    });

    if (!defaultCategory) {
      throw new Error('Failed to get or create default category');
    }

    // Create test catering category for debugging with retry
    await withDatabaseRetry(async () => {
      return await ensureTestCateringCategory();
    });

    // Check available methods
    const clientProperties = Object.keys(squareClient);
    logger.info('Square client properties:', clientProperties);

    // Check if catalogApi exists
    if (!squareClient.catalogApi) {
      return {
        success: false,
        message: 'Square catalog API not available',
        syncedProducts: 0,
        errors: ['Square catalog API not available'],
        debugInfo: { clientProperties },
      };
    }

    // Log available catalog methods
    const catalogMethods = Object.keys(squareClient.catalogApi);
    logger.info('Catalog methods:', catalogMethods);
    debugInfo.catalogMethods = catalogMethods;

    // Try to list locations as a test with rate limiting
    try {
      if (
        squareClient.locationsApi &&
        typeof squareClient.locationsApi.listLocations === 'function'
      ) {
        await rateLimiter.throttle();
        const locationsResponse = await withSquareRetry(async () => {
          return await squareClient.locationsApi!.listLocations();
        });
        logger.info('Square locations response:', locationsResponse);
        debugInfo.locationsResponse = locationsResponse;
      } else {
        logger.debug('Square locations API not available - skipping location check');
        debugInfo.locationsNotAvailable = true;
      }
    } catch (locationError) {
      logger.error('Error fetching locations:', locationError);
      debugInfo.locationError =
        locationError instanceof Error ? locationError.message : 'Unknown error';
    }

    // Search catalog items using our direct implementation with rate limiting
    try {
      logger.info('Searching catalog items with enhanced rate limiting...');

      const requestBody = {
        object_types: ['ITEM', 'IMAGE', 'CATEGORY'],
        include_related_objects: true,
        include_deleted_objects: false,
      };

      // Use the direct catalog API to avoid client configuration conflicts
      const { searchCatalogObjects } = await import('./catalog-api');

      await rateLimiter.throttle();
      const catalogResponse = await withSquareRetry(async () => {
        return await searchCatalogObjects(requestBody);
      });

      if (!catalogResponse) {
        throw new Error('Square catalog API not available or returned no response');
      }

      logger.info('Catalog response keys:', Object.keys(catalogResponse));
      debugInfo.catalogResponseKeys = Object.keys(catalogResponse);

      // Extract the items and related objects from the response
      const items =
        catalogResponse.result?.objects?.filter(
          (obj: SquareCatalogObject) => obj.type === 'ITEM'
        ) || [];
      const relatedObjects = catalogResponse.result?.related_objects || [];

      // Extract categories
      const categories =
        catalogResponse.result?.objects?.filter(
          (obj: SquareCatalogObject) => obj.type === 'CATEGORY'
        ) || [];

      logger.info(
        `Found ${items.length} catalog items, ${categories.length} categories, and ${relatedObjects.length} related objects`
      );
      debugInfo.itemsFound = items.length;
      debugInfo.categoriesFound = categories.length;
      debugInfo.relatedObjectsFound = relatedObjects.length;

      // Detect duplicate category names and create remapping
      const duplicateCategories = detectDuplicateCategories(categories, items);
      const categoryRemapping = new Map<string, string>();
      
      if (duplicateCategories.length > 0) {
        logger.warn(
          `⚠️ Found ${duplicateCategories.length} duplicate category name(s) in Square catalog`
        );
        
        for (const duplicate of duplicateCategories) {
          logger.warn(`   📁 Duplicate category: "${duplicate.categoryName}"`);
          logger.warn(`      Winner: ${duplicate.winnerId} (${duplicate.categories[0].itemCount} items)`);
          
          // Log all duplicates for transparency
          for (let i = 1; i < duplicate.categories.length; i++) {
            const dup = duplicate.categories[i];
            logger.warn(`      Merging: ${dup.squareId} (${dup.itemCount} items) → ${duplicate.winnerId}`);
            categoryRemapping.set(dup.squareId, duplicate.winnerId);
          }
        }
        
        debugInfo.duplicateCategories = duplicateCategories.map(d => ({
          name: d.categoryName,
          winnerCount: d.categories[0].itemCount,
          duplicatesCount: d.duplicateIds.length,
        }));
      } else {
        logger.info('✓ No duplicate category names detected');
      }

      // Log all found category names for debugging
      if (categories.length > 0) {
        logger.info(
          `Square categories found: ${JSON.stringify(
            categories.map(
              (cat: SquareCatalogObject) => cat.category_data?.name || 'Unnamed Category'
            )
          )}`
        );

        // Specifically check for any CATERING categories
        const cateringCategories = categories
          .filter(
            (cat: SquareCatalogObject) =>
              cat.category_data?.name && isCateringCategory(cat.category_data.name)
          )
          .map((cat: SquareCatalogObject) => cat.category_data?.name);

        if (cateringCategories.length > 0) {
          logger.info(
            `Found ${cateringCategories.length} catering categories: ${JSON.stringify(cateringCategories)}`
          );
          logger.info(
            'Catering items will be synced to products table as part of main sync (unified approach)'
          );
        } else {
          logger.warn('No CATERING categories found in Square data!');
        }
      }

      // Create a map of category IDs to category objects for quick lookup
      const categoryMap = new Map<string, SquareCatalogObject>();
      categories.forEach((category: SquareCatalogObject) => {
        categoryMap.set(category.id, category);
      });

      if (items.length > 0) {
        logger.info('First item sample:', JSON.stringify(items[0]));
        debugInfo.firstItemSample = items[0];
      }

      // Collect all valid Square IDs for later cleanup
      validSquareIds.push(...items.map((item: SquareCatalogObject) => item.id));

      // Process items in batches with controlled concurrency
      const itemBatches = chunkArray(items, BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < itemBatches.length; batchIndex++) {
        const batch = itemBatches[batchIndex];
        logger.info(
          `Processing batch ${batchIndex + 1} of ${itemBatches.length} (${batch.length} items)`
        );

        // Process items with controlled concurrency and rate limiting
        const batchPromises = batch.map(async item => {
          const squareItem = item as SquareCatalogObject;
          if (squareItem.type !== 'ITEM' || !squareItem.item_data) {
            logger.warn(`Skipping invalid item: ${squareItem.id}`);
            return { success: false, reason: 'invalid_item' };
          }

          try {
            await rateLimiter.throttle(); // Rate limit each item processing
            await processSquareItem(squareItem, relatedObjects, categoryMap, defaultCategory, categoryRemapping);
            syncedCount++;
            logger.debug(`✅ Processed item: ${squareItem.item_data.name}`);
            return { success: true, itemName: squareItem.item_data.name };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const itemName = squareItem.item_data?.name || 'Unknown Item';

            // Enhanced error logging with context
            logger.error(`❌ Error processing item "${itemName}" (${squareItem.id}):`, {
              error: errorMessage,
              squareId: squareItem.id,
              itemName,
              categoryId: squareItem.item_data?.categories?.[0]?.id,
              hasNutrition: !!squareItem.item_data?.food_and_beverage_details,
            });

            // Check if it's a critical error or can be retried
            if (errorMessage.includes('P2002') && errorMessage.includes('category')) {
              logger.warn(`🔄 Category conflict for "${itemName}" - this may resolve on retry`);
            }

            errors.push(`${itemName}: ${errorMessage}`);
            return { success: false, reason: 'processing_error', error: errorMessage };
          }
        });

        // Process with limited concurrency
        const concurrentBatches = chunkArray(batchPromises, MAX_CONCURRENT_REQUESTS);
        for (const concurrentBatch of concurrentBatches) {
          const batchResults = await Promise.allSettled(concurrentBatch);

          // Log batch completion status
          const successes = batchResults.filter(
            result => result.status === 'fulfilled' && result.value?.success
          ).length;
          const failures = batchResults.length - successes;

          logger.debug(`Batch results: ${successes} succeeded, ${failures} failed`);

          // Small delay between concurrent groups
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Longer delay between batches to prevent rate limiting
        if (batchIndex < itemBatches.length - 1) {
          logger.debug(`Waiting ${RATE_LIMIT_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }

      // Optional: Log info about potentially orphaned products
      logger.info(`Sync complete. Found ${validSquareIds.length} valid Square products.`);

      // Optimized archive logic: Use bulk operations instead of individual queries
      try {
        logger.info('Starting optimized archive logic for products not in Square...');

        // Get all active Square IDs from our database
        const dbSquareIds = await prisma.product.findMany({
          where: {
            squareId: {
              not: '',
            },
            active: true,
          },
          select: {
            squareId: true,
          },
        });

        const dbSquareIdSet = new Set(dbSquareIds.map(p => p.squareId));

        // Find products that should be archived (not in Square anymore)
        const productsToArchive = await prisma.product.findMany({
          where: {
            squareId: {
              not: '',
              notIn: Array.from(dbSquareIdSet),
            },
            active: true,
            // Only archive products that were created more than 24 hours ago
            createdAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            name: true,
            squareId: true,
          },
        });

        if (productsToArchive.length > 0) {
          logger.info(`Found ${productsToArchive.length} products to archive`);

          // Bulk archive operation - much faster than individual updates
          const archiveResult = await prisma.product.updateMany({
            where: {
              id: {
                in: productsToArchive.map(p => p.id),
              },
            },
            data: {
              active: false,
              updatedAt: new Date(),
              syncStatus: 'ARCHIVED',
            },
          });

          logger.info(`Successfully archived ${archiveResult.count} products`);
        } else {
          logger.info('No products need to be archived');
        }

        // Handle custom/removed products without images (simplified logic)
        const customOrRemovedProducts = await prisma.product.findMany({
          where: {
            AND: [
              {
                squareId: {
                  not: { startsWith: 'reset-' },
                },
              },
              {
                squareId: {
                  notIn: Array.from(dbSquareIdSet),
                },
              },
              {
                images: { isEmpty: true },
                active: true,
                createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        if (customOrRemovedProducts.length > 0) {
          logger.info(
            `Found ${customOrRemovedProducts.length} custom/removed products without images`
          );

          // Log these products for awareness (future implementation can add backup logic)
          for (const product of customOrRemovedProducts) {
            logger.warn(`Custom/removed product without images: ${product.name} (${product.id})`);
          }
        } else {
          logger.info('No custom/removed products without images found');
        }

        logger.info(
          "Optimized archive logic completed. Skipping special image preservation for 'reset-' and custom products to ensure strict Square image sync."
        );
      } catch (manualError) {
        logger.error('Error in optimized archive logic:', manualError);
        // Don't fail the entire sync due to these issues
      }
    } catch (searchError) {
      logger.error('Error searching catalog items:', searchError);
      errors.push(searchError instanceof Error ? searchError.message : String(searchError));
    }

    // Generate comprehensive sync summary
    const syncSummary = {
      success: true,
      message: `Products synced successfully with nutrition facts support`,
      syncedProducts: syncedCount,
      totalItems: validSquareIds.length,
      successRate:
        validSquareIds.length > 0
          ? ((syncedCount / validSquareIds.length) * 100).toFixed(1) + '%'
          : '0%',
      errors: errors.length > 0 ? errors : undefined,
      debugInfo: debugInfo,
    };

    // Log final summary
    logger.info('📊 Sync Summary:', {
      synced: syncedCount,
      total: validSquareIds.length,
      errors: errors.length,
      successRate: syncSummary.successRate,
    });

    if (errors.length > 0) {
      logger.warn(`⚠️ ${errors.length} items failed to sync. Check the errors array for details.`);
      // Log first few errors for immediate visibility
      const firstErrors = errors.slice(0, 3);
      firstErrors.forEach((error, index) => {
        logger.warn(`  ${index + 1}. ${error}`);
      });
      if (errors.length > 3) {
        logger.warn(`  ... and ${errors.length - 3} more errors`);
      }
    }

    return syncSummary;
  } catch (error) {
    logger.error('Error syncing products:', error);
    return {
      success: false,
      message: 'An error occurred while syncing products',
      syncedProducts: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      debugInfo: debugInfo,
    };
  }
}

async function processSquareItem(
  item: SquareCatalogObject,
  relatedObjects: SquareCatalogObject[],
  categoryMap: Map<string, SquareCatalogObject>,
  defaultCategory: { id: string; name: string },
  categoryRemapping: Map<string, string> = new Map()
): Promise<void> {
  const itemData = item.item_data!;
  const itemName = itemData.name || '';

  logger.debug(`Processing item: ${itemName} (${item.id})`);

  // Get images efficiently with rate limiting
  const imageUrls = await withSquareRetry(async () => {
    return await getImageUrls(item, relatedObjects);
  });
  logger.debug(`Found ${imageUrls.length} image(s) for item ${itemName}`);

  const variations = itemData.variations || [];
  const { variants, basePrice } = processVariations(variations);

  // Use description_html (has formatting) instead of description (plain text)
  // Falls back to description if description_html is not available
  const rawDescription = itemData.description_html || itemData.description;

  // DEBUG: Log description fields for specific products
  const isDebugProduct =
    itemName.toLowerCase().includes('acorn') ||
    itemName.toLowerCase().includes('alfajor') ||
    itemName.toLowerCase().includes('empanada');

  if (isDebugProduct) {
    logger.info(`🔍 DEBUG Syncing: ${itemName}`, {
      hasDescriptionHtml: !!itemData.description_html,
      hasDescription: !!itemData.description,
      descriptionHtmlPreview: itemData.description_html?.substring(0, 100),
      descriptionPreview: itemData.description?.substring(0, 100),
      usingField: itemData.description_html ? 'description_html' : 'description',
    });
  }

  // Import sanitization utility
  const { sanitizeProductDescription } = await import('@/lib/utils/product-description');
  const sanitizedDescription = sanitizeProductDescription(rawDescription);

  // DEBUG: Log sanitization result
  if (isDebugProduct) {
    logger.info(`🔍 DEBUG After sanitization: ${itemName}`, {
      inputLength: rawDescription?.length || 0,
      outputLength: sanitizedDescription.length,
      hasHTMLBefore: /<[^>]+>/.test(rawDescription || ''),
      hasHTMLAfter: /<[^>]+>/.test(sanitizedDescription),
      sanitizedPreview: sanitizedDescription.substring(0, 100),
    });
  }

  // FIXED: Always update description, even if empty
  // This ensures formatting changes (like removing bold text) are properly synced
  const updateDescription = sanitizedDescription;
  const createDescription = sanitizedDescription;

  const baseSlug = createSlug(itemName);

  // Extract nutrition information from Square item
  const nutritionInfo = extractNutritionInfo(item);
  if (nutritionInfo.calories || nutritionInfo.dietaryPreferences || nutritionInfo.ingredients) {
    logger.debug(`Extracted nutrition info for ${itemName}:`, nutritionInfo);
  }

  // Determine category using Square category mapping (FIXED)
  let categoryId = defaultCategory.id;
  let categoryName = defaultCategory.name;

  let categoryIdFromItem = itemData.categories?.[0]?.id || itemData.category_id;

  // Apply category remapping for duplicate names
  if (categoryIdFromItem && categoryRemapping.has(categoryIdFromItem)) {
    const originalCategoryId = categoryIdFromItem;
    categoryIdFromItem = categoryRemapping.get(categoryIdFromItem)!;
    logger.debug(
      `Remapping category for item "${itemName}": ${originalCategoryId} → ${categoryIdFromItem} (duplicate category merge)`
    );
  }

  if (categoryIdFromItem) {
    // Use CategoryMapper instead of creating by name
    const { default: CategoryMapper } = await import('./category-mapper');

    // Try to get mapped category name
    const mappedCategoryName =
      CategoryMapper.getLegacyLocalCategory(categoryIdFromItem) ||
      CategoryMapper.getLocalCategory(categoryIdFromItem);

    if (mappedCategoryName) {
      // Find existing category by Square ID first, then by name
      let category = await prisma.category.findFirst({
        where: {
          OR: [{ squareId: categoryIdFromItem }, { name: mappedCategoryName }],
        },
      });

      if (!category) {
        // Use the enhanced getOrCreateCategoryByName function instead of direct create
        try {
          const categoryResult = await getOrCreateCategoryByName(
            mappedCategoryName,
            categoryIdFromItem
          );
          categoryId = categoryResult.id;
          logger.info(
            `Created/found category: ${mappedCategoryName} with Square ID: ${categoryIdFromItem}`
          );
        } catch (categoryError) {
          logger.error(`Failed to create category ${mappedCategoryName}:`, categoryError);
          // Fallback to default category
          categoryId = defaultCategory.id;
          categoryName = defaultCategory.name;
        }
      } else if (!category.squareId) {
        // Update existing category with Square ID
        try {
          await prisma.category.update({
            where: { id: category.id },
            data: { squareId: categoryIdFromItem },
          });
          logger.info(
            `Updated category ${mappedCategoryName} with Square ID: ${categoryIdFromItem}`
          );
        } catch (updateError) {
          logger.warn(
            `Could not update category ${mappedCategoryName} with Square ID:`,
            updateError
          );
        }
      }

      if (category) {
        categoryId = category.id;
      }
      categoryName = mappedCategoryName;
      logger.debug(
        `Assigned item "${itemName}" to category "${categoryName}" (${categoryId}) via CategoryMapper`
      );
    } else {
      // Fallback to original logic for unmapped categories
      const categoryObject = categoryMap.get(categoryIdFromItem);
      if (categoryObject?.category_data?.name) {
        categoryName = categoryObject.category_data.name;

        if (isCateringCategory(categoryName)) {
          logger.debug(`Found catering category: ${categoryName} for item ${itemName}`);
        }

        try {
          const category = await withDatabaseRetry(async () => {
            return await getOrCreateCategoryByName(categoryName, categoryIdFromItem);
          });
          categoryId = category.id;
          logger.debug(
            `Assigned item "${itemName}" to category "${categoryName}" (${categoryId}) via fallback`
          );
        } catch (categoryError) {
          logger.error(`Error getting/creating category for "${itemName}":`, categoryError);
          categoryId = defaultCategory.id;
        }
      }
    }
  }

  // Database operations with retry logic
  const existingProduct = await withDatabaseRetry(async () => {
    return await prisma.product.findUnique({
      where: { squareId: item.id },
      select: { id: true, slug: true, images: true, name: true },
    });
  });

  const finalImages = await determineProductImages(
    item,
    relatedObjects,
    existingProduct || undefined
  );

  let ordinal: bigint | null = null;
  if (itemData.categories?.length && itemData.categories[0].ordinal !== undefined) {
    ordinal = BigInt(itemData.categories[0].ordinal);
  }

  // Determine if product should be active based on Square settings
  const visibility = itemData.visibility || 'PUBLIC';
  const availableOnline = itemData.available_online ?? true;
  const presentAtAllLocations = itemData.present_at_all_locations ?? true;
  const isNotDeleted = !item.is_deleted;

  // Product should be active if it's not deleted, available online, and present at locations
  const shouldBeActive =
    isNotDeleted && availableOnline && presentAtAllLocations && visibility !== 'PRIVATE';

  // Log visibility status for debugging
  if (!shouldBeActive) {
    const reasons = [];
    if (item.is_deleted) reasons.push('deleted in Square');
    if (!availableOnline) reasons.push('not available online');
    if (!presentAtAllLocations) reasons.push('not present at all locations');
    if (visibility === 'PRIVATE') reasons.push('visibility set to private');
    logger.info(`🔒 Setting product "${itemName}" as inactive: ${reasons.join(', ')}`);
  }

  if (existingProduct) {
    logger.debug(`Updating existing product: ${itemName} (${item.id})`);
    await withDatabaseRetry(async () => {
      return await prisma.product.update({
        where: { squareId: item.id },
        data: {
          name: itemName,
          description: updateDescription,
          price: basePrice,
          images: finalImages,
          ordinal: ordinal,
          variants: {
            deleteMany: {},
            create: variants,
          },
          categoryId: categoryId,
          active: shouldBeActive, // IMPROVED: Check Square ecommerce visibility settings
          updatedAt: new Date(),
          // Add nutrition information
          calories: nutritionInfo.calories,
          dietaryPreferences: nutritionInfo.dietaryPreferences || [],
          ingredients: nutritionInfo.ingredients,
          allergens: nutritionInfo.allergens || [],
          nutritionFacts: nutritionInfo.nutritionFacts,
        },
      });
    });
    logger.debug(`Successfully updated product ${itemName}`);
  } else {
    const existingSlug = await withDatabaseRetry(async () => {
      return await prisma.product.findUnique({
        where: { slug: baseSlug },
        select: { id: true },
      });
    });
    const uniqueSlug = existingSlug
      ? `${baseSlug}-${item.id.toLowerCase().substring(0, 8)}`
      : baseSlug;

    try {
      logger.debug(`Creating new product: ${itemName} (${item.id})`);
      await withDatabaseRetry(async () => {
        return await prisma.product.create({
          data: {
            squareId: item.id,
            name: itemName,
            slug: uniqueSlug,
            description: createDescription,
            price: basePrice,
            images: finalImages,
            ordinal: ordinal,
            categoryId: categoryId,
            featured: false,
            active: shouldBeActive, // IMPROVED: Check Square ecommerce visibility settings
            variants: {
              create: variants,
            },
            // Add nutrition information
            calories: nutritionInfo.calories,
            dietaryPreferences: nutritionInfo.dietaryPreferences || [],
            ingredients: nutritionInfo.ingredients,
            allergens: nutritionInfo.allergens || [],
            nutritionFacts: nutritionInfo.nutritionFacts,
          },
        });
      });
      logger.debug(`Successfully created product ${itemName}`);
    } catch (error) {
      const createError = error as { code?: string; meta?: { target?: string[] } };
      if (createError.code === 'P2002') {
        await handleUniqueConstraintViolation(
          createError,
          item,
          variants,
          finalImages,
          ordinal,
          categoryId,
          baseSlug
        );
      } else {
        throw createError;
      }
    }
  }
}

async function handleUniqueConstraintViolation(
  createError: { code?: string; meta?: { target?: string[] } },
  item: SquareCatalogObject,
  variants: VariantCreate[],
  finalImages: string[],
  ordinal: bigint | null,
  categoryId: string,
  baseSlug: string
): Promise<void> {
  const itemName = item.item_data?.name || '';

  // Calculate shouldBeActive within this function
  const itemData = item.item_data;
  const visibility = itemData?.visibility || 'PUBLIC';
  const availableOnline = itemData?.available_online ?? true;
  const presentAtAllLocations = itemData?.present_at_all_locations ?? true;
  const isNotDeleted = !item.is_deleted;
  const shouldBeActive =
    isNotDeleted && availableOnline && presentAtAllLocations && visibility !== 'PRIVATE';
  const constraintField = createError.meta?.target?.[0];
  logger.warn(`Constraint violation on ${constraintField} for item ${itemName}`);

  if (constraintField === 'squareVariantId' && variants.length > 0) {
    const conflictingVariantId = variants[0].squareVariantId;
    if (conflictingVariantId) {
      const existingVariant = await prisma.variant.findUnique({
        where: { squareVariantId: conflictingVariantId },
        include: { product: true },
      });

      if (existingVariant?.product) {
        logger.info(
          `Found existing product via variant: ${existingVariant.product.id}, updating it.`
        );

        // Process description consistently with main sync path
        const rawDescription = item.item_data?.description_html || item.item_data?.description;
        const { sanitizeProductDescription } = await import('@/lib/utils/product-description');
        const sanitizedDescription = sanitizeProductDescription(rawDescription);

        const nutritionInfo = extractNutritionInfo(item);
        await prisma.product.update({
          where: { id: existingVariant.product.id },
          data: {
            squareId: item.id,
            name: itemName,
            description: sanitizedDescription,
            price: processVariations(item.item_data?.variations || []).basePrice,
            images: finalImages,
            ordinal: ordinal,
            categoryId: categoryId,
            active: shouldBeActive, // IMPROVED: Check Square ecommerce visibility settings
            variants: {
              deleteMany: {},
              create: variants,
            },
            updatedAt: new Date(),
            // Add nutrition information
            calories: nutritionInfo.calories,
            dietaryPreferences: nutritionInfo.dietaryPreferences || [],
            ingredients: nutritionInfo.ingredients,
            allergens: nutritionInfo.allergens || [],
            nutritionFacts: nutritionInfo.nutritionFacts,
          },
        });
        logger.debug(`Updated existing product (through variant) ${itemName}`);
      }
    }
  } else {
    const timestampSlug = `${baseSlug}-${Date.now()}`;
    logger.info(`Retrying creation with unique slug: ${timestampSlug}`);

    // Process description consistently with main sync path
    const rawDescription = item.item_data?.description_html || item.item_data?.description;
    const { sanitizeProductDescription } = await import('@/lib/utils/product-description');
    const sanitizedDescription = sanitizeProductDescription(rawDescription);

    const nutritionInfo = extractNutritionInfo(item);
    await prisma.product.create({
      data: {
        squareId: item.id,
        name: itemName,
        slug: timestampSlug,
        description: sanitizedDescription,
        price: processVariations(item.item_data?.variations || []).basePrice,
        images: finalImages,
        ordinal: ordinal,
        categoryId: categoryId,
        featured: false,
        active: shouldBeActive, // IMPROVED: Check Square ecommerce visibility settings
        variants: {
          create: variants,
        },
        // Add nutrition information
        calories: nutritionInfo.calories,
        dietaryPreferences: nutritionInfo.dietaryPreferences || [],
        ingredients: nutritionInfo.ingredients,
        allergens: nutritionInfo.allergens || [],
        nutritionFacts: nutritionInfo.nutritionFacts,
      },
    });
    logger.debug(`Successfully created product with timestamp slug ${itemName}`);
  }
}

// Helper function to process variations and get base price
function processVariations(variations: SquareCatalogObject[]): {
  variants: VariantCreate[];
  basePrice: Decimal;
} {
  if (!variations || variations.length === 0) {
    logger.debug('No variations found for item');
    return {
      variants: [],
      basePrice: new Decimal(0),
    };
  }

  // Use the price of the first valid variation as the base price for the product
  const firstValidVariation = variations.find(isValidVariation);
  const firstVariationData = firstValidVariation?.item_variation_data;
  const basePriceAmount = firstVariationData?.price_money?.amount;

  // Convert amount (cents) to Decimal dollars
  const basePrice = basePriceAmount
    ? new Decimal(Number(basePriceAmount)).div(100)
    : new Decimal(0);

  logger.debug(`Base price determined from first variation: ${basePrice}`);

  const processedVariants = variations
    .map((variation): VariantCreate | null => {
      // Ensure it's a valid variation with necessary data
      if (!isValidVariation(variation)) {
        logger.debug(`Skipping invalid variation object: ${variation.id}`);
        return null;
      }

      const variationData = variation.item_variation_data;
      const variationAmount = variationData.price_money?.amount;

      // Convert amount (cents) to Decimal dollars for the variant price
      // If a variant amount is missing, it might default to basePrice or be null depending on requirements
      const price = variationAmount ? new Decimal(Number(variationAmount)).div(100) : null; // Or set to basePrice if variants *must* have a price

      logger.debug(
        `Processing variant: ${variationData.name || 'Unnamed'} (${variation.id}), Price: ${price}`
      );

      return {
        name: variationData.name || 'Regular', // Default name if missing
        price: price, // Use the calculated Decimal price (or null)
        squareVariantId: variation.id,
      };
    })
    .filter((v): v is VariantCreate => v !== null); // Filter out any nulls from invalid variations

  return { variants: processedVariants, basePrice };
}

// Type guard for CatalogItemVariation to ensure necessary fields exist
function isValidVariation(
  variation: SquareCatalogObject | undefined
): variation is SquareCatalogObject & {
  item_variation_data: NonNullable<
    SquareCatalogObject['item_variation_data'] & { price_money?: { amount: bigint | number } }
  >;
} {
  return (
    !!variation &&
    variation.type === 'ITEM_VARIATION' &&
    !!variation.id &&
    !!variation.item_variation_data
  );
  // Optionally check for price_money existence: && !!variation.item_variation_data.price_money
}

// Helper function to create a URL-friendly slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim();
}

// Helper function to extract nutrition information from Square item
function extractNutritionInfo(item: SquareCatalogObject): {
  calories?: number;
  dietaryPreferences?: string[];
  ingredients?: string;
  allergens?: string[];
  nutritionFacts?: any;
} {
  const nutritionInfo: {
    calories?: number;
    dietaryPreferences?: string[];
    ingredients?: string;
    allergens?: string[];
    nutritionFacts?: any;
  } = {};

  const foodAndBeverageDetails = item.item_data?.food_and_beverage_details;

  if (foodAndBeverageDetails) {
    logger.debug(`Found nutrition info for item ${item.item_data?.name}:`, foodAndBeverageDetails);

    // Extract calories
    if (foodAndBeverageDetails.calorie_count !== undefined) {
      nutritionInfo.calories = foodAndBeverageDetails.calorie_count;
    }

    // Extract dietary preferences
    if (
      foodAndBeverageDetails.dietary_preferences &&
      foodAndBeverageDetails.dietary_preferences.length > 0
    ) {
      nutritionInfo.dietaryPreferences = foodAndBeverageDetails.dietary_preferences;
    }

    // Extract ingredients
    if (foodAndBeverageDetails.ingredients) {
      nutritionInfo.ingredients = foodAndBeverageDetails.ingredients;

      // Extract allergens from ingredients text if present
      // Common allergen keywords to look for
      const commonAllergens = [
        'dairy',
        'milk',
        'eggs',
        'wheat',
        'gluten',
        'soy',
        'nuts',
        'peanuts',
        'tree nuts',
        'almonds',
        'walnuts',
        'cashews',
        'pistachios',
        'hazelnuts',
        'shellfish',
        'fish',
        'sesame',
        'sulfites',
      ];

      const foundAllergens = commonAllergens.filter(allergen =>
        foodAndBeverageDetails.ingredients!.toLowerCase().includes(allergen.toLowerCase())
      );

      if (foundAllergens.length > 0) {
        nutritionInfo.allergens = foundAllergens;
      }
    }

    // Store complete nutrition facts as JSON for future extensibility
    nutritionInfo.nutritionFacts = foodAndBeverageDetails;
  }

  return nutritionInfo;
}

// getImageUrls needs to be robust. It should return [] if no images are found or if errors occur during fetching individual images.
// The addCacheBustingParam should only convert sandbox to production and not add '?t=' to S3 URLs.

async function getImageUrls(
  item: SquareCatalogObject,
  relatedObjects: SquareCatalogObject[]
): Promise<string[]> {
  const imageUrls: string[] = [];
  const imageIds = item.item_data?.image_ids || [];

  if (imageIds.length === 0) {
    return []; // Strict: no IDs, no images
  }

  // Process images in batches to avoid overwhelming the API
  const imageBatches = chunkArray(imageIds, IMAGE_BATCH_SIZE);

  for (const batch of imageBatches) {
    const batchPromises = batch.map(async imageId => {
      try {
        let imageUrl: string | undefined;

        // First try to find in related objects
        const imageObjectFromRelated = relatedObjects.find(
          (obj: SquareCatalogObject) => obj.id === imageId && obj.type === 'IMAGE'
        );

        if (imageObjectFromRelated?.image_data?.url) {
          imageUrl = imageObjectFromRelated.image_data.url;
          logger.debug(`Found image URL in related objects for ${imageId}`);
        } else if (squareClient.catalogApi) {
          // Fallback to API retrieval with rate limiting
          try {
            await rateLimiter.throttle();
            const imageResponse = await withSquareRetry(async () => {
              return await squareClient.catalogApi!.retrieveCatalogObject(imageId);
            });
            const imageData = imageResponse?.result?.object as any;

            if (imageData?.image_data?.url) {
              imageUrl = imageData.image_data.url;
              logger.debug(`Retrieved image URL from API for ${imageId}`);
            }
          } catch (imageApiError) {
            logger.debug(`Error retrieving image ${imageId} from API:`, imageApiError);
          }
        }

        if (imageUrl) {
          return await processImageUrl(imageUrl, imageId);
        }

        return null;
      } catch (imageError) {
        logger.debug(`Error processing image ${imageId}:`, imageError);
        return null;
      }
    });

    // Process images with limited concurrency
    const concurrentImageBatches = chunkArray(batchPromises, MAX_CONCURRENT_REQUESTS);
    for (const concurrentBatch of concurrentImageBatches) {
      const batchResults = await Promise.allSettled(concurrentBatch);
      const validUrls = batchResults
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      imageUrls.push(...validUrls);

      // Small delay between concurrent image batches
      if (concurrentImageBatches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  logger.debug(`Final image URLs for item ${item.id}: ${imageUrls.length} images`);
  return imageUrls; // Returns only successfully verified URLs
}

async function processImageUrl(imageUrl: string, imageId: string): Promise<string | null> {
  try {
    const filePathMatch = imageUrl.match(/\/files\/([^\/]+)\/([^\/\?]+)/);

    if (filePathMatch && filePathMatch.length >= 3) {
      const fileId = filePathMatch[1];
      const fileName = filePathMatch[2];

      // Try sandbox URL first (usually more reliable)
      const sandboxUrl = `https://items-images-sandbox.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`;

      if (await testImageUrl(sandboxUrl)) {
        logger.debug(`Sandbox URL works for image ${imageId}: ${sandboxUrl}`);
        return sandboxUrl;
      }

      // Try production URL
      const productionUrl = `https://items-images-production.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`;

      if (await testImageUrl(productionUrl)) {
        logger.debug(`Production URL works for image ${imageId}: ${productionUrl}`);
        return productionUrl;
      }

      logger.debug(`No working URL found for image ${imageId}`);
      return null;
    } else {
      // Non-S3 URL pattern
      return imageUrl;
    }
  } catch (processingError) {
    logger.debug(`Error processing image URL ${imageUrl} for ${imageId}:`, processingError);
    return null;
  }
}

async function testImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return response.ok;
  } catch {
    return false;
  }
}

function processSquareImageUrl(url: string): string {
  if (!url) {
    return '';
  }

  try {
    // Parse the URL to work with it more reliably
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Process URLs from different sources differently

    // 1. Square Marketplace URLs (usually public and accessible)
    if (hostname.includes('square-marketplace')) {
      // These URLs are publicly accessible, return as is
      return url;
    }

    // 2. Square CDN URLs (may need a proxy)
    if (hostname.includes('squarecdn.com')) {
      // Square CDN URLs are usually accessible directly
      return url;
    }

    // 3. Square S3 bucket URLs (need proxy)
    if (
      hostname.includes('items-images-') ||
      hostname.includes('square-catalog-') ||
      hostname.includes('s3.amazonaws.com')
    ) {
      // Extract file path components to get consistent proxying
      const filePathMatch = url.match(/\/files\/([^\/]+)\/([^\/\?]+)/);
      if (filePathMatch && filePathMatch.length >= 3) {
        const fileId = filePathMatch[1];
        const fileName = filePathMatch[2];

        // Use the file ID and name to create a normalized URL for proxying
        // This ensures we have a consistent URL format for the proxy
        const normalizedUrl = `https://square-catalog-production.s3.amazonaws.com/files/${fileId}/${fileName}`;

        // Encode for proxy
        const encodedUrl = Buffer.from(normalizedUrl).toString('base64');
        return `/api/proxy/image?url=${encodedUrl}`;
      }

      // If we can't extract the file path, use the original URL with proxy
      const encodedUrl = Buffer.from(url).toString('base64');
      return `/api/proxy/image?url=${encodedUrl}`;
    }

    // 4. Any other URL: just use it directly
    return url;
  } catch (error) {
    logger.error(`Error processing Square image URL: ${error}`);

    // If URL parsing fails, fall back to simple string matching
    if (url.includes('square-marketplace')) {
      return url;
    }

    if (
      url.includes('items-images-') ||
      url.includes('square-catalog-') ||
      url.includes('s3.amazonaws.com')
    ) {
      const encodedUrl = Buffer.from(url).toString('base64');
      return `/api/proxy/image?url=${encodedUrl}`;
    }

    // Last resort: return the original URL
    return url;
  }
}

// The old function is now renamed and should not be used directly
function addCacheBustingParam(url: string): string {
  // Only convert sandbox to production. Do not add any cache busters to S3 URLs.
  if (url.includes('items-images-sandbox.s3')) {
    return url.replace('items-images-sandbox.s3', 'items-images-production.s3');
  }
  // If it's already a production S3 URL or any other type of URL, return as is.
  return url;
}

/**
 * Normalize a name for comparison (remove spaces, hyphens, make lowercase, sort words)
 * This helps match items like "Alfajores - Classic" with "classic alfajores"
 */
function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-\s]+/g, ' ') // Replace hyphens and multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove all non-word characters except spaces
    .split(' ')
    .filter(word => word.length > 0) // Remove empty strings
    .sort() // Sort words alphabetically to handle order differences
    .join('');
}

/**
 * Find matching catering items by name with fuzzy matching
 */
function findMatchingCateringItems(cateringItems: any[], productName: string): any[] {
  const normalizedProductName = normalizeNameForMatching(productName);

  return cateringItems.filter(item => {
    const normalizedItemName = normalizeNameForMatching(item.name);
    return normalizedItemName === normalizedProductName;
  });
}

/**
 * Legacy function - No longer used in unified products-only approach
 * All catering items are now synced as products during the main sync process
 * @deprecated Use unified sync approach instead
 */
export async function syncCateringItemsWithSquare(
  allProducts?: SquareCatalogObject[],
  allCategories?: SquareCatalogObject[]
): Promise<{ updated: number; skipped: number; errors: number; imagesUpdated: number }> {
  logger.info(
    '🚫 syncCateringItemsWithSquare is deprecated - using unified products-only approach'
  );
  return { updated: 0, skipped: 0, errors: 0, imagesUpdated: 0 };
}

// Helper function to fetch related objects when not provided
async function fetchRelatedObjects(): Promise<SquareCatalogObject[]> {
  try {
    const catalogClient = getCatalogClient();
    const catalogApi = catalogClient?.catalogApi;
    if (!catalogApi) {
      return [];
    }

    const searchResponse = await catalogApi.searchCatalogObjects({
      object_types: ['IMAGE'],
    });

    return searchResponse.result?.related_objects || [];
  } catch (error) {
    logger.warn('Could not fetch related objects for image processing:', error);
    return [];
  }
}

// Helper function to determine the best images for a product
async function determineProductImages(
  item: SquareCatalogObject,
  relatedObjects: SquareCatalogObject[],
  existingProduct?: { id: string; images: string[]; name: string }
): Promise<string[]> {
  const itemName = item.item_data?.name || '';

  // Get images from Square
  const imageUrlsFromSquare = await getImageUrls(item, relatedObjects);
  logger.debug(`Square provided ${imageUrlsFromSquare.length} image(s) for ${itemName}`);

  // If this is a new product, use Square images
  if (!existingProduct) {
    logger.debug(`New product ${itemName}: using ${imageUrlsFromSquare.length} images from Square`);
    return imageUrlsFromSquare;
  }

  // For existing products, implement smart image management
  const existingImages = existingProduct.images || [];

  // Check if existing images are manually assigned (not from Square)
  const hasManualImages = existingImages.some(
    img =>
      img.startsWith('/images/') || // Local images
      img.includes('items-images-production.s3.us-west-2.amazonaws.com') || // Our manually assigned S3 images
      !img.includes('square-') // Non-Square URLs
  );

  // If we have manual images and Square doesn't provide better ones, keep manual images
  if (hasManualImages && imageUrlsFromSquare.length === 0) {
    logger.debug(
      `Product ${itemName}: preserving ${existingImages.length} manually assigned images (Square has none)`
    );
    return existingImages;
  }

  // If we have manual images and Square provides images, prefer manual unless they're clearly better
  if (hasManualImages && imageUrlsFromSquare.length > 0) {
    // Check if any existing images are for specific variants (like different alfajores types)
    const hasVariantSpecificImages = existingImages.some(
      img =>
        (itemName.toLowerCase().includes('alfajor') && img.includes('alfajor')) ||
        (itemName.toLowerCase().includes('platter') && img.includes('platter')) ||
        (itemName.toLowerCase().includes('classic') && img.includes('classic')) ||
        (itemName.toLowerCase().includes('chocolate') && img.includes('chocolate')) ||
        (itemName.toLowerCase().includes('lemon') && img.includes('lemon')) ||
        (itemName.toLowerCase().includes('gluten') && img.includes('gluten'))
    );

    if (hasVariantSpecificImages) {
      logger.debug(
        `Product ${itemName}: preserving variant-specific manually assigned images over Square images`
      );
      return existingImages;
    }

    // If Square images are significantly better (more images), use those
    if (imageUrlsFromSquare.length > existingImages.length) {
      logger.debug(
        `Product ${itemName}: using ${imageUrlsFromSquare.length} Square images (better than ${existingImages.length} existing)`
      );
      return imageUrlsFromSquare;
    }

    // Otherwise, keep existing manual images
    logger.debug(
      `Product ${itemName}: preserving ${existingImages.length} manually assigned images`
    );
    return existingImages;
  }

  // If no manual images, use Square images (even if empty)
  logger.debug(`Product ${itemName}: using ${imageUrlsFromSquare.length} images from Square`);
  return imageUrlsFromSquare;
}

/**
 * Función especial para sincronizar el ordenamiento de productos usando el MCP de Square
 * Esta función actualiza el campo ordinal de los productos existentes basado en el ordenamiento de Square
 */
export async function syncProductOrderingFromSquare(): Promise<{
  updated: number;
  skipped: number;
  errors: number;
}> {
  const results = { updated: 0, skipped: 0, errors: 0 };

  try {
    logger.info('Starting product ordering synchronization from Square...');

    const dbProducts = await prisma.product.findMany({
      where: {
        squareId: {
          not: '',
        },
      },
      select: {
        id: true,
        squareId: true,
        name: true,
        ordinal: true,
      },
    });

    logger.info(`Found ${dbProducts.length} products with Square IDs in database`);

    if (!squareClient.catalogApi) {
      throw new Error('Square catalog API not available');
    }

    const squareResponse = await squareClient.catalogApi.searchCatalogObjects({
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false,
    } as any);

    const squareItems = squareResponse.result?.objects || [];
    logger.info(`Found ${squareItems.length} items in Square catalog`);

    const squareOrdinalsMap = new Map<string, bigint>();

    for (const item of squareItems) {
      if (
        item.type === 'ITEM' &&
        (item.item_data as any)?.categories &&
        (item.item_data as any).categories.length > 0
      ) {
        const ordinal = (item.item_data as any).categories[0].ordinal;
        if (ordinal !== undefined) {
          squareOrdinalsMap.set(item.id, BigInt(ordinal));
        }
      }
    }

    logger.info(`Created ordinal mapping for ${squareOrdinalsMap.size} Square items`);

    // Optimize: Use bulk operations instead of individual updates
    const productsToUpdate: Array<{ id: string; ordinal: bigint }> = [];

    for (const product of dbProducts) {
      if (!product.squareId) {
        results.skipped++;
        continue;
      }

      const squareOrdinal = squareOrdinalsMap.get(product.squareId);

      if (squareOrdinal === undefined) {
        logger.debug(
          `No ordinal found in Square for product ${product.name} (${product.squareId})`
        );
        results.skipped++;
        continue;
      }

      if (product.ordinal !== squareOrdinal) {
        productsToUpdate.push({
          id: product.id,
          ordinal: squareOrdinal,
        });
      } else {
        results.skipped++;
      }
    }

    // Perform bulk update if there are products to update
    if (productsToUpdate.length > 0) {
      logger.info(`Performing bulk update for ${productsToUpdate.length} products...`);

      // Use transaction for bulk update to ensure consistency
      await prisma.$transaction(async tx => {
        for (const productUpdate of productsToUpdate) {
          await tx.product.update({
            where: { id: productUpdate.id },
            data: {
              ordinal: productUpdate.ordinal,
              updatedAt: new Date(),
            },
          });
        }
      });

      results.updated = productsToUpdate.length;
      logger.info(`Successfully updated ordinals for ${productsToUpdate.length} products`);
    } else {
      logger.info('No products need ordinal updates');
    }
  } catch (error) {
    logger.error('Error in syncProductOrderingFromSquare:', error);
    results.errors++;
  }

  return results;
}

// Export function with expected name for tests
export async function syncProductsFromSquare(): Promise<SyncResult> {
  return await syncSquareProducts();
}

// Utility function to chunk arrays for batch processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
