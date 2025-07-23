#!/usr/bin/env tsx

/**
 * Sync Catering Images Script
 *
 * This script synchronizes catering item images from their linked Square products.
 * It finds catering items that have a squareProductId but missing imageUrl,
 * then copies the first image from the linked Product.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

async function syncCateringImages(): Promise<{
  updated: number;
  skipped: number;
  errors: number;
  noSquareId: number;
}> {
  const result = { updated: 0, skipped: 0, errors: 0, noSquareId: 0 };

  try {
    logger.info('🖼️  Starting catering images synchronization...');

    // Find all active catering items without images
    const cateringItems = await prisma.cateringItem.findMany({
      where: {
        isActive: true,
        OR: [{ imageUrl: null }, { imageUrl: '' }],
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        squareProductId: true,
      },
    });

    logger.info(`Found ${cateringItems.length} catering items without images`);

    for (const item of cateringItems) {
      try {
        // Skip items without Square product ID
        if (!item.squareProductId) {
          logger.debug(`❌ Catering item "${item.name}" has no Square product ID`);
          result.noSquareId++;
          continue;
        }

        // Find the linked product by squareId
        const product = await prisma.product.findUnique({
          where: { squareId: item.squareProductId },
          select: {
            name: true,
            images: true,
            squareId: true,
          },
        });

        if (!product) {
          logger.warn(
            `⚠️  No product found for catering item "${item.name}" with Square ID: ${item.squareProductId}`
          );
          result.skipped++;
          continue;
        }

        // Check if the product has images
        if (!product.images || product.images.length === 0) {
          logger.debug(
            `📷 Product "${product.name}" has no images for catering item "${item.name}"`
          );
          result.skipped++;
          continue;
        }

        // Use the first image from the product
        const imageUrl = product.images[0];

        // Update the catering item with the image URL
        await prisma.cateringItem.update({
          where: { id: item.id },
          data: {
            imageUrl: imageUrl,
            updatedAt: new Date(),
          },
        });

        logger.info(`✅ Updated "${item.name}" with image: ${imageUrl.substring(0, 50)}...`);
        result.updated++;
      } catch (error) {
        logger.error(`❌ Error processing catering item "${item.name}":`, error);
        result.errors++;
      }
    }

    // Summary
    logger.info(`\n📊 Catering images sync summary:`);
    logger.info(`   ✅ Updated: ${result.updated}`);
    logger.info(`   ⏭️  Skipped: ${result.skipped}`);
    logger.info(`   🚫 No Square ID: ${result.noSquareId}`);
    logger.info(`   ❌ Errors: ${result.errors}`);

    return result;
  } catch (error) {
    logger.error('❌ Error in catering images sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Additional function to verify image availability
 */
async function verifyImageUrls(): Promise<void> {
  logger.info('🔍 Verifying catering item image URLs...');

  const itemsWithImages = await prisma.cateringItem.findMany({
    where: {
      isActive: true,
      imageUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
  });

  logger.info(`Found ${itemsWithImages.length} catering items with images`);

  let validImages = 0;
  let invalidImages = 0;

  for (const item of itemsWithImages) {
    try {
      if (item.imageUrl) {
        // For Square S3 URLs, we'll assume they are valid
        // For production, you might want to add actual HTTP checks
        if (
          item.imageUrl.includes('items-images-production.s3') ||
          item.imageUrl.includes('squarecdn.com') ||
          item.imageUrl.startsWith('/images/')
        ) {
          validImages++;
          logger.debug(`✅ Valid image for "${item.name}"`);
        } else {
          invalidImages++;
          logger.warn(`⚠️  Potentially invalid image URL for "${item.name}": ${item.imageUrl}`);
        }
      }
    } catch (error) {
      logger.error(`Error checking image for "${item.name}":`, error);
      invalidImages++;
    }
  }

  logger.info(`\n📊 Image verification summary:`);
  logger.info(`   ✅ Valid images: ${validImages}`);
  logger.info(`   ⚠️  Potentially invalid: ${invalidImages}`);
}

/**
 * Function to sync images from Square products that don't have catering items yet
 */
async function syncMissingCateringItemsFromSquare(): Promise<{
  created: number;
  skipped: number;
  errors: number;
}> {
  const result = { created: 0, skipped: 0, errors: 0 };

  try {
    logger.info('🔄 Checking for Square products that should be catering items...');

    // Find products in catering categories that don't have matching catering items
    const cateringProducts = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            contains: 'CATERING',
            mode: 'insensitive',
          },
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

    logger.info(`Found ${cateringProducts.length} products in catering categories`);

    for (const product of cateringProducts) {
      try {
        // Check if a catering item already exists for this product
        const existingCateringItem = await prisma.cateringItem.findFirst({
          where: {
            squareProductId: product.squareId,
          },
        });

        if (existingCateringItem) {
          result.skipped++;
          continue;
        }

        // Determine category based on the Square category name
        let category = 'STARTER'; // default
        const categoryName = product.category?.name?.toUpperCase() || '';

        if (categoryName.includes('DESSERT')) {
          category = 'DESSERT';
        } else if (categoryName.includes('ENTREE') || categoryName.includes('BUFFET')) {
          category = 'ENTREE';
        } else if (categoryName.includes('SIDE')) {
          category = 'SIDE';
        } else if (categoryName.includes('SALAD')) {
          category = 'SALAD';
        } else if (categoryName.includes('BEVERAGE')) {
          category = 'BEVERAGE';
        }

        // Create catering item from product
        await prisma.cateringItem.create({
          data: {
            name: product.name,
            description: product.description || '',
            price: product.price,
            category: category as any,
            imageUrl: product.images[0] || null,
            squareProductId: product.squareId,
            squareCategory: product.category?.name,
            isActive: true,
          },
        });

        logger.info(`✅ Created catering item "${product.name}" from Square product`);
        result.created++;
      } catch (error) {
        logger.error(`❌ Error creating catering item from product "${product.name}":`, error);
        result.errors++;
      }
    }

    logger.info(`\n📊 Missing catering items sync summary:`);
    logger.info(`   ✅ Created: ${result.created}`);
    logger.info(`   ⏭️  Skipped: ${result.skipped}`);
    logger.info(`   ❌ Errors: ${result.errors}`);

    return result;
  } catch (error) {
    logger.error('❌ Error syncing missing catering items:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('🚀 Starting catering images sync script...');

    // Step 1: Sync images for existing catering items
    const syncResult = await syncCateringImages();

    // Step 2: Create missing catering items from Square products
    const missingItemsResult = await syncMissingCateringItemsFromSquare();

    // Step 3: Verify images if we updated any
    if (syncResult.updated > 0 || missingItemsResult.created > 0) {
      await verifyImageUrls();
    }

    logger.info('✅ Catering images sync completed successfully!');
  } catch (error) {
    logger.error('❌ Fatal error in catering images sync:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { syncCateringImages, verifyImageUrls, syncMissingCateringItemsFromSquare };
