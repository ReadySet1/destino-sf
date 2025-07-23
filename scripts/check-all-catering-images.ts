import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductWithImages {
  id: string;
  name: string;
  images: string[];
  squareId: string;
}

interface CateringItemWithImages {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  squareProductId: string | null;
  price: any; // Decimal type from Prisma
}

async function checkAllCateringImages() {
  console.log('🔍 Checking ALL catering items images...\n');

  try {
    // Get all catering items
    const cateringItems = (await prisma.cateringItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })) as CateringItemWithImages[];

    // Get all products that could have images
    const products = (await prisma.product.findMany({
      where: {
        active: true,
        images: { isEmpty: false },
      },
      select: {
        id: true,
        name: true,
        images: true,
        squareId: true,
      },
    })) as ProductWithImages[];

    console.log(`Found ${cateringItems.length} active catering items`);
    console.log(`Found ${products.length} products with images\n`);

    // Group by category for better analysis
    const categories = new Map<string, CateringItemWithImages[]>();

    cateringItems.forEach(item => {
      if (!categories.has(item.category)) {
        categories.set(item.category, []);
      }
      categories.get(item.category)!.push(item);
    });

    let totalItems = 0;
    let itemsWithImages = 0;
    let itemsWithS3Images = 0;
    let missingImages: CateringItemWithImages[] = [];

    console.log('📊 CATERING IMAGES BY CATEGORY');
    console.log('='.repeat(50));

    for (const [category, items] of categories) {
      console.log(`\n🏷️  ${category} (${items.length} items)`);
      console.log('-'.repeat(30));

      for (const item of items) {
        totalItems++;
        const hasImage = !!item.imageUrl;
        const isS3Image = hasImage && item.imageUrl!.includes('amazonaws.com');

        if (hasImage) {
          itemsWithImages++;
          if (isS3Image) itemsWithS3Images++;
        } else {
          missingImages.push(item);
        }

        const priceDisplay =
          item.price === 0 ? 'FREE (package only)' : `$${Number(item.price).toFixed(2)}`;
        const imageStatus = hasImage ? (isS3Image ? '✅ S3' : '✅ Local') : '❌ Missing';

        console.log(`  ${imageStatus} ${item.name} (${priceDisplay})`);

        if (hasImage) {
          const url = item.imageUrl!;
          if (url.length > 80) {
            console.log(`       ${url.substring(0, 80)}...`);
          } else {
            console.log(`       ${url}`);
          }
        }

        // Check if there's a matching product for this item
        if (!hasImage && item.squareProductId) {
          const matchingProduct = products.find(p => p.squareId === item.squareProductId);
          if (matchingProduct && matchingProduct.images.length > 0) {
            console.log(
              `       🔗 Could use: ${matchingProduct.name} (${matchingProduct.images.length} images)`
            );
          }
        }

        // If no squareProductId, try name matching
        if (!hasImage && !item.squareProductId) {
          const nameMatches = products.filter(p => {
            const itemNameLower = item.name.toLowerCase();
            const productNameLower = p.name.toLowerCase();
            return (
              productNameLower.includes(itemNameLower.split(' ')[0]) ||
              itemNameLower.includes(productNameLower.split(' ')[0])
            );
          });

          if (nameMatches.length > 0) {
            console.log(`       🔍 Possible matches:`);
            nameMatches.slice(0, 3).forEach(match => {
              console.log(`         - ${match.name} (${match.images.length} images)`);
            });
          }
        }
      }
    }

    console.log('\n📈 SUMMARY');
    console.log('='.repeat(20));
    console.log(`Total catering items: ${totalItems}`);
    console.log(
      `Items with images: ${itemsWithImages}/${totalItems} (${Math.round((itemsWithImages / totalItems) * 100)}%)`
    );
    console.log(`S3 images: ${itemsWithS3Images}`);
    console.log(`Local images: ${itemsWithImages - itemsWithS3Images}`);
    console.log(`Missing images: ${missingImages.length}`);

    if (missingImages.length > 0) {
      console.log('\n🚨 ITEMS MISSING IMAGES');
      console.log('='.repeat(30));
      missingImages.forEach(item => {
        console.log(`- ${item.name} (${item.category})`);
        console.log(`  ID: ${item.id}`);
        console.log(`  Price: $${Number(item.price).toFixed(2)}`);
        console.log(`  Square Product ID: ${item.squareProductId || 'None'}`);
        console.log('');
      });
    }

    // Check for specific problematic items mentioned by user
    console.log('\n🔍 CHECKING SPECIFIC ITEMS');
    console.log('='.repeat(30));

    const plantainChips = cateringItems.filter(item =>
      item.name.toLowerCase().includes('plantain chips')
    );

    console.log(`Plantain Chips items found: ${plantainChips.length}`);
    plantainChips.forEach(item => {
      console.log(`- ${item.name}: ${item.imageUrl ? '✅ Has image' : '❌ No image'}`);
      if (item.imageUrl) {
        console.log(`  URL: ${item.imageUrl}`);
      }
    });

    // Check for products that could match plantain chips
    const plantainProducts = products.filter(p => p.name.toLowerCase().includes('plantain'));

    console.log(`\nPlantain products found: ${plantainProducts.length}`);
    plantainProducts.forEach(product => {
      console.log(`- ${product.name} (${product.images.length} images)`);
      if (product.images.length > 0) {
        console.log(`  First image: ${product.images[0]}`);
      }
    });
  } catch (error) {
    console.error('❌ Error checking catering images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllCateringImages().catch(console.error);
