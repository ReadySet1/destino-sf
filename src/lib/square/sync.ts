// src/lib/square/sync.ts

import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
// import { createSanityProduct } from '@/lib/sanity/createProduct'; // Removed Sanity import
import { Decimal } from '@prisma/client/runtime/library';
import { squareClient, getCatalogClient } from './client';
import { CateringItemCategory } from '@prisma/client';
import type { SquareClient, SquareCatalogApi } from '@/types/square';

// Import types from Prisma
import type { Prisma } from '@prisma/client';

// Define Square types to match the snake_case from the API
interface SquareCatalogObject {
  type: string;
  id: string;
  item_data?: {
    name: string;
    description?: string | null;
    category_id?: string; // Legacy field, kept for backward compatibility
    categories?: Array<{
      id: string;
      ordinal?: number;
    }>;
    variations?: SquareCatalogObject[];
    image_ids?: string[];
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

// Define a helper type for variant creation
type VariantCreate = Prisma.VariantCreateWithoutProductInput;

// Batch processing constants
const BATCH_SIZE = 10;
const IMAGE_BATCH_SIZE = 5;

async function getOrCreateDefaultCategory() {
  try {
    // Try to get the default category from the database
    const defaultCategory = await prisma.category.findFirst({
      where: { name: 'Default' }
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
        isActive: true, // Assuming new categories should be active
        // Remove metadata if not defined in your Prisma schema
        // metadata: {
        //   createdAt: new Date().toISOString(),
        //   updatedAt: new Date().toISOString(),
        // }
      }
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
  const isCatering = normalizedName === 'CATERING' || 
         normalizedName.startsWith('CATERING-') || 
         normalizedName.startsWith('CATERING- ');
         
  if (isCatering) {
    logger.info(`✓ DETECTED AS CATERING CATEGORY: "${name}"`);
  }
  
  return isCatering;
}

// New function to get or create a category by name
async function getOrCreateCategoryByName(name: string): Promise<{ id: string, name: string }> {
  try {
    // Generate the slug first
    const slug = createSlug(name);
    logger.info(`Looking for category "${name}" with slug "${slug}"`);
    
    // Try to find the category by slug first (more reliable than name)
    let category = await prisma.category.findFirst({
      where: { slug }
    });
    
    if (category) {
      logger.info(`Found existing category by slug: "${name}" → "${category.name}" with ID: ${category.id}`);
      return category;
    }
    
    // If not found by slug, try by name (case insensitive)
    category = await prisma.category.findFirst({
      where: { 
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });
    
    if (category) {
      logger.info(`Found existing category by name (case insensitive): "${name}" with ID: ${category.id}`);
      return category;
    }
    
    // If we reach here, we need to create a new category
    logger.info(`Category "${name}" (slug: "${slug}") not found, creating...`);
    
    try {
      // Try to create it
      category = await prisma.category.create({
        data: {
          name,
          description: `Category for ${name} products`,
          slug,
          order: 0, // Default order
          isActive: true
        }
      });
      
      logger.info(`Created new category "${name}" with ID: ${category.id}`);
      return category;
    } catch (createError) {
      // Handle unique constraint violation
      const error = createError as { code?: string; meta?: { target?: string[] } };
      
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'unknown field';
        logger.warn(`Unique constraint violation on ${field} when creating category "${name}". Another process may have created it simultaneously.`);
        
        // Try to fetch the category one more time by slug
        const existingCategory = await prisma.category.findFirst({
          where: { slug }
        });
        
        if (existingCategory) {
          logger.info(`Found category after conflict "${name}" → "${existingCategory.name}" with ID: ${existingCategory.id}`);
          return existingCategory;
        }
        
        // If we still can't find it, create a unique slug by adding a timestamp
        const timestampSlug = `${slug}-${Date.now()}`;
        logger.info(`Creating category with unique timestamp slug: ${timestampSlug}`);
        
        category = await prisma.category.create({
          data: {
            name,
            description: `Category for ${name} products`,
            slug: timestampSlug,
            order: 0,
            isActive: true
          }
        });
        
        logger.info(`Created new category with timestamp slug: "${name}" with ID: ${category.id}`);
        return category;
      }
      
      // For other errors, just rethrow
      logger.error(`Error creating category "${name}":`, createError);
      throw createError;
    }
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
          mode: 'insensitive'
        }
      }
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
          isActive: true
        }
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
    logger.info('Starting Square product sync...');
    
    // Get the default category first
    const defaultCategory = await getOrCreateDefaultCategory();
    if (!defaultCategory) {
      throw new Error('Failed to get or create default category');
    }

    // Create test catering category for debugging
    await ensureTestCateringCategory();

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
        debugInfo: { clientProperties }
      };
    }
    
