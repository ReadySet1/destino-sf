import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';

interface ImageProtectionResult {
  protected: number;
  skipped: number;
  errors: number;
}

/**
 * Protects manually assigned catering images from being overwritten
 * This function should be called after Square sync to restore any manually assigned images
 */
export async function protectCateringImages(): Promise<ImageProtectionResult> {
  const result = { protected: 0, skipped: 0, errors: 0 };
  
  try {
    logger.info('Starting catering image protection...');
    
    // Get all catering items that have manually assigned images that might have been overwritten
    const cateringItems = await prisma.cateringItem.findMany({
      where: {
        isActive: true,
        imageUrl: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        squareProductId: true
      }
    });
    
    logger.info(`Found ${cateringItems.length} catering items with images to protect`);
    
    // For each catering item, find its corresponding product and restore the image if needed
    for (const item of cateringItems) {
      try {
        if (!item.squareProductId) {
          logger.info(`Catering item ${item.name} has no Square product ID, skipping`);
          result.skipped++;
          continue;
        }
        
        // Find the corresponding product by Square ID
        const product = await prisma.product.findUnique({
          where: { squareId: item.squareProductId },
          select: { id: true, name: true, images: true }
        });
        
        if (!product) {
          logger.info(`No product found for catering item ${item.name} with Square ID ${item.squareProductId}`);
          result.skipped++;
          continue;
        }
        
        // Check if the product's images match the catering item's imageUrl
        const cateringImageUrl = item.imageUrl;
        const productImages = product.images || [];
        
        // If the catering item's image is not in the product's images, add it
        if (cateringImageUrl && !productImages.includes(cateringImageUrl)) {
          logger.info(`Restoring image for product ${product.name}: ${cateringImageUrl}`);
          
          // Add the catering image to the beginning of the product's images array
          const updatedImages = [cateringImageUrl, ...productImages];
          
          await prisma.product.update({
            where: { id: product.id },
            data: {
              images: updatedImages,
              updatedAt: new Date()
            }
          });
          
          logger.info(`Protected image for ${product.name}: ${cateringImageUrl}`);
          result.protected++;
        } else {
          logger.info(`Product ${product.name} already has the correct image, no protection needed`);
          result.skipped++;
        }
      } catch (error) {
        logger.error(`Error protecting image for catering item ${item.name}:`, error);
        result.errors++;
      }
    }
    
    logger.info(`Catering image protection complete: ${result.protected} protected, ${result.skipped} skipped, ${result.errors} errors`);
    return result;
  } catch (error) {
    logger.error('Error in catering image protection:', error);
    result.errors++;
    return result;
  }
}

/**
 * Creates a mapping between catering items and their manual images
 * This can be used to restore images after a Square sync
 */
export async function createCateringImageBackup(): Promise<Record<string, string>> {
  try {
    const cateringItems = await prisma.cateringItem.findMany({
      where: {
        isActive: true,
        imageUrl: {
          not: null
        }
      },
      select: {
        name: true,
        imageUrl: true,
        squareProductId: true
      }
    });
    
    const backup: Record<string, string> = {};
    
    for (const item of cateringItems) {
      if (item.squareProductId && item.imageUrl) {
        backup[item.squareProductId] = item.imageUrl;
      }
    }
    
    logger.info(`Created backup for ${Object.keys(backup).length} catering images`);
    return backup;
  } catch (error) {
    logger.error('Error creating catering image backup:', error);
    return {};
  }
}

/**
 * Restores catering images from a backup
 */
export async function restoreCateringImagesFromBackup(backup: Record<string, string>): Promise<ImageProtectionResult> {
  const result = { protected: 0, skipped: 0, errors: 0 };
  
  try {
    logger.info(`Restoring ${Object.keys(backup).length} catering images from backup...`);
    
    for (const [squareProductId, imageUrl] of Object.entries(backup)) {
      try {
        // Find the product by Square ID
        const product = await prisma.product.findUnique({
          where: { squareId: squareProductId },
          select: { id: true, name: true, images: true }
        });
        
        if (!product) {
          logger.warn(`Product not found for Square ID ${squareProductId}, skipping`);
          result.skipped++;
          continue;
        }
        
        const productImages = product.images || [];
        
        // If the image is not in the product's images, add it
        if (!productImages.includes(imageUrl)) {
          const updatedImages = [imageUrl, ...productImages];
          
          await prisma.product.update({
            where: { id: product.id },
            data: {
              images: updatedImages,
              updatedAt: new Date()
            }
          });
          
          logger.info(`Restored image for ${product.name}: ${imageUrl}`);
          result.protected++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        logger.error(`Error restoring image for Square ID ${squareProductId}:`, error);
        result.errors++;
      }
    }
    
    logger.info(`Image restoration complete: ${result.protected} restored, ${result.skipped} skipped, ${result.errors} errors`);
    return result;
  } catch (error) {
    logger.error('Error restoring catering images from backup:', error);
    result.errors++;
    return result;
  }
} 