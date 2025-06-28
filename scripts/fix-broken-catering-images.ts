import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BrokenImageFix {
  itemName: string;
  category: string;
  oldUrl: string;
  newUrl: string;
}

async function fixBrokenCateringImages() {
  console.log('🔧 Fixing broken catering image URLs...\n');

  try {
    // Define the broken URLs and their replacements
    const fixes: BrokenImageFix[] = [
      {
        itemName: 'Cocktail Prawn Platter - Large',
        category: 'STARTER',
        oldUrl: 'https://destino-sf.square.site/uploads/1/3/4/5/134556177/s153623720258963617_p31_i1_w1000.jpeg',
        newUrl: '/images/catering/default-item.jpg' // Use fallback for now
      },
      {
        itemName: 'Cocktail Prawn Platter - Small',
        category: 'STARTER',
        oldUrl: 'https://destino-sf.square.site/uploads/1/3/4/5/134556177/s153623720258963617_p31_i1_w1000.jpeg',
        newUrl: '/images/catering/default-item.jpg' // Use fallback for now
      }
    ];

    // Also remove any other known broken destino-sf.square.site URLs
    const brokenPattern = 'destino-sf.square.site';
    
    // First, find all items with potentially broken URLs
    const itemsWithSquareSiteUrls = await prisma.cateringItem.findMany({
      where: {
        imageUrl: {
          contains: brokenPattern
        }
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        category: true
      }
    });

    console.log(`Found ${itemsWithSquareSiteUrls.length} items with destino-sf.square.site URLs`);

    // Apply specific fixes first
    for (const fix of fixes) {
      const items = await prisma.cateringItem.findMany({
        where: {
          name: fix.itemName,
          category: fix.category,
          imageUrl: fix.oldUrl
        }
      });

      for (const item of items) {
        console.log(`🔧 Fixing: ${item.name}`);
        console.log(`   Old URL: ${fix.oldUrl}`);
        console.log(`   New URL: ${fix.newUrl}`);

        await prisma.cateringItem.update({
          where: { id: item.id },
          data: { imageUrl: fix.newUrl }
        });

        console.log('   ✅ Fixed!\n');
      }
    }

    // For any remaining square.site URLs, set them to null so SafeImage can handle fallbacks
    const remainingSquareSiteItems = await prisma.cateringItem.findMany({
      where: {
        imageUrl: {
          contains: brokenPattern
        }
      }
    });

    console.log(`\n🔧 Setting ${remainingSquareSiteItems.length} remaining square.site URLs to null for fallback handling...`);

    for (const item of remainingSquareSiteItems) {
      console.log(`🔧 Removing broken URL for: ${item.name}`);
      
      await prisma.cateringItem.update({
        where: { id: item.id },
        data: { imageUrl: null }
      });
    }

    console.log('\n✅ All broken image URLs have been fixed!');
    console.log('💡 Items without images will now use fallback images via SafeImage component.');

  } catch (error) {
    console.error('❌ Error fixing catering images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBrokenCateringImages().catch(console.error); 