    // Log available catalog methods
    const catalogMethods = Object.keys(squareClient.catalogApi);
    logger.info('Catalog methods:', catalogMethods);
    debugInfo.catalogMethods = catalogMethods;
    
    // Try to list locations as a test
    try {
      if (squareClient.locationsApi && typeof squareClient.locationsApi.listLocations === 'function') {
        const locationsResponse = await squareClient.locationsApi.listLocations();
        logger.info('Square locations response:', locationsResponse);
        debugInfo.locationsResponse = locationsResponse;
      } else {
        logger.warn('Square locations API not available or listLocations method not found');
        debugInfo.locationsNotAvailable = true;
      }
    } catch (locationError) {
      logger.error('Error fetching locations:', locationError);
      debugInfo.locationError = locationError instanceof Error ? locationError.message : 'Unknown error';
    }

    // Search catalog items using our direct implementation
    try {
      logger.info('Searching catalog items with batched approach...');
      
      const requestBody = {
        object_types: ['ITEM', 'IMAGE', 'CATEGORY'],
        include_related_objects: true,
        include_deleted_objects: false
      };
      
      // Use the direct catalog API to avoid client configuration conflicts
      const { searchCatalogObjects } = await import('./catalog-api');
      const catalogResponse = await searchCatalogObjects(requestBody);
      
      if (!catalogResponse) {
        throw new Error('Square catalog API not available or returned no response');
      }
      
      logger.info('Catalog response keys:', Object.keys(catalogResponse));
      debugInfo.catalogResponseKeys = Object.keys(catalogResponse);
      
      // Extract the items and related objects from the response
      const items = catalogResponse.result?.objects?.filter((obj: SquareCatalogObject) => obj.type === 'ITEM') || [];
      const relatedObjects = catalogResponse.result?.related_objects || [];
      
      // Extract categories
      const categories = catalogResponse.result?.objects?.filter((obj: SquareCatalogObject) => obj.type === 'CATEGORY') || [];
      
      logger.info(`Found ${items.length} catalog items, ${categories.length} categories, and ${relatedObjects.length} related objects`);
      debugInfo.itemsFound = items.length;
      debugInfo.categoriesFound = categories.length;
      debugInfo.relatedObjectsFound = relatedObjects.length;
      
      // Log all found category names for debugging
      if (categories.length > 0) {
        logger.info(`Square categories found: ${JSON.stringify(categories.map((cat: SquareCatalogObject) => 
          cat.category_data?.name || 'Unnamed Category'
        ))}`);
        
        // Specifically check for any CATERING categories
        const cateringCategories = categories
          .filter((cat: SquareCatalogObject) => cat.category_data?.name && isCateringCategory(cat.category_data.name))
          .map((cat: SquareCatalogObject) => cat.category_data?.name);
        
        if (cateringCategories.length > 0) {
          logger.info(`Found ${cateringCategories.length} catering categories: ${JSON.stringify(cateringCategories)}`);
          
          // Also synchronize catering items with Square
          try {
            logger.info('Starting catering items synchronization with Square...');
            const cateringResult = await syncCateringItemsWithSquare(items, categories);
            logger.info(`Catering items sync results: ${JSON.stringify(cateringResult)}`);
          } catch (cateringError) {
            logger.error('Error synchronizing catering items:', cateringError);
            errors.push(`Catering items sync error: ${cateringError instanceof Error ? cateringError.message : 'Unknown error'}`);
          }
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
      
      // Process items in batches for better performance
      const itemBatches = chunkArray(items, BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < itemBatches.length; batchIndex++) {
        const batch = itemBatches[batchIndex];
        logger.info(`Processing batch ${batchIndex + 1} of ${itemBatches.length} (${batch.length} items)`);
        
        // Process items in parallel within each batch
        const batchPromises = batch.map(async (item) => {
          if (item.type !== 'ITEM' || !item.item_data) {
            logger.warn(`Skipping invalid item: ${item.id}`);
            return;
          }

          try {
            await processSquareItem(item, relatedObjects, categoryMap, defaultCategory);
            syncedCount++;
          } catch (error) {
            logger.error(`Error processing item ${item.id}:`, error);
            errors.push(error instanceof Error ? error.message : String(error));
          }
        });

        // Wait for all items in this batch to complete
        await Promise.allSettled(batchPromises);
        
        // Small delay to prevent overwhelming the database
        if (batchIndex < itemBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Optional: Log info about potentially orphaned products
      logger.info(`Sync complete. Found ${validSquareIds.length} valid Square products.`);

      // Special handling for manually created products (with 'reset-' prefix in squareId)
      try {
        logger.info('Checking for manually created products that need image preservation...');
        const manualProducts = await prisma.product.findMany({
          where: {
            squareId: {
              startsWith: 'reset-'
            },
            images: {
              isEmpty: true
            }
          },
          select: {
            id: true,
            name: true, 
            squareId: true
          }
        });

        if (manualProducts.length > 0) {
          logger.info(`Found ${manualProducts.length} manual products with empty images array`);
          
          // Extract the original UUID from the squareId to look up previous versions
          for (const product of manualProducts) {
            const originalId = product.squareId.replace('reset-', '');
            logger.info(`Looking for images for manual product: ${product.name} (${product.id}), original ID: ${originalId}`);
            
            // Check for any products with this ID in our database that might have images
            const matchingProducts = await prisma.product.findMany({
              where: {
                OR: [
                  { id: originalId }, 
                  { squareId: originalId }
                ]
              },
              select: {
                images: true
              }
            });
            
            // If we find matching products with images, use those images
            for (const matchingProduct of matchingProducts) {
              if (matchingProduct.images && matchingProduct.images.length > 0) {
                logger.info(`Found matching product with ${matchingProduct.images.length} images for ${product.name}`);
                
                // Update the manual product with these images
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    images: matchingProduct.images,
                    updatedAt: new Date()
                  }
                });
                
                logger.info(`Updated manual product ${product.name} with ${matchingProduct.images.length} images`);
                break; // Stop after first match with images
              }
            }
          }
        } else {
          logger.info('No manual products without images found');
        }

        // Check for custom non-Square products that might have lost their images
        // This handles products that were added manually but don't have the 'reset-' prefix
        logger.info('Checking for non-Square products that might have lost images...');
        
        // Get all products that:
        // 1. Don't have a Square ID (custom products) or have an ID not in validSquareIds (removed from Square)
        // 2. Have empty images array
        // 3. Have been active for some time (not brand new)
        const customOrRemovedProducts = await prisma.product.findMany({
          where: {
            OR: [
              { squareId: { equals: undefined } },
              { 
                squareId: { 
                  not: { startsWith: 'reset-' },
                  notIn: validSquareIds 
                }
              }
            ],
            images: { isEmpty: true },
            active: true,
            createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Created more than 24 hours ago
          },
          select: {
            id: true,
            name: true,
            slug: true
          }
        });
        
        if (customOrRemovedProducts.length > 0) {
          logger.info(`Found ${customOrRemovedProducts.length} custom/removed products without images`);
          
          // Look for products with the same name or slug in a backup table or in the database history
          // This would require you to implement a product history or backup table
          
          // For now, just log these products so you're aware of them
          for (const product of customOrRemovedProducts) {
            logger.warn(`Custom/removed product without images: ${product.name} (${product.id})`);
            // Future implementation: Check backup tables or other sources for these product images
          }
        } else {
          logger.info('No custom/removed products without images found');
        }
      } catch (manualError) {
        logger.error('Error processing manual products:', manualError);
        // Don't fail the entire sync due to these issues
      }

      // For now, removing the special handling for 'reset-' and custom/removed products image preservation as it conflicts with strict Square data.
      // If you need specific fallbacks for *manually created* non-Square items, that logic should be separate and very targeted.
      logger.info("Skipping special image preservation for 'reset-' and custom products for now to ensure strict Square image sync.");

    } catch (searchError) {
      logger.error('Error searching catalog items:', searchError);
      errors.push(searchError instanceof Error ? searchError.message : String(searchError));
    }

    return {
      success: true,
      message: 'Products synced successfully with strict Square image logic',
      syncedProducts: syncedCount,
      errors: errors.length > 0 ? errors : undefined,
      debugInfo: debugInfo
    };
  } catch (error) {
    logger.error('Error syncing products:', error);
    return {
      success: false,
      message: 'An error occurred while syncing products',
      syncedProducts: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      debugInfo: debugInfo
    };
  }
}

