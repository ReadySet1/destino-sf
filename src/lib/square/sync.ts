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
    category_id?: string;
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

export async function syncSquareProducts(): Promise<SyncResult> {
  const errors: string[] = [];
  let syncedCount = 0;
  const debugInfo: any = {}; // Store debug information

  try {
    logger.info('Starting Square product sync...');
    
    // Get the default category first
    const defaultCategory = await getOrCreateDefaultCategory();
    if (!defaultCategory) {
      throw new Error('Failed to get or create default category');
    }

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
        object_types: ['ITEM', 'IMAGE'],
        include_related_objects: true,
        include_deleted_objects: false
      };
      
      const catalogResponse = await squareClient.catalogApi.searchCatalogObjects(requestBody);
      
      logger.info('Catalog response keys:', Object.keys(catalogResponse));
      debugInfo.catalogResponseKeys = Object.keys(catalogResponse);
      
      // Extract the items from the response
      const items = catalogResponse.result?.objects || [];
      const relatedObjects = catalogResponse.result?.related_objects || [];
      
      logger.info(`Found ${items.length} catalog items and ${relatedObjects.length} related objects`);
      debugInfo.itemsFound = items.length;
      debugInfo.relatedObjectsFound = relatedObjects.length;
      
      if (items.length > 0) {
        logger.info('First item sample:', JSON.stringify(items[0]));
        debugInfo.firstItemSample = items[0];
      }
      
      // Function to extract image URLs from related objects
      const getImageUrls = async (item: SquareCatalogObject): Promise<string[]> => {
        const imageUrls: string[] = [];
        const imageIds = item.item_data?.image_ids || [];
        
        if (imageIds.length === 0) {
          logger.info(`No image IDs found for item ${item.id}`);
          return imageUrls;
        }
        
        logger.info(`Found ${imageIds.length} image IDs for item ${item.id}: ${JSON.stringify(imageIds)}`);
        
        // Look for image objects in related_objects
        for (const imageId of imageIds) {
          const imageObject = relatedObjects.find((obj: SquareCatalogObject) => obj.id === imageId && obj.type === 'IMAGE');
          
          if (imageObject && imageObject.image_data && imageObject.image_data.url) {
            const imageUrl = imageObject.image_data.url;
            logger.info(`Found image URL in related objects: ${imageUrl}`);
            if (imageUrl) {
              imageUrls.push(imageUrl);
            } else {
              logger.warn(`Found image object but URL is null/empty for image ID: ${imageId}`);
            }
          } else {
            logger.info(`Image not found in related objects, trying direct API call for image ID: ${imageId}`);
            // If not in related_objects, try to get it directly
            try {
              if (squareClient.catalogApi.retrieveCatalogObject) {
                const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
                const imageData = imageResponse.result?.object;
                
                if (imageData && imageData.image_data && imageData.image_data.url) {
                  const imageUrl = imageData.image_data.url;
                  logger.info(`Retrieved image URL from API: ${imageUrl}`);
                  if (imageUrl) {
                    imageUrls.push(imageUrl);
                  } else {
                    logger.warn(`Retrieved image data but URL is null/empty for image ID: ${imageId}`);
                  }
                } else {
                  logger.warn(`No valid image data found for image ID: ${imageId}`);
                }
              }
            } catch (imageError) {
              logger.error(`Error retrieving image ${imageId}:`, imageError);
            }
          }
        }
        
        logger.info(`Final image URLs for item ${item.id}: ${JSON.stringify(imageUrls)}`);
        return imageUrls;
      };
      
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

          // Get images for this item
          const imageUrls = await getImageUrls(item);
          logger.info(`Found ${imageUrls.length} images for item ${itemName}`);

          // Process variants
          const variations = itemData.variations || [];
          const { variants, basePrice } = processVariations(variations);

          // Handle description
          const description = itemData.description;
          const updateDescription = description === null ? undefined : description;
          const createDescription = description ?? '';

          // Always use the default category ID we verified/created earlier
          // instead of trying to use Square's category_id which may not map
          // to our database's categories
          
          // Upsert product in database
          const product = await prisma.product.upsert({
            where: { squareId: item.id },
            update: {
              name: itemName,
              description: updateDescription,
              price: basePrice,
              images: imageUrls, // Update with image URLs
              variants: {
                deleteMany: {},
                create: variants
              },
              categoryId: defaultCategory.id, // Always use default category
              updatedAt: new Date()
            },
            create: {
              squareId: item.id,
              name: itemName,
              description: createDescription,
              price: basePrice,
              images: imageUrls, // Use image URLs
              categoryId: defaultCategory.id, // Always use default category
              featured: false,
              active: true,
              variants: {
                create: variants
              }
            }
          });

          syncedCount++;
          logger.info(`Synced product: ${itemName} (${item.id})`);
        } catch (error) {
          logger.error(`Error processing item ${item.id}:`, error);
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    } catch (searchError) {
      logger.error('Error searching catalog items:', searchError);
      errors.push(searchError instanceof Error ? searchError.message : String(searchError));
    }

    return {
      success: true,
      message: 'Products synced successfully',
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