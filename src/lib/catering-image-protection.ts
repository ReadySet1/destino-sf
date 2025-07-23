import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db';

interface ImageProtectionResult {
  protected: number;
  skipped: number;
  errors: number;
}

/**
 * NEW LOGIC: Updates CateringItems with real images from Product table
 * This function now works in the opposite direction - Product → CateringItem
 * This aligns with our new getCateringItems() implementation
 */
export async function protectCateringImages(): Promise<ImageProtectionResult> {
  const result = { protected: 0, skipped: 0, errors: 0 };

  try {
    logger.info('🔄 Starting catering image update from Product table...');

    // Get all active catering items
    const cateringItems = await prisma.cateringItem.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        squareProductId: true,
      },
    });

    logger.info(`Found ${cateringItems.length} catering items to update`);

    // Get products with catering categories that have real images
    const cateringProducts = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          {
            category: {
              name: {
                contains: 'CATERING',
                mode: 'insensitive',
              },
            },
          },
          {
            category: {
              name: {
                contains: 'PLATTER',
                mode: 'insensitive',
              },
            },
          },
        ],
        images: {
          isEmpty: false,
        },
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    logger.info(`Found ${cateringProducts.length} products with real images`);

    // Create mapping of squareId → real image
    const productImageMap = new Map();
    cateringProducts.forEach(product => {
      if (product.images && product.images.length > 0 && product.squareId) {
        productImageMap.set(product.squareId, product.images[0]);
      }
    });

    // Update catering items with real images from products
    for (const item of cateringItems) {
      try {
        if (!item.squareProductId) {
          result.skipped++;
          continue;
        }

        const realImageUrl = productImageMap.get(item.squareProductId);
        if (!realImageUrl) {
          result.skipped++;
          continue;
        }

        // Check if the catering item needs updating
        const isGenericImage =
          item.imageUrl?.includes('/images/catering/') &&
          (item.imageUrl.includes('appetizer-package') || item.imageUrl.includes('default-item'));

        if (isGenericImage || !item.imageUrl || item.imageUrl !== realImageUrl) {
          await prisma.cateringItem.update({
            where: { id: item.id },
            data: {
              imageUrl: realImageUrl,
              updatedAt: new Date(),
            },
          });

          logger.info(`✅ Updated "${item.name}" with real image from Product table`);
          result.protected++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        logger.error(`Error updating catering item ${item.name}:`, error);
        result.errors++;
      }
    }

    logger.info(
      `🔄 Catering image update complete: ${result.protected} updated, ${result.skipped} skipped, ${result.errors} errors`
    );
    return result;
  } catch (error) {
    logger.error('Error in catering image update:', error);
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
          not: null,
        },
      },
      select: {
        name: true,
        imageUrl: true,
        squareProductId: true,
      },
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
 * NEW LOGIC: Uses the same approach as protectCateringImages
 * Prioritizes real images from Product table over backup
 */
export async function restoreCateringImagesFromBackup(
  backup: Record<string, string>
): Promise<ImageProtectionResult> {
  const result = { protected: 0, skipped: 0, errors: 0 };

  try {
    logger.info(
      `🔄 Updating catering images (backup provided with ${Object.keys(backup).length} items, but using Product table as primary source)...`
    );

    // Use the same logic as protectCateringImages - prioritize Product table
    return await protectCateringImages();
  } catch (error) {
    logger.error('Error in catering image backup restoration:', error);
    result.errors++;
    return result;
  }
}
