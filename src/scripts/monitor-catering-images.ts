#!/usr/bin/env tsx

/**
 * Catering Images Monitoring Script
 * 
 * This script monitors catering items for missing images and provides
 * detailed reporting for production environments. It can be run as a
 * health check or scheduled via cron to ensure catering items always
 * have images.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

interface MonitoringReport {
  totalItems: number;
  itemsWithImages: number;
  itemsWithoutImages: number;
  itemsWithSquareId: number;
  itemsWithoutSquareId: number;
  missingImageItems: Array<{
    id: string;
    name: string;
    category: string;
    hasSquareId: boolean;
    squareProductId?: string;
  }>;
  healthScore: number; // percentage of items with images
  recommendations: string[];
}

/**
 * Generate comprehensive monitoring report for catering images
 */
async function generateCateringImagesReport(): Promise<MonitoringReport> {
  try {
    logger.info('🔍 Generating catering images monitoring report...');

    // Get all active catering items
    const allItems = await prisma.cateringItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        imageUrl: true,
        squareProductId: true
      }
    });

    const totalItems = allItems.length;
    const itemsWithImages = allItems.filter(item => item.imageUrl && item.imageUrl.trim() !== '').length;
    const itemsWithoutImages = totalItems - itemsWithImages;
    const itemsWithSquareId = allItems.filter(item => item.squareProductId).length;
    const itemsWithoutSquareId = totalItems - itemsWithSquareId;

    const missingImageItems = allItems
      .filter(item => !item.imageUrl || item.imageUrl.trim() === '')
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        hasSquareId: !!item.squareProductId,
        squareProductId: item.squareProductId || undefined
      }));

    const healthScore = totalItems > 0 ? Math.round((itemsWithImages / totalItems) * 100) : 100;

    // Generate recommendations based on the data
    const recommendations: string[] = [];
    
    if (healthScore < 80) {
      recommendations.push('🚨 URGENT: Health score below 80%. Run image sync immediately.');
    } else if (healthScore < 95) {
      recommendations.push('⚠️  WARNING: Health score below 95%. Consider running image sync.');
    }

    if (itemsWithoutSquareId > 0) {
      recommendations.push(`📝 INFO: ${itemsWithoutSquareId} items don't have Square product IDs. These may be custom items.`);
    }

    if (missingImageItems.filter(item => item.hasSquareId).length > 0) {
      recommendations.push('🔄 SYNC: Some items with Square IDs are missing images. Run sync-catering-images script.');
    }

    if (missingImageItems.filter(item => !item.hasSquareId).length > 0) {
      recommendations.push('📸 MANUAL: Some custom items need manually assigned images.');
    }

    return {
      totalItems,
      itemsWithImages,
      itemsWithoutImages,
      itemsWithSquareId,
      itemsWithoutSquareId,
      missingImageItems,
      healthScore,
      recommendations
    };

  } catch (error) {
    logger.error('Error generating monitoring report:', error);
    throw error;
  }
}

/**
 * Check if there are Square products without corresponding catering items
 */
async function checkMissingCateringItems(): Promise<{
  squareProductsWithoutCateringItems: number;
  exampleProducts: Array<{ name: string; squareId: string; category: string }>;
}> {
  try {
    logger.info('🔍 Checking for Square products without catering items...');

    // Get all catering category products from Square sync
    const cateringProducts = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            contains: 'CATERING',
            mode: 'insensitive'
          }
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    // Check which ones don't have catering items
    const productsWithoutCateringItems = [];
    for (const product of cateringProducts) {
      const existingCateringItem = await prisma.cateringItem.findFirst({
        where: {
          squareProductId: product.squareId
        }
      });

      if (!existingCateringItem) {
        productsWithoutCateringItems.push({
          name: product.name,
          squareId: product.squareId || '',
          category: product.category?.name || 'Unknown'
        });
      }
    }

    return {
      squareProductsWithoutCateringItems: productsWithoutCateringItems.length,
      exampleProducts: productsWithoutCateringItems.slice(0, 5) // Show first 5 as examples
    };

  } catch (error) {
    logger.error('Error checking missing catering items:', error);
    return {
      squareProductsWithoutCateringItems: 0,
      exampleProducts: []
    };
  }
}

/**
 * Validate existing image URLs
 */
