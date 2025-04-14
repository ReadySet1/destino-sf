import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find all test products
    const testProducts = await prisma.product.findMany({
      where: {
        name: {
          startsWith: 'Test'
        }
      }
    });
    
    console.log(`Found ${testProducts.length} test products to remove.`);
    
    // Remove each product from the database
    for (const product of testProducts) {
      console.log(`Removing product: ${product.name} (${product.id})`);
      
      // Delete variants first if needed (in case of foreign key constraints)
      await prisma.variant.deleteMany({
        where: { productId: product.id }
      });
      
      // Delete the product
      await prisma.product.delete({
        where: { id: product.id }
      });
      
      console.log(`Successfully removed product: ${product.name}`);
    }
    
    console.log('All test products have been removed.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 