async function processSquareItem(
  item: SquareCatalogObject, 
  relatedObjects: SquareCatalogObject[], 
  categoryMap: Map<string, SquareCatalogObject>,
  defaultCategory: { id: string; name: string }
): Promise<void> {
  const itemData = item.item_data!;
  const itemName = itemData.name || '';
  
  logger.debug(`Processing item: ${itemName} (${item.id})`);

  // Get images efficiently
  const imageUrls = await getImageUrls(item, relatedObjects);
  logger.debug(`Found ${imageUrls.length} image(s) for item ${itemName}`);

  const variations = itemData.variations || [];
  const { variants, basePrice } = processVariations(variations);

  const description = itemData.description;
  const updateDescription = description === null ? undefined : description;
  const createDescription = description ?? '';

  const baseSlug = createSlug(itemName);
  
  // Determine category
  let categoryId = defaultCategory.id;
  let categoryName = defaultCategory.name;
  
  const categoryIdFromItem = itemData.categories?.[0]?.id || itemData.category_id;
  
  if (categoryIdFromItem) {
    const categoryObject = categoryMap.get(categoryIdFromItem);
    if (categoryObject?.category_data?.name) {
      categoryName = categoryObject.category_data.name;
      
      if (isCateringCategory(categoryName)) {
        logger.debug(`Found catering category: ${categoryName} for item ${itemName}`);
      }
      
      try {
        const category = await getOrCreateCategoryByName(categoryName);
        categoryId = category.id;
        logger.debug(`Assigned item "${itemName}" to category "${categoryName}" (${categoryId})`);
      } catch (categoryError) {
        logger.error(`Error getting/creating category for "${itemName}":`, categoryError);
        categoryId = defaultCategory.id;
      }
    }
  }
  
  const existingProduct = await prisma.product.findUnique({
    where: { squareId: item.id },
    select: { id: true, slug: true, images: true, name: true }
  });

  const finalImages = await determineProductImages(item, relatedObjects, existingProduct || undefined);

  let ordinal: bigint | null = null;
  if (itemData.categories?.length && itemData.categories[0].ordinal !== undefined) {
    ordinal = BigInt(itemData.categories[0].ordinal);
  }

  if (existingProduct) {
    logger.debug(`Updating existing product: ${itemName} (${item.id})`);
    await prisma.product.update({
      where: { squareId: item.id },
      data: {
        name: itemName,
        description: updateDescription,
        price: basePrice,
        images: finalImages,
        ordinal: ordinal,
        variants: {
          deleteMany: {},
          create: variants
        },
        categoryId: categoryId,
        updatedAt: new Date()
      }
    });
    logger.debug(`Successfully updated product ${itemName}`);
  } else {
    const existingSlug = await prisma.product.findUnique({
      where: { slug: baseSlug },
      select: { id: true }
    });
    const uniqueSlug = existingSlug ? `${baseSlug}-${item.id.toLowerCase().substring(0, 8)}` : baseSlug;

    try {
      logger.debug(`Creating new product: ${itemName} (${item.id})`);
      await prisma.product.create({
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
          active: true,
          variants: {
            create: variants
          }
        }
      });
      logger.debug(`Successfully created product ${itemName}`);
    } catch (error) {
      const createError = error as { code?: string; meta?: { target?: string[] } };
      if (createError.code === 'P2002') {
        await handleUniqueConstraintViolation(createError, item, variants, finalImages, ordinal, categoryId, baseSlug);
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
  const constraintField = createError.meta?.target?.[0];
  logger.warn(`Constraint violation on ${constraintField} for item ${itemName}`);
  
  if (constraintField === 'squareVariantId' && variants.length > 0) {
    const conflictingVariantId = variants[0].squareVariantId;
    if (conflictingVariantId) {
      const existingVariant = await prisma.variant.findUnique({
        where: { squareVariantId: conflictingVariantId },
        include: { product: true }
      });
      
      if (existingVariant?.product) {
        logger.info(`Found existing product via variant: ${existingVariant.product.id}, updating it.`);
        
        await prisma.product.update({
          where: { id: existingVariant.product.id },
          data: {
            squareId: item.id,
            name: itemName,
            description: item.item_data?.description,
            price: processVariations(item.item_data?.variations || []).basePrice,
            images: finalImages,
            ordinal: ordinal,
            categoryId: categoryId,
            variants: {
              deleteMany: {},
              create: variants
            },
            updatedAt: new Date()
          }
        });
        logger.debug(`Updated existing product (through variant) ${itemName}`);
      }
    }
  } else {
    const timestampSlug = `${baseSlug}-${Date.now()}`;
    logger.info(`Retrying creation with unique slug: ${timestampSlug}`);
    await prisma.product.create({
      data: {
        squareId: item.id,
        name: itemName,
        slug: timestampSlug,
        description: item.item_data?.description ?? '',
        price: processVariations(item.item_data?.variations || []).basePrice,
        images: finalImages,
        ordinal: ordinal,
        categoryId: categoryId,
        featured: false,
        active: true,
        variants: {
          create: variants
        }
      }
    });
    logger.debug(`Successfully created product with timestamp slug ${itemName}`);
  }
}

// Helper function to process variations and get base price
function processVariations(variations: SquareCatalogObject[]): { variants: VariantCreate[], basePrice: Decimal } {
  if (!variations || variations.length === 0) {
    logger.debug('No variations found for item');
    return { 
      variants: [],
      basePrice: new Decimal(0)
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
      const price = variationAmount
        ? new Decimal(Number(variationAmount)).div(100)
        : null; // Or set to basePrice if variants *must* have a price
        
      logger.debug(`Processing variant: ${variationData.name || 'Unnamed'} (${variation.id}), Price: ${price}`);

      return {
        name: variationData.name || 'Regular', // Default name if missing
        price: price, // Use the calculated Decimal price (or null)
        squareVariantId: variation.id
      };
    })
    .filter((v): v is VariantCreate => v !== null); // Filter out any nulls from invalid variations

  return { variants: processedVariants, basePrice };
}

// Type guard for CatalogItemVariation to ensure necessary fields exist
function isValidVariation(variation: SquareCatalogObject | undefined): variation is SquareCatalogObject & { 
  item_variation_data: NonNullable<SquareCatalogObject['item_variation_data'] & { price_money?: { amount: bigint | number } }> 
} {
  return !!variation && 
         variation.type === 'ITEM_VARIATION' && 
         !!variation.id &&
         !!variation.item_variation_data;
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

// getImageUrls needs to be robust. It should return [] if no images are found or if errors occur during fetching individual images.
// The addCacheBustingParam should only convert sandbox to production and not add '?t=' to S3 URLs.

async function getImageUrls(item: SquareCatalogObject, relatedObjects: SquareCatalogObject[]): Promise<string[]> {
  const imageUrls: string[] = [];
  const imageIds = item.item_data?.image_ids || [];
  
  if (imageIds.length === 0) {
    return []; // Strict: no IDs, no images
  }
  
  // Process images in batches to avoid overwhelming the API
  const imageBatches = chunkArray(imageIds, IMAGE_BATCH_SIZE);
  
  for (const batch of imageBatches) {
    const batchPromises = batch.map(async (imageId) => {
      try {
        let imageUrl: string | undefined;
        
        // First try to find in related objects
        const imageObjectFromRelated = relatedObjects.find((obj: SquareCatalogObject) => 
          obj.id === imageId && obj.type === 'IMAGE'
        );
        
        if (imageObjectFromRelated?.image_data?.url) {
          imageUrl = imageObjectFromRelated.image_data.url;
          logger.debug(`Found image URL in related objects for ${imageId}`);
        } else if (squareClient.catalogApi) {
          // Fallback to API retrieval
          try {
            const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
            const imageData = imageResponse?.result?.object;
            
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

    const batchResults = await Promise.allSettled(batchPromises);
    const validUrls = batchResults
      .filter((result): result is PromiseFulfilledResult<string> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    imageUrls.push(...validUrls);
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
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
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
    if (hostname.includes('items-images-') || 
        hostname.includes('square-catalog-') || 
        hostname.includes('s3.amazonaws.com')) {
      
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
    
    if (url.includes('items-images-') || url.includes('square-catalog-') || url.includes('s3.amazonaws.com')) {
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
 * Synchronizes catering items with Square categories and images
 * This function ensures that catering items in our database are properly
 * linked to their corresponding Square categories and have up-to-date images
 */
export async function syncCateringItemsWithSquare(
  allProducts?: SquareCatalogObject[], 
  allCategories?: SquareCatalogObject[]
): Promise<{ updated: number; skipped: number; errors: number; imagesUpdated: number }> {
  const result = { updated: 0, skipped: 0, errors: 0, imagesUpdated: 0 };
  
  try {
    logger.info('Starting synchronization of catering items with Square categories and images...');
    
    let cateringCategories: SquareCatalogObject[] = [];
    let squareProducts: SquareCatalogObject[] = [];
    
    // Use provided data if available, otherwise fetch
    if (allCategories && allProducts) {
      cateringCategories = allCategories.filter((cat: SquareCatalogObject) => {
        const catName = cat.category_data?.name || '';
        return isCateringCategory(catName);
      });
      squareProducts = allProducts;
      logger.info(`Using provided data: ${cateringCategories.length} catering categories, ${squareProducts.length} products`);
    } else {
      // Fetch if not provided
      const catalogClient = getCatalogClient();
      const catalogApi = catalogClient?.catalogApi;
      if (!catalogApi) {
        throw new Error('Square catalog API not available');
      }
      
      const searchResponse = await catalogApi.searchCatalogObjects({
        object_types: ['CATEGORY', 'ITEM']
      });
      
      const allObjects = searchResponse.result.objects || [];
      cateringCategories = allObjects
        .filter((obj: SquareCatalogObject) => obj.type === 'CATEGORY')
        .filter((cat: SquareCatalogObject) => {
          const catName = cat.category_data?.name || '';
          return isCateringCategory(catName);
        });
      
      squareProducts = allObjects.filter((obj: SquareCatalogObject) => obj.type === 'ITEM');
      logger.info(`Fetched ${cateringCategories.length} catering categories and ${squareProducts.length} products`);
    }
    
    const cateringItems = await prisma.cateringItem.findMany({
      where: { isActive: true }
    });
    
    logger.info(`Found ${cateringItems.length} active catering items in database`);

    // Create a map of Square products for faster lookup
    const productMap = new Map<string, SquareCatalogObject>();
    squareProducts.forEach(product => {
      productMap.set(product.id, product);
    });

    // Related objects for image processing
    const relatedObjects = allProducts ? [] : await fetchRelatedObjects();
    
    // Process each catering category efficiently
    for (const category of cateringCategories) {
      const categoryId = category.id;
      const categoryName = category.category_data?.name || '';
      
      logger.debug(`Processing category: ${categoryName} (${categoryId})`);
      
      const categoryProducts = squareProducts.filter((product: SquareCatalogObject) => {
        const productCategoryIds = product.item_data?.category_id 
          ? [product.item_data.category_id]
          : product.item_data?.categories?.map(c => c.id) || [];
        
        return productCategoryIds.includes(categoryId);
      });
      
      logger.debug(`Found ${categoryProducts.length} products in category ${categoryName}`);
      
      // Update matching catering items in batches
      const updatePromises = categoryProducts.map(async (product) => {
        const productName = product.item_data?.name || '';
        if (!productName) return;
        
        // Use improved matching that handles name format differences
        const matchingItems = findMatchingCateringItems(cateringItems, productName);
        
        if (matchingItems.length === 0) {
          logger.debug(`No matching catering item found for Square product: ${productName}`);
          result.skipped++;
          return;
        }
        
        // Update each matching item
        for (const item of matchingItems) {
          try {
            const updateData: any = {
              updatedAt: new Date()
            };

            // Update Square category and product ID
            if (categoryName) {
              updateData.squareCategory = categoryName;
            }
            if (product.id) {
              updateData.squareProductId = product.id;
            }

            // Check and update image if needed
            if (!item.imageUrl || item.imageUrl === '') {
              try {
                const imageUrls = await getImageUrls(product, relatedObjects);
                if (imageUrls.length > 0) {
                  updateData.imageUrl = imageUrls[0];
                  result.imagesUpdated++;
                  logger.debug(`Updated image for catering item ${item.name}`);
                }
              } catch (imageError) {
                logger.warn(`Could not fetch image for ${item.name}:`, imageError);
              }
            }
            
            await prisma.cateringItem.update({
              where: { id: item.id },
              data: updateData
            });
            
            logger.debug(`Successfully updated catering item ${item.name} with Square product ID ${product.id}`);
            result.updated++;
          } catch (error) {
            logger.error(`Error updating catering item ${item.id}:`, error);
            result.errors++;
          }
        }
      });

      await Promise.allSettled(updatePromises);
    }
    
    logger.info(`Catering items sync complete: ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors, ${result.imagesUpdated} images updated`);
    return result;
  } catch (error) {
    logger.error('Error synchronizing catering items with Square:', error);
    result.errors++;
    return result;
  }
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
      object_types: ['IMAGE']
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
  const hasManualImages = existingImages.some(img => 
    img.startsWith('/images/') || // Local images
    img.includes('items-images-production.s3.us-west-2.amazonaws.com') || // Our manually assigned S3 images
    !img.includes('square-') // Non-Square URLs
  );
  
  // If we have manual images and Square doesn't provide better ones, keep manual images
  if (hasManualImages && imageUrlsFromSquare.length === 0) {
    logger.debug(`Product ${itemName}: preserving ${existingImages.length} manually assigned images (Square has none)`);
    return existingImages;
  }
  
  // If we have manual images and Square provides images, prefer manual unless they're clearly better
  if (hasManualImages && imageUrlsFromSquare.length > 0) {
    // Check if any existing images are for specific variants (like different alfajores types)
    const hasVariantSpecificImages = existingImages.some(img => 
      (itemName.toLowerCase().includes('alfajor') && img.includes('alfajor')) ||
      (itemName.toLowerCase().includes('platter') && img.includes('platter')) ||
      (itemName.toLowerCase().includes('classic') && img.includes('classic')) ||
      (itemName.toLowerCase().includes('chocolate') && img.includes('chocolate')) ||
      (itemName.toLowerCase().includes('lemon') && img.includes('lemon')) ||
      (itemName.toLowerCase().includes('gluten') && img.includes('gluten'))
    );
    
    if (hasVariantSpecificImages) {
      logger.debug(`Product ${itemName}: preserving variant-specific manually assigned images over Square images`);
      return existingImages;
    }
    
    // If Square images are significantly better (more images), use those
    if (imageUrlsFromSquare.length > existingImages.length) {
      logger.debug(`Product ${itemName}: using ${imageUrlsFromSquare.length} Square images (better than ${existingImages.length} existing)`);
      return imageUrlsFromSquare;
    }
    
    // Otherwise, keep existing manual images
    logger.debug(`Product ${itemName}: preserving ${existingImages.length} manually assigned images`);
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
export async function syncProductOrderingFromSquare(): Promise<{ updated: number; skipped: number; errors: number }> {
  const results = { updated: 0, skipped: 0, errors: 0 };
  
  try {
    logger.info('Starting product ordering synchronization from Square...');
    
    const dbProducts = await prisma.product.findMany({
      where: {
        squareId: {
          not: ""
        }
      },
      select: {
        id: true,
        squareId: true,
        name: true,
        ordinal: true
      }
    });
    
    logger.info(`Found ${dbProducts.length} products with Square IDs in database`);
    
    if (!squareClient.catalogApi) {
      throw new Error('Square catalog API not available');
    }
    
    const squareResponse = await squareClient.catalogApi.searchCatalogObjects({
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false
    });
    
    const squareItems = squareResponse.result?.objects || [];
    logger.info(`Found ${squareItems.length} items in Square catalog`);
    
    const squareOrdinalsMap = new Map<string, bigint>();
    
    for (const item of squareItems) {
      if (item.type === 'ITEM' && item.item_data?.categories && item.item_data.categories.length > 0) {
        const ordinal = item.item_data.categories[0].ordinal;
        if (ordinal !== undefined) {
          squareOrdinalsMap.set(item.id, BigInt(ordinal));
        }
      }
    }
    
    logger.info(`Created ordinal mapping for ${squareOrdinalsMap.size} Square items`);
    
    const productBatches = chunkArray(dbProducts, BATCH_SIZE);
    
    for (const batch of productBatches) {
      const updatePromises = batch.map(async (product) => {
        try {
          if (!product.squareId) {
            results.skipped++;
            return;
          }
          
          const squareOrdinal = squareOrdinalsMap.get(product.squareId);
          
          if (squareOrdinal === undefined) {
            logger.debug(`No ordinal found in Square for product ${product.name} (${product.squareId})`);
            results.skipped++;
            return;
          }
          
          if (product.ordinal !== squareOrdinal) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                ordinal: squareOrdinal,
                updatedAt: new Date()
              }
            });
            
            logger.debug(`Updated ordinal for product ${product.name}: ${product.ordinal} -> ${squareOrdinal}`);
            results.updated++;
          } else {
            results.skipped++;
          }
          
        } catch (error) {
          logger.error(`Error updating ordinal for product ${product.name}:`, error);
          results.errors++;
        }
      });

      await Promise.allSettled(updatePromises);
    }
    
    logger.info(`Product ordering sync complete. Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`);
    
  } catch (error) {
    logger.error('Error in syncProductOrderingFromSquare:', error);
    results.errors++;
  }
  
  return results;
}

// Utility function to chunk arrays for batch processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