async function validateImageUrls(): Promise<{
  validUrls: number;
  invalidUrls: number;
  brokenUrls: Array<{ itemName: string; url: string; error: string }>;
}> {
  try {
    logger.info('🔍 Validating catering item image URLs...');

    const itemsWithImages = await prisma.cateringItem.findMany({
      where: {
        isActive: true,
        imageUrl: {
          not: null
        }
      },
      select: {
        name: true,
        imageUrl: true
      }
    });

    let validUrls = 0;
    let invalidUrls = 0;
    const brokenUrls: Array<{ itemName: string; url: string; error: string }> = [];

    for (const item of itemsWithImages) {
      if (!item.imageUrl) continue;

      try {
        // Basic URL validation
        new URL(item.imageUrl.startsWith('/') ? `https://example.com${item.imageUrl}` : item.imageUrl);
        
        // Check for known good patterns
        if (item.imageUrl.includes('items-images-production.s3') || 
            item.imageUrl.includes('squarecdn.com') ||
            item.imageUrl.startsWith('/images/') ||
            item.imageUrl.includes('square-marketplace')) {
          validUrls++;
        } else {
          invalidUrls++;
          brokenUrls.push({
            itemName: item.name,
            url: item.imageUrl,
            error: 'Unknown URL pattern'
          });
        }
      } catch (urlError) {
        invalidUrls++;
        brokenUrls.push({
          itemName: item.name,
          url: item.imageUrl,
          error: 'Invalid URL format'
        });
      }
    }

    return {
      validUrls,
      invalidUrls,
      brokenUrls: brokenUrls.slice(0, 10) // Show first 10 broken URLs
    };

  } catch (error) {
    logger.error('Error validating image URLs:', error);
    return {
      validUrls: 0,
      invalidUrls: 0,
      brokenUrls: []
    };
  }
}

/**
 * Main monitoring function
 */
async function monitorCateringImages(): Promise<void> {
  try {
    logger.info('🚀 Starting catering images monitoring...');

    // Generate main report
    const report = await generateCateringImagesReport();
    
    // Check for missing catering items
    const missingItems = await checkMissingCateringItems();
    
    // Validate existing URLs
    const urlValidation = await validateImageUrls();

    // Output comprehensive report
    logger.info('\n📊 CATERING IMAGES MONITORING REPORT');
    logger.info('=====================================');
    logger.info(`📈 Health Score: ${report.healthScore}%`);
    logger.info(`📦 Total Active Items: ${report.totalItems}`);
    logger.info(`✅ Items with Images: ${report.itemsWithImages}`);
    logger.info(`❌ Items without Images: ${report.itemsWithoutImages}`);
    logger.info(`🔗 Items with Square ID: ${report.itemsWithSquareId}`);
    logger.info(`🚫 Items without Square ID: ${report.itemsWithoutSquareId}`);
    
    if (report.missingImageItems.length > 0) {
      logger.info(`\n❌ ITEMS MISSING IMAGES (${report.missingImageItems.length}):`);
      report.missingImageItems.slice(0, 10).forEach(item => {
        const squareInfo = item.hasSquareId ? `(Square ID: ${item.squareProductId})` : '(No Square ID)';
        logger.info(`   • ${item.name} [${item.category}] ${squareInfo}`);
      });
      if (report.missingImageItems.length > 10) {
        logger.info(`   ... and ${report.missingImageItems.length - 10} more`);
      }
    }

    if (missingItems.squareProductsWithoutCateringItems > 0) {
      logger.info(`\n🔄 SQUARE PRODUCTS WITHOUT CATERING ITEMS (${missingItems.squareProductsWithoutCateringItems}):`);
      missingItems.exampleProducts.forEach(product => {
        logger.info(`   • ${product.name} [${product.category}] (Square ID: ${product.squareId})`);
      });
      if (missingItems.squareProductsWithoutCateringItems > 5) {
        logger.info(`   ... and ${missingItems.squareProductsWithoutCateringItems - 5} more`);
      }
    }

    logger.info(`\n🔗 URL VALIDATION:`);
    logger.info(`   ✅ Valid URLs: ${urlValidation.validUrls}`);
    logger.info(`   ❌ Invalid URLs: ${urlValidation.invalidUrls}`);
    
    if (urlValidation.brokenUrls.length > 0) {
      logger.info(`\n❌ BROKEN URLS:`);
      urlValidation.brokenUrls.forEach(broken => {
        logger.info(`   • ${broken.itemName}: ${broken.url} (${broken.error})`);
      });
    }

    if (report.recommendations.length > 0) {
      logger.info(`\n💡 RECOMMENDATIONS:`);
      report.recommendations.forEach(rec => {
        logger.info(`   ${rec}`);
      });
    }

    // Add commands to fix issues
    logger.info(`\n🛠️  FIX COMMANDS:`);
    if (report.itemsWithoutImages > 0) {
      logger.info(`   pnpm tsx src/scripts/sync-catering-images.ts`);
    }
    if (missingItems.squareProductsWithoutCateringItems > 0) {
      logger.info(`   pnpm tsx src/scripts/sync-catering-images.ts  # Also creates missing items`);
    }
    logger.info(`   pnpm tsx src/scripts/monitor-catering-images.ts  # Re-run this monitor`);

    // Exit with appropriate code for CI/CD systems
    if (report.healthScore < 80) {
      logger.error('🚨 Critical health score. Exiting with error code.');
      process.exit(1);
    } else if (report.healthScore < 95) {
      logger.warn('⚠️  Low health score. Consider running fixes.');
      process.exit(0);
    } else {
      logger.info('✅ All systems healthy!');
      process.exit(0);
    }

  } catch (error) {
    logger.error('❌ Fatal error in monitoring:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions for use in other scripts
export {
  generateCateringImagesReport,
  checkMissingCateringItems,
  validateImageUrls,
  monitorCateringImages
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  monitorCateringImages();
} 