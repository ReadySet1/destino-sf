// src/scripts/update-missing-images.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import { squareClient } from '../lib/square/client.js';
import { logger } from '../utils/logger.js';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma client
const prisma = new PrismaClient();

// Main function
async function main() {
  try {
    logger.info('Starting update of products with missing images or slugs...');
    
    // Get all products
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { images: { isEmpty: true } },
          { slug: null }
        ]
      },
      select: {
        id: true,
        squareId: true,
        name: true,
        images: true,
        slug: true
      }
    });
    
    logger.info(`Found ${products.length} products that need updating`);
    
    // Process each product
    for (const product of products) {
      try {
        logger.info(`Processing product: ${product.name} (${product.id})`);
        
        // Create updates object
        const updates = {};
        
        // Handle missing slug
        if (!product.slug) {
          updates.slug = createSlug(product.name);
          logger.info(`Generated slug "${updates.slug}" for product ${product.name}`);
        }
        
        // Handle missing images
        if (!product.images || product.images.length === 0) {
          // Retrieve the catalog item from Square
          try {
            const response = await squareClient.catalogApi.retrieveCatalogObject(product.squareId);
            const item = response.result?.object;
            
            if (item && item.item_data) {
              const imageIds = item.item_data.image_ids || [];
              
              if (imageIds.length > 0) {
                const imageUrls = await getProductImages(item, imageIds);
                
                if (imageUrls.length > 0) {
                  updates.images = imageUrls;
                  logger.info(`Found ${imageUrls.length} images for product ${product.name}`);
                } else {
                  logger.info(`No images found for product ${product.name}`);
                }
              } else {
                logger.info(`No image IDs found for product ${product.name}`);
              }
            } else {
              logger.warn(`Unable to retrieve valid catalog item for ${product.name}`);
            }
          } catch (err) {
            logger.error(`Error retrieving catalog item for ${product.name}:`, err);
          }
        }
        
        // Update the product if we have changes
        if (Object.keys(updates).length > 0) {
          logger.info(`Updating product ${product.name} with:`, updates);
          
          await prisma.product.update({
            where: { id: product.id },
            data: updates
          });
          
          logger.info(`Successfully updated product: ${product.name}`);
        } else {
          logger.info(`No updates needed for product: ${product.name}`);
        }
      } catch (productError) {
        logger.error(`Error processing product ${product.name}:`, productError);
      }
    }
    
    logger.info('Product update completed successfully');
  } catch (error) {
    logger.error('Error updating products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to get product images
async function getProductImages(item, imageIds) {
  const imageUrls = [];
  
  for (const imageId of imageIds) {
    try {
      logger.info(`Fetching image with ID: ${imageId}`);
      
      const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
      const imageData = imageResponse.result?.object;
      
      if (imageData && imageData.image_data && imageData.image_data.url) {
        const imageUrl = imageData.image_data.url;
        logger.info(`Retrieved image URL: ${imageUrl}`);
        
        // Add cache busting parameter
        const cacheBustedUrl = addCacheBustingParam(imageUrl);
        imageUrls.push(cacheBustedUrl);
      } else {
        logger.warn(`No valid image data found for image ID: ${imageId}`);
      }
    } catch (imageError) {
      logger.error(`Error retrieving image ${imageId}:`, imageError);
    }
  }
  
  return imageUrls;
}

// Helper function to add cache busting parameter
function addCacheBustingParam(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

// Helper function to create a URL-friendly slug
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim();
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error in script:', error);
  process.exit(1);
}); 