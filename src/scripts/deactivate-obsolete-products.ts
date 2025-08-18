// src/scripts/deactivate-obsolete-products.ts

import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace for types
import { squareClient } from '@/lib/square/client'; // Ensure this client has catalogApi.searchCatalogObjects
import { logger } from '@/utils/logger';

// Define a basic type for the Square catalog object based on usage
interface SquareCatalogObject {
  type: string;
  id: string;
  // Add other properties if needed
}

// Define the expected structure of the search response
interface SquareSearchResponse {
  result?: {
    objects?: SquareCatalogObject[];
    cursor?: string;
  };
}

const prisma = new PrismaClient();

/**
 * Fetches all item IDs from the configured Square environment (should be Sandbox).
 * Uses searchCatalogObjects with pagination.
 */
async function getSquareItemIds(): Promise<Set<string>> {
  logger.info('Fetching all item IDs from Square using searchCatalogObjects with pagination...');
  const squareItemIds = new Set<string>();
  let cursor: string | undefined = undefined;
  let pageNum = 1;
  const maxPages = 20; // Safety break to prevent infinite loops

  try {
    if (!squareClient.catalogApi?.searchCatalogObjects) {
      throw new Error(
        'squareClient.catalogApi.searchCatalogObjects is not available. Check client setup.'
      );
    }

    do {
      logger.info(`Fetching page ${pageNum} of Square items...`);
      const requestBody = {
        object_types: ['ITEM'],
        limit: 100, // Fetch 100 items per page
        cursor: cursor,
      };

      const response: SquareSearchResponse =
        await squareClient.catalogApi.searchCatalogObjects(requestBody);
      const objects = response.result?.objects;

      if (objects && objects.length > 0) {
        logger.info(`Found ${objects.length} items on this page.`);
        objects.forEach((obj: SquareCatalogObject) => {
          if (obj.type === 'ITEM') {
            // Double-check type just in case
            squareItemIds.add(obj.id);
          }
        });
      } else {
        logger.info('No items found on this page.');
      }

      cursor = response.result?.cursor;
      pageNum++;

      if (cursor) {
        logger.debug(`Next cursor found: ${cursor}`);
      } else {
        logger.info('No more pages found.');
      }

      // Safety break
      if (pageNum > maxPages) {
        logger.warn(
          `Reached max page limit (${maxPages}), stopping pagination. If you have more items, increase the limit.`
        );
        break;
      }
    } while (cursor);

    logger.info(`Finished fetching. Found ${squareItemIds.size} total unique item IDs in Square.`);
    if (squareItemIds.size === 0) {
      logger.warn(
        'Warning: No items found in Square. Ensure the Square client is configured correctly and the environment (Sandbox) has items.'
      );
    }
    return squareItemIds;
  } catch (error) {
    logger.error('Error fetching Square catalog IDs via search:', error);
    throw new Error('Failed to fetch Square IDs via search');
  }
}

/**
 * Fetches all Square IDs currently stored in the Product table.
 * Filters out null squareIds in memory due to Prisma validation issues.
 * @returns A Map where keys are squareIds and values are internal product IDs.
 */
async function getDatabaseSquareIds(): Promise<Map<string, string>> {
  // Map<squareId, productId>
  logger.info('Fetching all potential Square IDs from database (will filter nulls in memory)...');
  try {
    // Fetch all products, select relevant fields
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        squareId: true,
        active: true, // Also select active status for logging
      },
      // No WHERE clause here to avoid Prisma validation error on null checks
    });

    logger.info(`Fetched ${allProducts.length} total products from database.`);

    // Filter out products with null squareId in memory
    const productsWithSquareId = allProducts.filter(p => p.squareId !== null);

    logger.info(
      `Filtered down to ${productsWithSquareId.length} products with non-null Square IDs.`
    );

    const dbIdMap = new Map<string, string>();
    let activeProductsWithSquareId = 0;
    productsWithSquareId.forEach(p => {
      // Now we know p.squareId is not null
      if (p.squareId) {
        // Still good practice to check
        dbIdMap.set(p.squareId, p.id);
        if (p.active) {
          activeProductsWithSquareId++;
        }
      }
    });
    logger.info(
      `Built map with ${dbIdMap.size} unique Square IDs (${activeProductsWithSquareId} currently active).`
    );
    return dbIdMap;
  } catch (error) {
    // Keep previous error logging
    if (error instanceof Prisma.PrismaClientValidationError) {
      logger.error('Prisma Validation Error fetching database Square IDs:', error.message);
    } else {
      logger.error('Error fetching database Square IDs:', error);
    }
    throw new Error('Failed to fetch database IDs');
  }
}

// Protections removed - sync process should handle active status correctly

/**
 * Main function to find and deactivate obsolete products.
 */
async function deactivateObsoleteProducts() {
  logger.info('Starting deactivation process for obsolete products...');
  try {
    const squareItemIds = await getSquareItemIds();
    const dbIdMap = await getDatabaseSquareIds();

    const obsoleteSquareIds: string[] = [];
    dbIdMap.forEach((productId, squareId) => {
      if (!squareItemIds.has(squareId)) {
        // This squareId exists in DB but not in the current Square environment (Sandbox)
        obsoleteSquareIds.push(squareId);
      }
    });

    logger.info(
      `Found ${obsoleteSquareIds.length} potentially obsolete products (present in DB, not in Square).`
    );

    if (obsoleteSquareIds.length === 0) {
      logger.info('No obsolete products found to deactivate.');
      return;
    }

    logger.info('Deactivating obsolete products (setting active=false)...');
    // Update only those products that are currently marked as active
    const result = await prisma.product.updateMany({
      where: {
        squareId: {
          in: obsoleteSquareIds,
        },
        active: true, // Only deactivate products that are currently active
      },
      data: {
        active: false, // Set active to false
        updatedAt: new Date(),
      },
    });

    logger.info(`Successfully deactivated ${result.count} products.`);
    if (result.count < obsoleteSquareIds.length) {
      logger.info(`(${obsoleteSquareIds.length - result.count} products were already inactive).`);
    }
  } catch (error) {
    logger.error('Error during deactivation process:', error);
    process.exitCode = 1; // Indicate failure
  } finally {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected.');
  }
}

// Execute the script
deactivateObsoleteProducts()
  .then(() => {
    logger.info('Deactivation script finished successfully.');
    process.exit(0); // Explicitly exit with success code
  })
  .catch(e => {
    logger.error('Deactivation script failed unexpectedly:', e);
    process.exit(1); // Explicitly exit with failure code
  });
