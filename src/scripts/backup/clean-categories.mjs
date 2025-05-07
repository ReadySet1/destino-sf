// src/scripts/clean-categories.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import readline from 'readline';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma
const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask a question and get user input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Basic logger
const logger = {
  info: (...args) => console.log(new Date().toISOString(), 'INFO:', ...args),
  error: (...args) => console.error(new Date().toISOString(), 'ERROR:', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), 'WARN:', ...args)
};

// Get all empty categories
async function getEmptyCategories() {
  try {
    // Get all categories
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    
    // Filter for empty categories
    const emptyCategories = categories.filter(category => category._count.products === 0);
    logger.info(`Found ${emptyCategories.length} empty categories out of ${categories.length} total categories`);
    
    return emptyCategories;
  } catch (error) {
    logger.error('Error getting empty categories:', error);
    return [];
  }
}

// Find duplicate categories (same name with different case or trailing/leading spaces)
async function findDuplicateCategories() {
  try {
    const categories = await prisma.category.findMany();
    
    // Create a map of normalized names to categories
    const normalizedMap = new Map();
    const duplicates = [];
    
    categories.forEach(category => {
      const normalizedName = category.name.trim().toLowerCase();
      
      if (normalizedMap.has(normalizedName)) {
        normalizedMap.get(normalizedName).push(category);
      } else {
        normalizedMap.set(normalizedName, [category]);
      }
    });
    
    // Find all keys with more than one entry
    for (const [normalizedName, categoriesArray] of normalizedMap.entries()) {
      if (categoriesArray.length > 1) {
        duplicates.push({
          normalizedName,
          categories: categoriesArray
        });
      }
    }
    
    logger.info(`Found ${duplicates.length} duplicate category groups`);
    return duplicates;
  } catch (error) {
    logger.error('Error finding duplicate categories:', error);
    return [];
  }
}

// Delete empty categories
async function deleteEmptyCategories(emptyCategories) {
  try {
    // Format categories for display
    const formattedCategories = emptyCategories.map(cat => 
      `${cat.id} - ${cat.name} (${cat._count.products} products)`)
      .join('\n');
    
    console.log('\nEmpty categories to delete:');
    console.log(formattedCategories);
    
    const shouldDelete = await question('\nDelete these empty categories? (y/n): ');
    
    if (shouldDelete.toLowerCase() === 'y') {
      // Delete all empty categories
      const deletePromises = emptyCategories.map(category => 
        prisma.category.delete({
          where: { id: category.id }
        })
      );
      
      const result = await Promise.all(deletePromises);
      logger.info(`Successfully deleted ${result.length} empty categories`);
    } else {
      logger.info('No categories were deleted.');
    }
  } catch (error) {
    logger.error('Error deleting empty categories:', error);
  }
}

// Merge duplicate categories
async function mergeDuplicateCategories(duplicateGroups) {
  try {
    for (const group of duplicateGroups) {
      console.log(`\nDuplicate group for "${group.normalizedName}":`);
      
      // Format categories for display
      group.categories.forEach((cat, index) => {
        console.log(`${index + 1}. ID: ${cat.id} - Name: "${cat.name}"`);
      });
      
      // Ask which one to keep
      const keepIndex = await question('\nWhich one do you want to keep? (enter number, or 0 to skip): ');
      const keepIndexNum = parseInt(keepIndex, 10);
      
      if (keepIndexNum === 0 || isNaN(keepIndexNum) || keepIndexNum > group.categories.length) {
        logger.info('Skipping this group...');
        continue;
      }
      
      // Category to keep (1-based index from user)
      const keepCategory = group.categories[keepIndexNum - 1];
      
      // Categories to merge and delete
      const categoriesToMerge = group.categories.filter(cat => cat.id !== keepCategory.id);
      
      // For each category to merge
      for (const catToMerge of categoriesToMerge) {
        // Find all products that reference the category to merge
        const products = await prisma.product.findMany({
          where: { categoryId: catToMerge.id }
        });
        
        logger.info(`Moving ${products.length} products from "${catToMerge.name}" to "${keepCategory.name}"`);
        
        // Update all products to reference the category to keep
        if (products.length > 0) {
          await prisma.product.updateMany({
            where: { categoryId: catToMerge.id },
            data: { categoryId: keepCategory.id }
          });
        }
        
        // Delete the merged category
        await prisma.category.delete({
          where: { id: catToMerge.id }
        });
        
        logger.info(`Deleted category "${catToMerge.name}"`);
      }
    }
  } catch (error) {
    logger.error('Error merging duplicate categories:', error);
  }
}

// Main function
async function main() {
  try {
    logger.info('Starting category cleanup process...');
    
    // Find empty categories
    const emptyCategories = await getEmptyCategories();
    
    if (emptyCategories.length > 0) {
      await deleteEmptyCategories(emptyCategories);
    } else {
      logger.info('No empty categories found.');
    }
    
    // Find duplicate categories
    const duplicateGroups = await findDuplicateCategories();
    
    if (duplicateGroups.length > 0) {
      await mergeDuplicateCategories(duplicateGroups);
    } else {
      logger.info('No duplicate categories found.');
    }
    
    logger.info('Category cleanup completed.');
  } catch (error) {
    logger.error('Error in category cleanup process:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main(); 