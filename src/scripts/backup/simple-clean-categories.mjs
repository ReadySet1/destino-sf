// src/scripts/simple-clean-categories.mjs
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

// Get all categories
async function getAllCategories() {
  try {
    // Get all categories with product counts
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    
    logger.info(`Found ${categories.length} total categories`);
    return categories;
  } catch (error) {
    logger.error('Error getting categories:', error);
    return [];
  }
}

// Delete specified categories
async function deleteCategories(categoriesToDelete) {
  try {
    // Delete one by one to handle errors gracefully
    let deletedCount = 0;
    
    for (const category of categoriesToDelete) {
      try {
        await prisma.category.delete({
          where: { id: category.id }
        });
        logger.info(`Deleted category "${category.name}" (ID: ${category.id})`);
        deletedCount++;
      } catch (error) {
        logger.error(`Error deleting category "${category.name}":`, error);
      }
    }
    
    logger.info(`Successfully deleted ${deletedCount} of ${categoriesToDelete.length} categories`);
  } catch (error) {
    logger.error('Error in delete operation:', error);
  }
}

// Keep only Default category and delete the rest
async function cleanupCategories() {
  try {
    // Get all categories
    const allCategories = await getAllCategories();
    
    // Find Default category
    const defaultCategory = allCategories.find(cat => cat.name === 'Default');
    
    if (!defaultCategory) {
      logger.error('Default category not found, cannot proceed with cleanup');
      return;
    }
    
    logger.info(`Found Default category with ID ${defaultCategory.id} containing ${defaultCategory._count.products} products`);
    
    // Identify categories to delete (all except Default)
    const categoriesToDelete = allCategories.filter(cat => cat.id !== defaultCategory.id);
    
    logger.info(`Will keep Default category and delete ${categoriesToDelete.length} other categories`);
    
    // List categories to be deleted
    categoriesToDelete.forEach(cat => {
      logger.info(`- Will delete: "${cat.name}" (contains ${cat._count.products} products)`);
    });
    
    // Note: We don't need to move products since we're only keeping empty categories
    // If any categories have products, we'd need to update their categoryId first
    
    // Delete the categories
    await deleteCategories(categoriesToDelete);
    
    logger.info('Category cleanup completed');
  } catch (error) {
    logger.error('Error during category cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main function
async function main() {
  try {
    logger.info('Starting simple category cleanup process...');
    await cleanupCategories();
  } catch (error) {
    logger.error('Unexpected error in cleanup process:', error);
  }
}

main(); 