// src/lib/square/sync.ts

import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import { createSanityProduct } from '@/lib/sanity/createProduct';
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
    const newCategory = await prisma.category.create({
      data: {
        name: 'Default',
        description: 'Default category for imported products',
        slug: 'default',
        order: 0,
        isActive: true,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    });

    // Create in Sanity as well
    await createSanityProduct({
      name: newCategory.name,
      description: newCategory.description ?? undefined,
      categoryId: newCategory.id,
      images: [],
      featured: false,
      price: 0,
      squareId: 'default-category'
    });

    return newCategory;
  } catch (error) {
    logger.error('Error getting/creating default category:', error);
    throw error;
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

          // Sync with Sanity
          await createSanityProduct({
            name: product.name,
            description: product.description ?? undefined,
            price: Number(product.price),
            categoryId: product.categoryId,
            squareId: product.squareId,
            images: product.images as string[],
            featured: product.featured
          });

          syncedCount++;
          logger.info(`Successfully synced product: ${itemName} (${item.id})`);
        } catch (itemError) {
          const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error processing item';
          errors.push(`Error processing item ${item.id}: ${errorMessage}`);
          logger.error(`Error processing item ${item.id}:`, itemError);
          continue; // Continue with next item even if this one fails
        }
      }

      const message = errors.length === 0
        ? `Successfully synced ${syncedCount} products`
        : `Synced ${syncedCount} products with ${errors.length} errors`;

      return {
        success: errors.length === 0,
        message,
        syncedProducts: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
        debugInfo
      };

    } catch (catalogError) {
      logger.error('Error searching catalog:', catalogError);
      throw catalogError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync';
    logger.error('Square sync failed:', error);
    return {
      success: false,
      message: `Sync failed: ${errorMessage}`,
      syncedProducts: syncedCount,
      errors: [errorMessage],
      debugInfo
    };
  }
}

// Helper function to process variations and get base price
function processVariations(variations: SquareCatalogObject[]): { variants: VariantCreate[], basePrice: Decimal } {
  if (!variations.length) {
    logger.warn('No variations found for item');
    return { 
      variants: [],
      basePrice: new Decimal(0)
    };
  }

  const firstVariation = variations[0];
  const firstVariationData = isValidVariation(firstVariation) ? firstVariation.item_variation_data : undefined;
  const basePriceAmount = firstVariationData?.price_money?.amount;
  const basePrice = basePriceAmount
    ? new Decimal(basePriceAmount.toString()).div(100)
    : new Decimal(0);

  const variants = variations
    .map((variation): VariantCreate | null => {
      if (!isValidVariation(variation)) return null;

      const variationData = variation.item_variation_data;
      const variationAmount = variationData.price_money?.amount;
      const price = variationAmount
        ? new Decimal(variationAmount.toString()).div(100)
        : basePrice;

      return {
        name: variationData.name || 'Standard',
        price,
        squareVariantId: variation.id
      };
    })
    .filter((v): v is VariantCreate => v !== null);

  return { variants, basePrice };
}

// Type guard for CatalogItemVariation
function isValidVariation(variation: SquareCatalogObject | undefined): variation is SquareCatalogObject & { item_variation_data: NonNullable<SquareCatalogObject['item_variation_data']> } {
  return !!variation && variation.type === 'ITEM_VARIATION' && !!variation.item_variation_data && !!variation.id;
}