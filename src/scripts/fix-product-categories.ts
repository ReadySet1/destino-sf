import { prisma } from '../lib/db';
import { logger } from '../utils/logger';

async function fixProductCategories() {
  try {
    logger.info('Starting product category fix...');

    // Get the category IDs
    const alfajoresCategory = await prisma.category.findFirst({
      where: { name: 'ALFAJORES' },
    });

    const empanadasCategory = await prisma.category.findFirst({
      where: { name: 'EMPANADAS' },
    });

    if (!alfajoresCategory) {
      throw new Error('ALFAJORES category not found');
    }

    if (!empanadasCategory) {
      throw new Error('EMPANADAS category not found');
    }

    logger.info(`Found ALFAJORES category: ${alfajoresCategory.id}`);
    logger.info(`Found EMPANADAS category: ${empanadasCategory.id}`);

    // Update alfajores products
    const alfajoresResult = await prisma.product.updateMany({
      where: {
        name: {
          contains: 'alfajor',
          mode: 'insensitive',
        },
        categoryId: '738b24dd-4b07-46a0-a561-57ee885c1f24', // Default category
      },
      data: {
        categoryId: alfajoresCategory.id,
        updatedAt: new Date(),
      },
    });

    // Update empanadas products
    const empanadasResult = await prisma.product.updateMany({
      where: {
        name: {
          contains: 'empanada',
          mode: 'insensitive',
        },
        categoryId: '738b24dd-4b07-46a0-a561-57ee885c1f24', // Default category
      },
      data: {
        categoryId: empanadasCategory.id,
        updatedAt: new Date(),
      },
    });

    logger.info(`Updated ${alfajoresResult.count} alfajores products`);
    logger.info(`Updated ${empanadasResult.count} empanadas products`);

    // Verify the changes
    const alfajoresCount = await prisma.product.count({
      where: { categoryId: alfajoresCategory.id },
    });

    const empanadasCount = await prisma.product.count({
      where: { categoryId: empanadasCategory.id },
    });

    const defaultCount = await prisma.product.count({
      where: { categoryId: '738b24dd-4b07-46a0-a561-57ee885c1f24' },
    });

    logger.info(`Final counts:`);
    logger.info(`- ALFAJORES category: ${alfajoresCount} products`);
    logger.info(`- EMPANADAS category: ${empanadasCount} products`);
    logger.info(`- Default category: ${defaultCount} products`);

    logger.info('Product category fix completed successfully!');
  } catch (error) {
    logger.error('Error fixing product categories:', error);
    throw error;
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixProductCategories()
    .then(() => {
      console.log('Category fix completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Category fix failed:', error);
      process.exit(1);
    });
}

export { fixProductCategories };
