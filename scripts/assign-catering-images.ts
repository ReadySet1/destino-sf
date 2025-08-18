#!/usr/bin/env tsx

/**
 * Assign local images to catering items that don't have images
 * This is specifically for the appetizer items and other items created locally
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Image mappings based on available files in /public/images/catering/
const IMAGE_MAPPINGS = {
  // Specific appetizer items
  'Pintxos Vegetarianos': '/images/catering/appetizer-selection.jpg',
  'Arepas': '/images/catering/appetizer-selection.jpg', 
  'Camotitos': '/images/catering/appetizer-selection.jpg',
  'Mt. Tam Montado': '/images/catering/appetizer-selection.jpg',
  'Quinoa Arancini Balls': '/images/catering/appetizer-selection.jpg',
  'Causa': '/images/catering/appetizer-selection.jpg',
  'Bocadillo de Boquerones': '/images/catering/appetizer-selection.jpg',
  'Peruvian Ceviche': '/images/catering/appetizer-selection.jpg',
  'Tiger Prawns': '/images/catering/appetizer-selection.jpg',
  'Salmon Carpaccio': '/images/catering/appetizer-selection.jpg',
  'Churrasco': '/images/catering/appetizer-selection.jpg',
  'Pan con Tomate': '/images/catering/appetizer-selection.jpg',
  'Anticuchos de Pollo': '/images/catering/appetizer-selection.jpg',
  'Sliders': '/images/catering/appetizer-selection.jpg',
  'Albondigas': '/images/catering/appetizer-selection.jpg',
  'Oxtail': '/images/catering/appetizer-selection.jpg',
  'Empanada - Pork': '/images/catering/appetizer-selection.jpg',
  'Empanada - Vegetarian': '/images/catering/appetizer-selection.jpg',
  'Tamal Verde': '/images/catering/appetizer-selection.jpg',
  'Empanada - Beef': '/images/catering/appetizer-selection.jpg',
  'Empanada - Chicken': '/images/catering/appetizer-selection.jpg',
  'Empanada - Salmon': '/images/catering/appetizer-selection.jpg',

  // Platter items
  'Plantain Chips Platter - Small': '/images/catering/default-appetizer.jpg',
  'Plantain Chips Platter - Large': '/images/catering/default-appetizer.jpg',
  'Cheese & Charcuterie Platter - Small': '/images/catering/default-appetizer.jpg',
  'Cheese & Charcuterie Platter - Large': '/images/catering/default-appetizer.jpg',
  'Cocktail Prawn Platter - Small': '/images/catering/default-appetizer.jpg',
  'Cocktail Prawn Platter - Large': '/images/catering/default-appetizer.jpg',

  // Dessert items  
  'Alfajores - Classic': '/images/catering/default-item.jpg',
  'Alfajores - Chocolate': '/images/catering/default-item.jpg',
  'Alfajores - Lemon': '/images/catering/default-item.jpg',
  'Alfajores - Gluten-Free': '/images/catering/default-item.jpg',
  'Mini Cupcakes': '/images/catering/default-item.jpg',
  'Lemon Bars': '/images/catering/default-item.jpg',
  'Brownie Bites': '/images/catering/default-item.jpg',
};

// Category-based fallback images
const CATEGORY_FALLBACKS = {
  'STARTER': '/images/catering/default-appetizer.jpg',
  'SIDE': '/images/catering/default-item.jpg', 
  'DESSERT': '/images/catering/default-item.jpg',
  'BUFFET': '/images/catering/default-buffet.jpg',
  'LUNCH': '/images/catering/tier-1-lunch.jpg',
};

async function assignCateringImages() {
  console.log('🖼️  Assigning local images to catering items...\n');

  try {
    // Get all items without images
    const itemsWithoutImages = await prisma.cateringPackage.findMany({
      where: {
        isActive: true,
        OR: [
          { imageUrl: null },
          { imageUrl: '' }
        ]
      },
      select: {
        id: true,
        name: true,
        type: true,
        imageUrl: true,
      },
    });

    console.log(`Found ${itemsWithoutImages.length} items without images\n`);

    let assigned = 0;
    let skipped = 0;

    for (const item of itemsWithoutImages) {
      let imageUrl = null;

      // First try specific mapping
      if (IMAGE_MAPPINGS[item.name as keyof typeof IMAGE_MAPPINGS]) {
        imageUrl = IMAGE_MAPPINGS[item.name as keyof typeof IMAGE_MAPPINGS];
      }
      // Then try category fallback
      else if (CATEGORY_FALLBACKS[item.type as keyof typeof CATEGORY_FALLBACKS]) {
        imageUrl = CATEGORY_FALLBACKS[item.type as keyof typeof CATEGORY_FALLBACKS];
      }
      // Default fallback
      else {
        imageUrl = '/images/catering/default-item.jpg';
      }

      if (imageUrl) {
        try {
          await prisma.cateringPackage.update({
            where: { id: item.id },
            data: { imageUrl },
          });
          
          console.log(`✅ ${item.name} → ${imageUrl}`);
          assigned++;
        } catch (error) {
          console.error(`❌ Failed to update ${item.name}:`, error);
          skipped++;
        }
      } else {
        console.log(`⏭️  Skipped ${item.name} (no image mapping)`);
        skipped++;
      }
    }

    console.log(`\n📊 Image Assignment Summary:`);
    console.log(`   ✅ Assigned: ${assigned}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📁 Total processed: ${itemsWithoutImages.length}`);

  } catch (error) {
    console.error('❌ Error assigning images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
assignCateringImages()
  .then(() => {
    console.log('\n🎉 Image assignment completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });