#!/usr/bin/env tsx

/**
 * Script to check the current state of dessert images in the catering system
 * This verifies that all dessert items have proper imageUrl values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DessertImageStatus {
  name: string;
  id: string;
  imageUrl: string | null;
  hasImage: boolean;
  imageType: 'S3' | 'Local' | 'None';
}

async function checkDessertImages() {
  console.log('🍰 Checking dessert images in catering system...\n');

  try {
    // Fetch all dessert items from the database
    const dessertItems = await prisma.cateringItem.findMany({
      where: {
        category: 'DESSERT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        description: true,
        price: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Found ${dessertItems.length} active dessert items:\n`);

    const status: DessertImageStatus[] = dessertItems.map(item => {
      const hasImage = !!item.imageUrl;
      let imageType: 'S3' | 'Local' | 'None' = 'None';

      if (hasImage) {
        if (item.imageUrl!.includes('amazonaws.com') || item.imageUrl!.includes('s3.')) {
          imageType = 'S3';
        } else if (item.imageUrl!.startsWith('/')) {
          imageType = 'Local';
        }
      }

      return {
        name: item.name,
        id: item.id,
        imageUrl: item.imageUrl,
        hasImage,
        imageType,
      };
    });

    // Display results
    console.log('📊 DESSERT IMAGE STATUS');
    console.log('========================');

    status.forEach((item, index) => {
      const statusIcon = item.hasImage ? '✅' : '❌';
      const typeLabel = item.imageType === 'None' ? '' : ` (${item.imageType})`;

      console.log(`${index + 1}. ${statusIcon} ${item.name}${typeLabel}`);
      if (item.hasImage && item.imageUrl) {
        console.log(`   URL: ${item.imageUrl}`);
      }
      console.log('');
    });

    // Summary statistics
    const totalItems = status.length;
    const itemsWithImages = status.filter(item => item.hasImage).length;
    const s3Images = status.filter(item => item.imageType === 'S3').length;
    const localImages = status.filter(item => item.imageType === 'Local').length;
    const missingImages = status.filter(item => !item.hasImage).length;

    console.log('📈 SUMMARY');
    console.log('===========');
    console.log(`Total dessert items: ${totalItems}`);
    console.log(
      `Items with images: ${itemsWithImages}/${totalItems} (${Math.round((itemsWithImages / totalItems) * 100)}%)`
    );
    console.log(`S3 images: ${s3Images}`);
    console.log(`Local images: ${localImages}`);
    console.log(`Missing images: ${missingImages}`);

    if (missingImages > 0) {
      console.log('\n🚨 ITEMS MISSING IMAGES');
      console.log('========================');
      status
        .filter(item => !item.hasImage)
        .forEach(item => {
          console.log(`- ${item.name} (ID: ${item.id})`);
        });

      console.log('\n💡 RECOMMENDED ACTION');
      console.log('=====================');
      console.log('Run the dessert image fix script to assign images to missing items.');
    } else {
      console.log(
        '\n🎉 All dessert items have images! The catering system should display properly.'
      );
    }

    // Check if there are any products in the database that could provide images
    console.log('\n🔍 CHECKING AVAILABLE PRODUCT IMAGES');
    console.log('=====================================');

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'alfajor', mode: 'insensitive' } },
          { name: { contains: 'brownie', mode: 'insensitive' } },
          { name: { contains: 'cupcake', mode: 'insensitive' } },
          { name: { contains: 'lemon bar', mode: 'insensitive' } },
          { name: { contains: 'dessert', mode: 'insensitive' } },
        ],
      },
      select: {
        name: true,
        images: true,
      },
    });

    console.log(`Found ${products.length} products that could provide dessert images:`);
    products.forEach(product => {
      const imageCount = product.images ? product.images.length : 0;
      console.log(`- ${product.name}: ${imageCount} images`);
      if (imageCount > 0 && product.images) {
        product.images.forEach((img, idx) => {
          console.log(`  ${idx + 1}. ${img}`);
        });
      }
    });
  } catch (error) {
    console.error('❌ Error checking dessert images:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDessertImages();
