#!/usr/bin/env tsx

/**
 * Script to fix dessert images by updating them to use proper S3 images from the products table
 * This replaces broken local image paths with working S3 URLs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ImageMapping {
  cateringItemName: string;
  productName: string;
  s3ImageUrl: string;
}

async function fixDessertImages() {
  console.log('🔧 Fixing dessert images in catering system...\n');

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
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Found ${dessertItems.length} dessert items to check\n`);

    // Fetch products that could provide dessert images
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

    console.log(`Found ${products.length} products with images that could be used for desserts\n`);

    // Create mappings between catering items and products
    const mappings: ImageMapping[] = [];

    // Define specific mappings for better matching
    const itemToProductMap: Record<string, string> = {
      'Alfajores - Classic': 'classic alfajores',
      'Alfajores - Chocolate': 'chocolate alfajores',
      'Alfajores - Lemon': 'lemon alfajores',
      'Alfajores - Gluten-Free': 'gluten-free alfajores',
      'Mini Cupcakes': 'mini cupcakes',
      'Brownie Bites': 'brownie bites',
      'Lemon Bars': 'lemon bars',
    };

    // Find matching products for each dessert item
    for (const item of dessertItems) {
      const targetProductName = itemToProductMap[item.name];

      if (targetProductName) {
        const matchingProduct = products.find(
          p => p.name.toLowerCase() === targetProductName.toLowerCase()
        );

        if (matchingProduct && matchingProduct.images && matchingProduct.images.length > 0) {
          mappings.push({
            cateringItemName: item.name,
            productName: matchingProduct.name,
            s3ImageUrl: matchingProduct.images[0] as string,
          });
        } else {
          console.log(
            `⚠️  No matching product found for: ${item.name} (looking for: ${targetProductName})`
          );
        }
      } else {
        console.log(`⚠️  No mapping defined for: ${item.name}`);
      }
    }

    console.log(`\n📋 Found ${mappings.length} image mappings:`);
    mappings.forEach((mapping, index) => {
      console.log(`${index + 1}. ${mapping.cateringItemName} → ${mapping.productName}`);
      console.log(`   S3 URL: ${mapping.s3ImageUrl}\n`);
    });

    // Update the database with the new image URLs
    let updatedCount = 0;
    let errorCount = 0;

    console.log('🔄 Updating dessert items with S3 images...\n');

    for (const mapping of mappings) {
      try {
        const dessertItem = dessertItems.find(item => item.name === mapping.cateringItemName);

        if (dessertItem) {
          await prisma.cateringItem.update({
            where: { id: dessertItem.id },
            data: {
              imageUrl: mapping.s3ImageUrl,
              updatedAt: new Date(),
            },
          });

          console.log(`✅ Updated ${mapping.cateringItemName} with S3 image`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${mapping.cateringItemName}:`, error);
        errorCount++;
      }
    }

    // Handle items without mappings - use fallback image
    const unmappedItems = dessertItems.filter(
      item => !mappings.some(mapping => mapping.cateringItemName === item.name)
    );

    if (unmappedItems.length > 0) {
      console.log(`\n🔄 Setting fallback images for ${unmappedItems.length} unmapped items...\n`);

      for (const item of unmappedItems) {
        try {
          await prisma.cateringItem.update({
            where: { id: item.id },
            data: {
              imageUrl: '/images/catering/default-item.jpg',
              updatedAt: new Date(),
            },
          });

          console.log(`✅ Set fallback image for ${item.name}`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Error setting fallback for ${item.name}:`, error);
          errorCount++;
        }
      }
    }

    // Final summary
    console.log('\n📊 DESSERT IMAGE FIX SUMMARY');
    console.log('=============================');
    console.log(`Total dessert items: ${dessertItems.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`S3 images applied: ${mappings.length}`);
    console.log(`Fallback images applied: ${unmappedItems.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 All dessert images have been successfully fixed!');
      console.log(
        'The catering system should now display high-quality S3 images for all desserts.'
      );
    } else {
      console.log('\n⚠️  Some errors occurred. Please check the logs above.');
    }
  } catch (error) {
    console.error('❌ Error fixing dessert images:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDessertImages();
