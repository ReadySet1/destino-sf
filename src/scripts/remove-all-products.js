// src/scripts/remove-all-products.js
// @ts-check
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Delete all variants first to avoid foreign key constraints
    console.log('Deleting all product variants...');
    await prisma.variant.deleteMany({});
    
    // Delete all products
    console.log('Deleting all products...');
    const { count } = await prisma.product.deleteMany({});
    
    console.log(`Successfully removed ${count} products`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();