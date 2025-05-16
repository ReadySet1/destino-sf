// src/lib/square/sync.ts

import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
// import { createSanityProduct } from '@/lib/sanity/createProduct'; // Removed Sanity import
import { Decimal } from '@prisma/client/runtime/library';
import { squareClient } from './client';

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
      const debugInfo: any = {}; // Store debug information
    const validSquareIds: string[] = []; // Track valid Square IDs

    try {
        logger.info('Starting Square product sync...');
        
        // Also sync catering items with Square categories
        try {
            const cateringResult = await syncCateringItemsWithSquare();
            logger.info(`Catering items sync: ${cateringResult.updated} updated, ${cateringResult.skipped} skipped, ${cateringResult.errors} errors`);
        } catch (error: any) {
            logger.error('Error syncing catering items:', error);
            errors.push(`Catering sync error: ${error?.message || 'Unknown error'}`);
        }
    
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
      logger.info('Searching catalog items');
      
      // Use the searchCatalogObjects method for more reliable catalog retrieval
      const requestBody = {
        object_types: ['ITEM', 'IMAGE', 'CATEGORY'],
        include_related_objects: true,
        include_deleted_objects: false
      };
      
      const catalogResponse = await squareClient.catalogApi.searchCatalogObjects(requestBody);
      
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
            const cateringResult = await syncCateringItemsWithSquare();
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
      
      // Process items
      for (const item of items) {
        if (item.type !== 'ITEM' || !item.item_data) {
          logger.warn(`Skipping invalid item: ${item.id}`);
          continue;
        }

        try {
          const itemData = item.item_data;
          const itemName = itemData.name || '';
          
          logger.info(`Processing item: ${itemName} (${item.id})`);

          // Get images for this item directly from Square.
          // getImageUrls already converts sandbox to production and handles missing images from Square by returning [].
          const imageUrlsFromSquare = await getImageUrls(item, relatedObjects);
          logger.info(`Found ${imageUrlsFromSquare.length} image(s) for item ${itemName} directly from Square processing.`);

          const variations = itemData.variations || [];
          const { variants, basePrice } = processVariations(variations);

          const description = itemData.description;
          const updateDescription = description === null ? undefined : description;
          const createDescription = description ?? '';

          const baseSlug = createSlug(itemName);
          
          // Find the appropriate category for this item
          let categoryId = defaultCategory.id;
          let categoryName = defaultCategory.name;
          
          // Try to get category ID from the categories array first (new Square API format)
          if (itemData.categories && itemData.categories.length > 0 && itemData.categories[0].id) {
            const categoryIdFromArray = itemData.categories[0].id;
            logger.info(`Found category ID from categories array: ${categoryIdFromArray} for item ${itemName}`);
            
            const categoryObject = categoryMap.get(categoryIdFromArray);
            if (categoryObject && categoryObject.category_data && categoryObject.category_data.name) {
              categoryName = categoryObject.category_data.name;
              
              // Log for catering category debug
              if (isCateringCategory(categoryName)) {
                logger.info(`Found catering category: ${categoryName} for item ${itemName}`);
              }
              
              try {
                // Get or create the appropriate category
                const category = await getOrCreateCategoryByName(categoryName);
                categoryId = category.id;
                logger.info(`Assigned item "${itemName}" to category "${categoryName}" (${categoryId})`);
              } catch (categoryError) {
                logger.error(`Error getting/creating category for "${itemName}":`, categoryError);
                errors.push(`Failed to process category for item "${itemName}": ${categoryError instanceof Error ? categoryError.message : String(categoryError)}`);
                // Fall back to default category
                categoryId = defaultCategory.id;
              }
            } else {
              logger.warn(`Category ${categoryIdFromArray} not found for item "${itemName}", using default`);
            }
          }
          // Fall back to legacy category_id field if categories array is not present
          else if (itemData.category_id) {
            const categoryObject = categoryMap.get(itemData.category_id);
            if (categoryObject && categoryObject.category_data && categoryObject.category_data.name) {
              categoryName = categoryObject.category_data.name;
              
              // Log for catering category debug
              if (isCateringCategory(categoryName)) {
                logger.info(`Found catering category: ${categoryName} for item ${itemName}`);
              }
              
              try {
                // Get or create the appropriate category
                const category = await getOrCreateCategoryByName(categoryName);
                categoryId = category.id;
                logger.info(`Assigned item "${itemName}" to category "${categoryName}" (${categoryId})`);
              } catch (categoryError) {
                logger.error(`Error getting/creating category for "${itemName}":`, categoryError);
                errors.push(`Failed to process category for item "${itemName}": ${categoryError instanceof Error ? categoryError.message : String(categoryError)}`);
                // Fall back to default category
                categoryId = defaultCategory.id;
              }
            } else {
              logger.warn(`Category ${itemData.category_id} not found for item "${itemName}", using default`);
            }
          } else {
            logger.info(`No category specified for item "${itemName}", using default`);
          }
          
          const existingProduct = await prisma.product.findUnique({
            where: { squareId: item.id },
            select: { id: true, slug: true } // Only select what's needed
          });

          let product;
          
          if (existingProduct) {
            logger.info(`Updating existing product: ${itemName} (${item.id})`);
            product = await prisma.product.update({
              where: { squareId: item.id },
              data: {
                name: itemName,
                description: updateDescription,
                price: basePrice,
                images: imageUrlsFromSquare, // STRICTLY USE IMAGES FROM SQUARE
                variants: {
                  deleteMany: {},
                  create: variants
                },
                categoryId: categoryId, // Use the appropriate category
                updatedAt: new Date()
              }
            });
            logger.info(`Successfully updated product ${itemName}. Image count set from Square: ${imageUrlsFromSquare.length}`);
          } else {
            const existingSlug = await prisma.product.findUnique({
              where: { slug: baseSlug },
              select: { id: true }
            });
            const uniqueSlug = existingSlug ? `${baseSlug}-${item.id.toLowerCase().substring(0, 8)}` : baseSlug;

            try {
              logger.info(`Creating new product: ${itemName} (${item.id})`);
              product = await prisma.product.create({
                data: {
                  squareId: item.id,
                  name: itemName,
                  slug: uniqueSlug,
                  description: createDescription,
                  price: basePrice,
                  images: imageUrlsFromSquare, // STRICTLY USE IMAGES FROM SQUARE
                  categoryId: categoryId, // Use the appropriate category
                  featured: false,
                  active: true,
                  variants: {
                    create: variants
                  }
                }
              });
              logger.info(`Successfully created product ${itemName}. Image count set from Square: ${imageUrlsFromSquare.length}`);
            } catch (error) {
              const createError = error as { code?: string; meta?: { target?: string[] } };
              if (createError.code === 'P2002') {
                const constraintField = createError.meta?.target?.[0];
                logger.warn(`Constraint violation on ${constraintField} for item ${itemName}`);
                
                if (constraintField === 'squareVariantId') {
                  const conflictingVariantId = variants.length > 0 ? variants[0].squareVariantId : null;
                  if (conflictingVariantId) {
                    const existingVariant = await prisma.variant.findUnique({
                      where: { squareVariantId: conflictingVariantId },
                      include: { product: true }
                    });
                    
                    if (existingVariant && existingVariant.product) {
                      logger.info(`Found existing product via variant: ${existingVariant.product.id}, updating it.`);
                      product = await prisma.product.update({
                        where: { id: existingVariant.product.id },
                        data: {
                          squareId: item.id,
                          name: itemName,
                          description: updateDescription,
                          price: basePrice,
                          images: imageUrlsFromSquare, // STRICTLY USE IMAGES FROM SQUARE
                          categoryId: categoryId, // Use the appropriate category
                          variants: {
                            deleteMany: {},
                            create: variants
                          },
                          updatedAt: new Date()
                        }
                      });
                      logger.info(`Updated existing product (through variant) ${itemName}. Image count set from Square: ${imageUrlsFromSquare.length}`);
                    }
                  }
                } else {
                  const timestampSlug = `${baseSlug}-${Date.now()}`;
                  logger.info(`Retrying creation with unique slug: ${timestampSlug}`);
                  product = await prisma.product.create({
                    data: {
                      squareId: item.id,
                      name: itemName,
                      slug: timestampSlug,
                      description: createDescription,
                      price: basePrice,
                      images: imageUrlsFromSquare, // STRICTLY USE IMAGES FROM SQUARE
                      categoryId: categoryId, // Use the appropriate category
                      featured: false,
                      active: true,
                      variants: {
                        create: variants
                      }
                    }
                  });
                  logger.info(`Successfully created product with timestamp slug ${itemName}. Image count set from Square: ${imageUrlsFromSquare.length}`);
                }
              } else {
                throw createError;
              }
            }
          }

          const savedProduct = await prisma.product.findUnique({
            where: { squareId: item.id }, // Assuming product was successfully created/updated
            select: { images: true }
          });
          logger.info(`Verified saved product ${itemName} images in DB: ${JSON.stringify(savedProduct?.images)}`);

          syncedCount++;
        } catch (error) {
          logger.error(`Error processing item ${item.id}:`, error);
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      
      // Optional: Clean up products with invalid Square IDs
      const cleanupEnabled = process.env.AUTO_CLEANUP_INVALID_PRODUCTS === 'true';
      if (cleanupEnabled) {
        try {
          logger.info('Checking for products with invalid Square IDs...');
          
          // Get all products with non-empty squareId
          const productsWithSquareIds = await prisma.product.findMany({
            select: { id: true, name: true, squareId: true }
          });
          
          // Filter in memory to find those with invalid Square IDs
          const invalidProducts = productsWithSquareIds.filter(
            product => product.squareId && !validSquareIds.includes(product.squareId)
          );
          
          if (invalidProducts.length > 0) {
            logger.info(`Found ${invalidProducts.length} products with invalid Square IDs`);
            
            for (const product of invalidProducts) {
              logger.info(`Setting Square ID to undefined for invalid product: ${product.name} (${product.id})`);
              await prisma.product.update({
                where: { id: product.id },
                data: { 
                  squareId: undefined,
                  updatedAt: new Date()
                }
              });
            }
            
            logger.info(`Successfully cleaned up ${invalidProducts.length} products with invalid Square IDs`);
          } else {
            logger.info('No products with invalid Square IDs found');
          }
        } catch (cleanupError) {
          logger.error('Error during invalid product cleanup:', cleanupError);
          // Don't fail the entire sync due to cleanup issues
        }
      }

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

// Helper function to process variations and get base price
function processVariations(variations: SquareCatalogObject[]): { variants: VariantCreate[], basePrice: Decimal } {
  if (!variations || variations.length === 0) {
    logger.warn('No variations found for item');
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

  logger.info(`Base price determined from first variation: ${basePrice}`);

  const processedVariants = variations
    .map((variation): VariantCreate | null => {
      // Ensure it's a valid variation with necessary data
      if (!isValidVariation(variation)) {
        logger.warn(`Skipping invalid variation object: ${variation.id}`);
        return null;
      }

      const variationData = variation.item_variation_data;
      const variationAmount = variationData.price_money?.amount;
      
      // Convert amount (cents) to Decimal dollars for the variant price
      // If a variant amount is missing, it might default to basePrice or be null depending on requirements
      const price = variationAmount
        ? new Decimal(Number(variationAmount)).div(100)
        : null; // Or set to basePrice if variants *must* have a price
        
      logger.info(`Processing variant: ${variationData.name || 'Unnamed'} (${variation.id}), Price: ${price}`);

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
function isValidVariation(variation: SquareCatalogObject | undefined): variation is SquareCatalogObject & { item_variation_data: NonNullable<SquareCatalogObject['item_variation_data'] & { price_money?: { amount: bigint | number } }> } {
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
  
  for (const imageId of imageIds) {
    try {
      let imageUrl: string | undefined;
      
      // First try to find the image in related objects
      const imageObjectFromRelated = relatedObjects.find((obj: SquareCatalogObject) => obj.id === imageId && obj.type === 'IMAGE');
      
      if (imageObjectFromRelated?.image_data?.url) {
        imageUrl = imageObjectFromRelated.image_data.url;
        logger.info(`Found image URL in related objects for ${imageId}: ${imageUrl}`);
      } else {
        // If not found in related objects, fetch directly
        try {
          const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
          const imageData = imageResponse.result?.object;
          
          if (imageData?.image_data?.url) {
            imageUrl = imageData.image_data.url;
            logger.info(`Retrieved image URL from API for ${imageId}: ${imageUrl}`);
          }
        } catch (imageApiError) {
          logger.error(`Error retrieving image ${imageId} from API:`, imageApiError);
        }
      }
      
      // If we found an image URL, process it and try to verify it works
      if (imageUrl) {
        try {
          // Extract file ID and file name if it's an S3 URL
          const filePathMatch = imageUrl.match(/\/files\/([^\/]+)\/([^\/\?]+)/);
          
          if (filePathMatch && filePathMatch.length >= 3) {
            const fileId = filePathMatch[1];
            const fileName = filePathMatch[2];
            
            // Try sandbox URL first - experience shows they're more reliable
            const sandboxUrl = `https://items-images-sandbox.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`;
            
            // Create a fetch request to test if the sandbox URL works
            let workingUrl: string | null = null;
            
            try {
              const response = await fetch(sandboxUrl, { 
                method: 'HEAD',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
                  'Cache-Control': 'no-cache'
                }
              });
              
              if (response.ok) {
                logger.info(`Sandbox URL works for image ${imageId}: ${sandboxUrl}`);
                workingUrl = sandboxUrl;
              }
            } catch (fetchError) {
              logger.warn(`Error checking sandbox URL for ${imageId}:`, fetchError);
            }
            
            // If sandbox URL didn't work, try production URL
            if (!workingUrl) {
              const productionUrl = `https://items-images-production.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`;
              
              try {
                const response = await fetch(productionUrl, { 
                  method: 'HEAD',
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
                    'Cache-Control': 'no-cache'
                  }
                });
                
                if (response.ok) {
                  logger.info(`Production URL works for image ${imageId}: ${productionUrl}`);
                  workingUrl = productionUrl;
                }
              } catch (fetchError) {
                logger.warn(`Error checking production URL for ${imageId}:`, fetchError);
              }
            }
            
            // If we have a working URL, add it to our list
            if (workingUrl) {
              // Store the direct URL in the database - our proxy will handle it when displayed
              imageUrls.push(workingUrl);
              
              // Log the "processed" URL we would use for display (via proxy)
              const processedUrl = processSquareImageUrl(workingUrl);
              logger.info(`Added image URL for ${imageId}: ${workingUrl} (displays as: ${processedUrl})`);
            } else {
              logger.warn(`No working URL found for image ${imageId}`);
            }
          } else {
            // If it's not an S3 URL pattern, process it normally
            const processedUrl = processSquareImageUrl(imageUrl);
            imageUrls.push(imageUrl); // Store the original URL
            logger.info(`Added non-S3 image URL for ${imageId}: ${imageUrl} (displays as: ${processedUrl})`);
          }
        } catch (processingError) {
          logger.error(`Error processing image URL ${imageUrl} for ${imageId}:`, processingError);
        }
      } else {
        logger.warn(`No URL found for image ${imageId}`);
      }
    } catch (imageError) {
      logger.error(`Error retrieving image ${imageId} for item ${item.id}, skipping this image:`, imageError);
      // Continue to next imageId, do not push anything for this failed one.
    }
  }
  
  logger.info(`Final image URLs for item ${item.id}: ${JSON.stringify(imageUrls)}`);
  return imageUrls; // Returns only successfully verified URLs
}

// Process Square image URLs to make them accessible
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
 * Synchronizes catering items with Square categories
 * This function ensures that catering items in our database are properly
 * linked to their corresponding Square categories
 */
export async function syncCateringItemsWithSquare(): Promise<{ updated: number; skipped: number; errors: number }> {
  const result = { updated: 0, skipped: 0, errors: 0 };
  
  try {
    logger.info('Starting synchronization of catering items with Square categories...');
    
    // Get all catering categories from Square
    const catalogApi = squareClient.catalogApi;
    let cateringCategories: SquareCatalogObject[] = [];
    
    // Fetch all categories
    const categoriesResponse = await catalogApi.listCatalog(undefined, 'CATEGORY');
    const allCategories = categoriesResponse.result.objects || [];
    
    // Filter to only catering categories
    cateringCategories = allCategories.filter((cat: SquareCatalogObject) => {
      const catName = cat.category_data?.name || '';
      return isCateringCategory(catName);
    });
    
    logger.info(`Found ${cateringCategories.length} catering categories in Square`);
    
    // Get all active catering items from our database
    const cateringItems = await prisma.cateringItem.findMany({
      where: { isActive: true }
    });
    
    logger.info(`Found ${cateringItems.length} active catering items in our database`);
    
    // Get all products from Square catalog
    const productsResponse = await catalogApi.listCatalog(undefined, 'ITEM');
    const allProducts = productsResponse.result.objects || [];
    
    // For each catering category, find products and update our catering items
    for (const category of cateringCategories) {
      const categoryId = category.id;
      const categoryName = category.category_data?.name || '';
      
      logger.info(`Processing category: ${categoryName} (${categoryId})`);
      
      // Find products in this category
      const categoryProducts = allProducts.filter((product: SquareCatalogObject) => {
        const productCategoryIds = product.item_data?.category_id 
          ? [product.item_data.category_id]
          : product.item_data?.categories?.map(c => c.id) || [];
        
        return productCategoryIds.includes(categoryId);
      });
      
      logger.info(`Found ${categoryProducts.length} products in category ${categoryName}`);
      
      // Update our catering items that match these products by name
      for (const product of categoryProducts) {
        const productName = product.item_data?.name || '';
        if (!productName) continue;
        
        // Find matching catering item by name (case insensitive)
        const matchingItems = cateringItems.filter(item => 
          item.name.toLowerCase() === productName.toLowerCase()
        );
        
        if (matchingItems.length === 0) {
          logger.info(`No matching catering item found for Square product: ${productName}`);
          result.skipped++;
          continue;
        }
        
        // Update each matching item
        for (const item of matchingItems) {
          try {
            // Get the Square variation price if available
            let squarePrice = null;
            if (product.item_data?.variations && product.item_data.variations.length > 0) {
              const variation = product.item_data.variations[0];
              if (variation.item_variation_data?.price_money?.amount) {
                // Convert Square cents to decimal dollars
                squarePrice = Number(variation.item_variation_data.price_money.amount) / 100;
                logger.info(`Found Square price ${squarePrice} for catering item ${item.name}`);
              }
            }
            
            // Use raw SQL to update catering items to avoid Prisma schema issues
            // This handles both the case when the schema has the new fields or not
            await prisma.$executeRaw`
              UPDATE "CateringItem"
              SET
                "updatedAt" = NOW()
                ${categoryName ? `, "squareCategory" = ${categoryName}` : ''}
                ${product.id ? `, "squareProductId" = ${product.id}` : ''}
              WHERE "id" = ${item.id}
            `;
            
            logger.info(`Successfully updated catering item ${item.name} with Square product ID ${product.id}`);
            
            logger.info(`Updated catering item "${item.name}" with Square category: ${categoryName}`);
            result.updated++;
          } catch (error) {
            logger.error(`Error updating catering item ${item.id}:`, error);
            result.errors++;
          }
        }
      }
    }
    
    logger.info(`Catering items sync complete: ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);
    return result;
  } catch (error) {
    logger.error('Error synchronizing catering items with Square:', error);
    result.errors++;
    return result;
  }
}