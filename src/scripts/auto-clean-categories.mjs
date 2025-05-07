// src/scripts/auto-clean-categories.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma
const prisma = new PrismaClient();

// Basic logger
const logger = {
  info: (...args) => console.log(new Date().toISOString(), 'INFO:', ...args),
  error: (...args) => console.error(new Date().toISOString(), 'ERROR:', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), 'WARN:', ...args)
};

// Create or get default category
async function ensureDefaultCategory() {
  try {
    // Check for existing Default category
    let defaultCategory = await prisma.category.findFirst({
      where: { name: 'Default' }
    });

    // Create Default category if not found
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: 'Default',
          slug: 'default',
          description: 'Default product category'
        }
      });
      logger.info(`Created new Default category with ID: ${defaultCategory.id}`);
    } else {
      logger.info(`Found existing Default category with ID: ${defaultCategory.id}`);
    }

    return defaultCategory;
  } catch (error) {
    logger.error('Error ensuring Default category exists:', error);
    throw error;
  }
}

// Move all products to the Default category
async function moveAllProductsToDefault(defaultCategoryId) {
  try {
    // Find all products not already in Default category
    const productCount = await prisma.product.count({
      where: {
        categoryId: {
          not: defaultCategoryId
        }
      }
    });

    logger.info(`Found ${productCount} products to move to Default category`);

    // Update all products to reference Default category
    if (productCount > 0) {
      await prisma.product.updateMany({
        where: {
          categoryId: {
            not: defaultCategoryId
          }
        },
        data: {
          categoryId: defaultCategoryId
        }
      });
      logger.info(`Moved ${productCount} products to Default category`);
    }
  } catch (error) {
    logger.error('Error moving products to Default category:', error);
    throw error;
  }
}

// Delete all categories except Default
async function deleteOtherCategories(defaultCategoryId) {
  try {
    // Get all categories except Default
    const categories = await prisma.category.findMany({
      where: {
        id: {
          not: defaultCategoryId
        }
      }
    });

    logger.info(`Found ${categories.length} other categories to delete`);

    // Delete them all
    if (categories.length > 0) {
      const result = await prisma.category.deleteMany({
        where: {
          id: {
            not: defaultCategoryId
          }
        }
      });
      logger.info(`Deleted ${result.count} categories`);
    }
  } catch (error) {
    logger.error('Error deleting categories:', error);
    throw error;
  }
}

// Main function to clean up categories
async function cleanupCategories() {
  try {
    logger.info('Starting automatic category cleanup process...');

    // Step 1: Ensure Default category exists
    const defaultCategory = await ensureDefaultCategory();

    // Step 2: Move all products to Default category
    await moveAllProductsToDefault(defaultCategory.id);

    // Step 3: Delete all other categories
    await deleteOtherCategories(defaultCategory.id);

    logger.info('Category cleanup completed successfully!');
  } catch (error) {
    logger.error('Error in category cleanup process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanupCategories(); 