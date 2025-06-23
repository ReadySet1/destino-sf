#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting catering data cleanup...');

  try {
    // Delete all catering order items first (foreign key constraint)
    await prisma.cateringOrderItem.deleteMany();
    console.log('✅ Deleted all catering order items');

    // Delete all catering orders
    await prisma.cateringOrder.deleteMany();
    console.log('✅ Deleted all catering orders');

    // Delete all catering package items
    await prisma.cateringPackageItem.deleteMany();
    console.log('✅ Deleted all catering package items');

    // Delete all catering ratings
    await prisma.cateringRating.deleteMany();
    console.log('✅ Deleted all catering ratings');

    // Delete all catering items
    await prisma.cateringItem.deleteMany();
    console.log('✅ Deleted all catering items');

    // Delete all catering packages
    await prisma.cateringPackage.deleteMany();
    console.log('✅ Deleted all catering packages');

    console.log('🎉 Catering data cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error cleaning catering data:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 