// src/scripts/clean-invalid-products.mjs
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

// We need to directly import from Node.js modules since we're in an ESM context
// Import Square client dynamically
let squareClient;
async function importSquareClient() {
  try {
    const { default: squareClientModule } = await import('../lib/square/client-adapter.js');
    squareClient = squareClientModule;
    return squareClient;
  } catch (error) {
    console.error('Error importing Square client:', error);
    throw error;
  }
}

// Create a simple logger for this script
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Initialize Prisma client
const prisma = new PrismaClient();

// Main function
async function main() {
  try {
    logger.info('Starting invalid product cleanup...');
    
    // Import Square client
    logger.info('Importing Square client...');
    await importSquareClient();
    if (!squareClient) {
      throw new Error('Failed to import Square client');
    }
    logger.info('Square client imported successfully');
    
    // First get all Square catalog items to know what's valid
    logger.info('Fetching all Square catalog items...');
    const requestBody = {
      object_types: ['ITEM'],
      include_deleted_objects: false
    };
    
    const catalogResponse = await squareClient.catalogApi.searchCatalogObjects(requestBody);
    const validSquareItems = catalogResponse.result?.objects || [];
    
    // Extract valid Square IDs
    const validSquareIds = validSquareItems.map(item => item.id);
    logger.info(`Found ${validSquareIds.length} valid Square catalog items`);
    
    // Get all products from the database
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        squareId: true
      }
    });
    
    logger.info(`Found ${products.length} products in the database`);
    
    // Identify products with invalid Square IDs
    const invalidProducts = products.filter(product => 
      product.squareId && !validSquareIds.includes(product.squareId)
    );
    
    logger.info(`Found ${invalidProducts.length} products with invalid Square IDs`);
    
    if (invalidProducts.length === 0) {
      logger.info('No invalid products found. Database is clean.');
      return;
    }
    
    // List the invalid products
    for (const product of invalidProducts) {
      logger.info(`Invalid product: ${product.name} (${product.id}) - Square ID: ${product.squareId}`);
    }
    
    // Ask for confirmation before proceeding
    logger.info('Options:');
    logger.info('1. Clear invalid Square IDs (set to null)');
    logger.info('2. Delete invalid products entirely');
    logger.info('3. Print list only (no changes)');
    logger.info('');
    logger.info('Please run with environment variable CLEANUP_ACTION=1|2|3 to proceed');
    
    // Check environment variable for action
    const action = process.env.CLEANUP_ACTION;
    
    if (!action) {
      logger.info('No CLEANUP_ACTION specified. Exiting without changes.');
      return;
    }
    
    switch (action) {
      case '1':
        // Clear Square IDs
        logger.info('Clearing invalid Square IDs...');
        for (const product of invalidProducts) {
          await prisma.product.update({
            where: { id: product.id },
            data: { 
              squareId: null,
              updatedAt: new Date()
            }
          });
          logger.info(`Cleared Square ID for product: ${product.name}`);
        }
        logger.info(`Successfully cleared Square IDs for ${invalidProducts.length} products`);
        break;
        
      case '2':
        // Delete products entirely
        logger.info('Deleting invalid products...');
        for (const product of invalidProducts) {
          // First delete associated variants
          await prisma.variant.deleteMany({
            where: { productId: product.id }
          });
          
          // Then delete the product
          await prisma.product.delete({
            where: { id: product.id }
          });
          
          logger.info(`Deleted product: ${product.name}`);
        }
        logger.info(`Successfully deleted ${invalidProducts.length} invalid products`);
        break;
        
      case '3':
        // Just print the list (already done above)
        logger.info('List printed. No changes made.');
        break;
        
      default:
        logger.info(`Unknown action: ${action}. No changes made.`);
    }
    
    logger.info('Cleanup process completed');
  } catch (error) {
    logger.error('Error in cleanup process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error in script:', error);
  process.exit(1);
}); 