#!/usr/bin/env tsx

/**
 * Sync S3 images from Square items (SIDE category) to package items (STARTER category)
 * This ensures appetizer package items show the real Square images instead of local fallbacks
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ImageCopyResult {
  copied: number;
  notFound: number;
  errors: number;
  details: Array<{
    starterItem: string;
    sideItem?: string;
    action: 'copied' | 'not_found' | 'error';
    imageUrl?: string;
  }>;
}

async function syncImagesFromSquareItems(): Promise<ImageCopyResult> {
  console.log('🔄 Syncing S3 images from Square items to package items...\n');

  const result: ImageCopyResult = {
    copied: 0,
    notFound: 0,
    errors: 0,
    details: []
  };

  try {
    // Get all STARTER items (package items) that have local images
    const starterItems = await prisma.cateringItem.findMany({
      where: {
        category: 'STARTER',
        isActive: true,
        imageUrl: { startsWith: '/images/' } // Only local images
      },
      select: { id: true, name: true, imageUrl: true }
    });

    // Get all SIDE items with S3 images
    const sideItems = await prisma.cateringItem.findMany({
      where: {
        category: 'SIDE',
        isActive: true,
        imageUrl: { contains: 's3' }
      },
      select: { name: true, imageUrl: true }
    });

    console.log(`📊 Found ${starterItems.length} STARTER items with local images`);
    console.log(`📊 Found ${sideItems.length} SIDE items with S3 images\n`);

    // Create a map for easy lookup
    const sideItemsMap = new Map(
      sideItems.map(item => [item.name.toLowerCase().trim(), item])
    );

    for (const starterItem of starterItems) {
      try {
        const starterName = starterItem.name.toLowerCase().trim();
        
        // Try exact match first
        let matchingSideItem = sideItemsMap.get(starterName);
        
        // If no exact match, try fuzzy matching
        if (!matchingSideItem) {
          // Remove common prefixes/suffixes and try again
          const cleanName = starterName
            .replace(/^(empanada - |pan con |)/g, '')
            .replace(/(s)$/g, ''); // remove plural 's'
          
          matchingSideItem = sideItemsMap.get(cleanName);
          
          // Try partial matching
          if (!matchingSideItem) {
            for (const [sideName, sideItem] of sideItemsMap) {
              if (sideName.includes(cleanName) || cleanName.includes(sideName)) {
                matchingSideItem = sideItem;
                break;
              }
            }
          }
        }

        if (matchingSideItem && matchingSideItem.imageUrl) {
          // Copy the S3 image URL
          await prisma.cateringItem.update({
            where: { id: starterItem.id },
            data: { imageUrl: matchingSideItem.imageUrl }
          });

          console.log(`✅ ${starterItem.name} → copied from ${matchingSideItem.name}`);
          console.log(`   ${matchingSideItem.imageUrl.substring(0, 60)}...\n`);
          
          result.copied++;
          result.details.push({
            starterItem: starterItem.name,
            sideItem: matchingSideItem.name,
            action: 'copied',
            imageUrl: matchingSideItem.imageUrl
          });
        } else {
          console.log(`⚠️  ${starterItem.name} → no matching Square item found`);
          result.notFound++;
          result.details.push({
            starterItem: starterItem.name,
            action: 'not_found'
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${starterItem.name}:`, error);
        result.errors++;
        result.details.push({
          starterItem: starterItem.name,
          action: 'error'
        });
      }
    }

    console.log(`\n📊 Image Sync Summary:`);
    console.log(`   ✅ Copied: ${result.copied}`);
    console.log(`   ⚠️  Not found: ${result.notFound}`);
    console.log(`   ❌ Errors: ${result.errors}`);

    return result;

  } catch (error) {
    console.error('❌ Failed to sync images:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
syncImagesFromSquareItems()
  .then((result) => {
    console.log('\n🎉 Image sync completed!');
    
    if (result.copied > 0) {
      console.log(`\n🔄 Refresh your browser to see the real Square images!`);
    }
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });