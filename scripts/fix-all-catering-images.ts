import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductWithImages {
  id: string;
  name: string;
  images: string[];
  squareId: string;
}

interface CateringItemWithDetails {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  squareProductId: string | null;
  price: any;
}

/**
 * Intelligent matching between catering item names and product names
 */
function findBestMatch(
  cateringItemName: string,
  products: ProductWithImages[]
): ProductWithImages | null {
  const itemNameLower = cateringItemName.toLowerCase();

  // Step 1: Try exact match
  let exactMatch = products.find(p => p.name.toLowerCase() === itemNameLower);
  if (exactMatch) return exactMatch;

  // Step 2: Try removing common suffixes/prefixes for size variants
  let cleanItemName = itemNameLower
    .replace(/\s*-\s*(small|large|mini)$/, '')
    .replace(/^(mini|small|large)\s+/, '');

  exactMatch = products.find(p => p.name.toLowerCase() === cleanItemName);
  if (exactMatch) return exactMatch;

  // Step 3: Special mappings for known variations
  const specialMappings: Record<string, string[]> = {
    'plantain chips platter': ['plantain chips platter'],
    'cheese & charcuterie platter': ['cheese & charcuterie platter'],
    'cocktail prawn platter': ['tiger prawns', 'prawn tostada'],
    'alfajores - chocolate': ['alfajores- chocolate', 'chocolate alfajores'],
    'alfajores - classic': ['alfajores- classic', 'classic alfajores'],
    'alfajores - lemon': ['alfajores- lemon', 'lemon alfajores'],
    'alfajores - gluten-free': ['alfajores- gluten free', 'gluten-free alfajores'],
    'mini cupcakes': ['mini cupcakes'],
    'brownie bites': ['brownie bites'],
    'lemon bars': ['lemon bars'],
    'empanada - beef': ['empanadas- argentine beef', 'empanadas- lomo saltado'],
    'empanada - chicken': ['empanadas- huacatay chicken', 'empanadas- peruvian chicken'],
    'empanada - pork': ['empanadas- lomo saltado'],
    'empanada - salmon': ['empanadas- salmon'],
    'empanada - vegetarian': ['vegetarian empanada'],
    'pintxos vegetarianos': ['pintxos vegetarianos'],
    'mt. tam montado': ['mt. tam montado'],
    'quinoa arancini balls': ['quinoa arancini balls'],
    'peruvian ceviche': ['peruvian ceviche'],
    'salmon carpaccio': ['salmon carpaccio'],
    'bocadillo de boquerones': ['bocadillo de boquerones'],
    camotitos: ['camotitos'],
    causa: ['causa'],
    churrasco: ['churrasco'],
    albondigas: ['albondigas'],
    sliders: ['sliders'],
    'tiger prawns': ['tiger prawns'],
    arepas: ['arepas'],
    'tamal verde': ['tamalitos verdes', 'tamal verde empanada'],
  };

  const mapping = specialMappings[cleanItemName];
  if (mapping) {
    for (const searchTerm of mapping) {
      const match = products.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (match && match.images.length > 0) return match;
    }
  }

  // Step 4: Keyword-based matching with scoring
  const keywords = cleanItemName.split(' ').filter(word => word.length > 2);

  let bestMatch: ProductWithImages | null = null;
  let bestScore = 0;

  for (const product of products) {
    if (product.images.length === 0) continue; // Skip products without images

    const productNameLower = product.name.toLowerCase();
    let score = 0;

    // Calculate match score
    for (const keyword of keywords) {
      if (productNameLower.includes(keyword)) {
        score += keyword.length; // Longer keywords get higher scores
      }
    }

    // Bonus for exact word matches
    const productWords = productNameLower.split(/\s+/);
    for (const keyword of keywords) {
      if (productWords.includes(keyword)) {
        score += 5;
      }
    }

    if (score > bestScore && score >= 3) {
      // Minimum score threshold
      bestScore = score;
      bestMatch = product;
    }
  }

  return bestMatch;
}

async function fixAllCateringImages() {
  console.log('🔧 Fixing ALL catering images by linking to Square products...\n');

  try {
    // Get all catering items
    const cateringItems = (await prisma.cateringItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })) as CateringItemWithDetails[];

    // Get all products that have images
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

    console.log(`Found ${cateringItems.length} catering items to process`);
    console.log(`Found ${products.length} products with images\n`);

    let updated = 0;
    let linkedToSquare = 0;
    let imagesUpdated = 0;
    let errors = 0;
    let alreadyHadImages = 0;

    console.log('🔗 LINKING CATERING ITEMS TO SQUARE PRODUCTS');
    console.log('='.repeat(60));

    for (const item of cateringItems) {
      try {
        console.log(`\n📦 Processing: ${item.name}`);

        let needsUpdate = false;
        const updateData: any = {};

        // Check if we need to link to Square product
        if (!item.squareProductId) {
          const bestMatch = findBestMatch(item.name, products);

          if (bestMatch) {
            updateData.squareProductId = bestMatch.squareId;
            console.log(`   🔗 Linked to Square product: ${bestMatch.name}`);
            console.log(`   📊 Square ID: ${bestMatch.squareId}`);
            linkedToSquare++;
            needsUpdate = true;
          } else {
            console.log(`   ❌ No matching Square product found`);
          }
        }

        // Check if we need to update image
        if (!item.imageUrl) {
          let imageToUse = null;

          // If we just linked to a Square product, use its image
          if (updateData.squareProductId) {
            const linkedProduct = products.find(p => p.squareId === updateData.squareProductId);
            if (linkedProduct && linkedProduct.images.length > 0) {
              imageToUse = linkedProduct.images[0];
            }
          }
          // If item already has squareProductId, find its product
          else if (item.squareProductId) {
            const existingProduct = products.find(p => p.squareId === item.squareProductId);
            if (existingProduct && existingProduct.images.length > 0) {
              imageToUse = existingProduct.images[0];
            }
          }
          // If no Square link, try name matching
          else {
            const bestMatch = findBestMatch(item.name, products);
            if (bestMatch && bestMatch.images.length > 0) {
              imageToUse = bestMatch.images[0];
            }
          }

          if (imageToUse) {
            updateData.imageUrl = imageToUse;
            console.log(`   🖼️  Updated image: ${imageToUse.substring(0, 80)}...`);
            imagesUpdated++;
            needsUpdate = true;
          } else {
            console.log(`   🚫 No image available`);
          }
        } else {
          console.log(`   ✅ Already has image`);
          alreadyHadImages++;
        }

        // Apply updates if needed
        if (needsUpdate) {
          updateData.updatedAt = new Date();

          await prisma.cateringItem.update({
            where: { id: item.id },
            data: updateData,
          });

          updated++;
          console.log(`   ✅ Updated successfully`);
        } else {
          console.log(`   ⏭️  No updates needed`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${item.name}:`, error);
        errors++;
      }
    }

    console.log('\n📈 FINAL SUMMARY');
    console.log('='.repeat(30));
    console.log(`Total catering items processed: ${cateringItems.length}`);
    console.log(`Items updated: ${updated}`);
    console.log(`New Square product links: ${linkedToSquare}`);
    console.log(`Images updated: ${imagesUpdated}`);
    console.log(`Already had images: ${alreadyHadImages}`);
    console.log(`Errors: ${errors}`);

    // Verification: Check final state
    console.log('\n🔍 VERIFICATION - Checking final state...');

    const verificationItems = await prisma.cateringItem.findMany({
      where: { isActive: true },
      select: {
        name: true,
        imageUrl: true,
        squareProductId: true,
      },
    });

    const withImages = verificationItems.filter(item => !!item.imageUrl).length;
    const withSquareLinks = verificationItems.filter(item => !!item.squareProductId).length;

    console.log(`Final state:`);
    console.log(
      `  - Items with images: ${withImages}/${verificationItems.length} (${Math.round((withImages / verificationItems.length) * 100)}%)`
    );
    console.log(
      `  - Items with Square links: ${withSquareLinks}/${verificationItems.length} (${Math.round((withSquareLinks / verificationItems.length) * 100)}%)`
    );

    if (withImages === verificationItems.length) {
      console.log('\n🎉 SUCCESS! All catering items now have images!');
    } else {
      console.log('\n⚠️  Some items still need images. You may need to:');
      console.log('    1. Check if more Square products need to be synced');
      console.log('    2. Add manual images for items without Square matches');
      console.log('    3. Verify product names match expectations');
    }
  } catch (error) {
    console.error('❌ Error fixing catering images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllCateringImages().catch(console.error);
