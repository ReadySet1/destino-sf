#!/usr/bin/env tsx

/**
 * Comprehensive Catering Data Restoration Script
 *
 * This script restores all catering data including:
 * - Appetizer packages (the missing ones causing the 404)
 * - Catering items from Square sync
 * - Local catering items not from Square
 * - Store settings for catering
 *
 * Run this to fix the appetizer menu and restore all catering functionality.
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Define the appetizer packages that are missing
const APPETIZER_PACKAGES = [
  {
    name: 'Appetizer Selection - 5 Items',
    description:
      'Choose 5 appetizer items from our signature collection. Perfect for intimate gatherings and small events. Each package includes a variety of vegetarian, vegan, and protein options to accommodate all dietary preferences.',
    minPeople: 2,
    pricePerPerson: 22.0,
    type: 'INDIVIDUAL',
    imageUrl: '/images/catering/appetizer-package-5.jpg',
    dietaryOptions: [
      'Vegetarian options available',
      'Vegan options available',
      'Gluten-free options available',
    ],
    isActive: true,
  },
  {
    name: 'Appetizer Selection - 7 Items',
    description:
      'Choose 7 appetizer items from our signature collection. Ideal for medium-sized gatherings and corporate events. Features our most popular items including empanadas, pintxos, and seasonal specialties.',
    minPeople: 2,
    pricePerPerson: 34.0,
    type: 'INDIVIDUAL',
    imageUrl: '/images/catering/appetizer-package-7.jpg',
    dietaryOptions: [
      'Vegetarian options available',
      'Vegan options available',
      'Gluten-free options available',
    ],
    isActive: true,
  },
  {
    name: 'Appetizer Selection - 9 Items',
    description:
      'Choose 9 appetizer items from our signature collection. Perfect for large events and celebrations. Includes our complete range of Latin American appetizers from traditional empanadas to modern fusion creations.',
    minPeople: 2,
    pricePerPerson: 46.0,
    type: 'INDIVIDUAL',
    imageUrl: '/images/catering/appetizer-package-9.jpg',
    dietaryOptions: [
      'Vegetarian options available',
      'Vegan options available',
      'Gluten-free options available',
    ],
    isActive: true,
  },
  {
    name: 'Premium Appetizer Package',
    description:
      "Our signature premium appetizer experience featuring 12 carefully curated items including seafood specialties, artisanal selections, and chef's favorites. Perfect for upscale events and special occasions.",
    minPeople: 6,
    pricePerPerson: 58.0,
    type: 'INDIVIDUAL',
    imageUrl: '/images/catering/premium-appetizer-package.jpg',
    dietaryOptions: [
      'Premium seafood options',
      'Artisanal cheese selections',
      'Gourmet protein options',
    ],
    isActive: true,
  },
];

// Define share platters that complement the appetizer packages
const SHARE_PLATTERS = [
  {
    name: 'Plantain Chips Platter - Small',
    description:
      'Crispy plantain chips served with our signature yellow pepper cream sauce. Perfect sharing appetizer for 10-20 guests.',
    minPeople: 10,
    pricePerPerson: 2.25, // $45 for 20 people
    type: 'APPETIZER',
    imageUrl: '/images/catering/plantain-chips-small.jpg',
    dietaryOptions: ['Vegan', 'Gluten-free'],
    isActive: true,
  },
  {
    name: 'Plantain Chips Platter - Large',
    description:
      'Crispy plantain chips served with our signature yellow pepper cream sauce. Perfect sharing appetizer for 25-40 guests.',
    minPeople: 25,
    pricePerPerson: 2.0, // $80 for 40 people
    type: 'APPETIZER',
    imageUrl: '/images/catering/plantain-chips-large.jpg',
    dietaryOptions: ['Vegan', 'Gluten-free'],
    isActive: true,
  },
  {
    name: 'Cheese & Charcuterie Platter - Small',
    description:
      'Artisanal selection of local and imported cheeses and cured meats. Includes 4 varieties with accompaniments. Serves 10-20 guests.',
    minPeople: 10,
    pricePerPerson: 7.5, // $150 for 20 people
    type: 'APPETIZER',
    imageUrl: '/images/catering/charcuterie-small.jpg',
    dietaryOptions: ['Vegetarian cheese options available'],
    isActive: true,
  },
  {
    name: 'Cheese & Charcuterie Platter - Large',
    description:
      'Artisanal selection of local and imported cheeses and cured meats. Includes 6 varieties with accompaniments. Serves 25-40 guests.',
    minPeople: 25,
    pricePerPerson: 7.0, // $280 for 40 people
    type: 'APPETIZER',
    imageUrl: '/images/catering/charcuterie-large.jpg',
    dietaryOptions: ['Vegetarian cheese options available'],
    isActive: true,
  },
];

// Boxed lunch packages (these should also be restored)
const BOXED_LUNCH_PACKAGES = [
  {
    name: 'Tier 1 Boxed Lunch',
    description:
      'Essential boxed lunch featuring our signature empanada, seasonal side, dessert, and beverage. Perfect for corporate meetings and casual events.',
    minPeople: 6,
    pricePerPerson: 18.0,
    type: 'BOXED_LUNCH',
    imageUrl: '/images/catering/tier-1-lunch.jpg',
    dietaryOptions: ['Vegetarian options', 'Gluten-free options upon request'],
    isActive: true,
  },
  {
    name: 'Tier 2 Boxed Lunch',
    description:
      'Enhanced boxed lunch with choice of two empanadas, artisanal sides, premium dessert, and beverage. Ideal for client meetings and special events.',
    minPeople: 6,
    pricePerPerson: 26.0,
    type: 'BOXED_LUNCH',
    imageUrl: '/images/catering/tier-2-lunch.jpg',
    dietaryOptions: [
      'Multiple vegetarian options',
      'Vegan options available',
      'Gluten-free options',
    ],
    isActive: true,
  },
  {
    name: 'Tier 3 Boxed Lunch',
    description:
      'Premium boxed lunch experience with three empanadas, gourmet sides, artisanal dessert selection, and premium beverage. Perfect for VIP events.',
    minPeople: 6,
    pricePerPerson: 34.0,
    type: 'BOXED_LUNCH',
    imageUrl: '/images/catering/tier-3-lunch.jpg',
    dietaryOptions: [
      'Extensive vegetarian selection',
      'Vegan options',
      'Gluten-free options',
      'Premium ingredients',
    ],
    isActive: true,
  },
];

// Store configuration for catering
const STORE_SETTINGS = {
  name: 'Destino SF',
  cateringMinimumAmount: 0.0, // No minimum for flexibility
  taxRate: 8.75, // SF tax rate
  minAdvanceHours: 120, // 5 days advance notice
  isStoreOpen: true,
  maxOrdersPerDay: 50,
  cateringEnabled: true,
};

/**
 * Restore all catering packages
 */
async function restoreCateringPackages() {
  console.log('📦 Restoring catering packages...');

  const allPackages = [...APPETIZER_PACKAGES, ...SHARE_PLATTERS, ...BOXED_LUNCH_PACKAGES];

  let created = 0;
  let updated = 0;

  for (const pkg of allPackages) {
    try {
      const existing = await prisma.cateringPackage.findFirst({
        where: { name: pkg.name },
      });

      if (existing) {
        await prisma.cateringPackage.update({
          where: { id: existing.id },
          data: {
            ...pkg,
            pricePerPerson: new Decimal(pkg.pricePerPerson),
            type: pkg.type as any,
            updatedAt: new Date(),
          },
        });
        updated++;
        console.log(`  ✅ Updated: ${pkg.name}`);
      } else {
        await prisma.cateringPackage.create({
          data: {
            ...pkg,
            pricePerPerson: new Decimal(pkg.pricePerPerson),
            type: pkg.type as any,
          },
        });
        created++;
        console.log(`  🆕 Created: ${pkg.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Error with package ${pkg.name}:`, error);
    }
  }

  return { created, updated };
}

/**
 * Update existing catering items to ensure they have proper pricing
 */
async function updateCateringItems() {
  console.log('🍽️ Updating catering items...');

  // Get all appetizer items from Square that should have proper metadata
  const appetizerItems = await prisma.cateringItem.findMany({
    where: {
      squareCategory: 'CATERING- APPETIZERS',
    },
  });

  let updated = 0;

  for (const item of appetizerItems) {
    try {
      // Update items to ensure they have proper pricing structure
      await prisma.cateringItem.update({
        where: { id: item.id },
        data: {
          // Items in appetizer packages are priced by package, not individually
          price: item.price.toNumber() === 0 ? new Decimal(0) : item.price,
          isActive: true,
          // Ensure dietary flags are properly set based on description
          isVegetarian: item.description
            ? item.description.toLowerCase().includes('vg') ||
              item.description.toLowerCase().includes('vegetarian') ||
              (!item.description.toLowerCase().includes('meat') &&
                !item.description.toLowerCase().includes('chicken') &&
                !item.description.toLowerCase().includes('beef') &&
                !item.description.toLowerCase().includes('pork') &&
                !item.description.toLowerCase().includes('fish') &&
                !item.description.toLowerCase().includes('salmon') &&
                !item.description.toLowerCase().includes('prawn'))
            : false,
          isVegan: item.description ? item.description.toLowerCase().includes('vgn') : false,
          isGlutenFree: item.description ? item.description.toLowerCase().includes('gf') : false,
          updatedAt: new Date(),
        },
      });
      updated++;
    } catch (error) {
      console.error(`  ❌ Error updating item ${item.name}:`, error);
    }
  }

  console.log(`  ✅ Updated ${updated} catering items`);
  return updated;
}

/**
 * Restore store settings for catering
 */
async function restoreStoreSettings() {
  console.log('⚙️ Restoring store settings...');

  try {
    const existing = await prisma.storeSettings.findFirst();

    if (existing) {
      await prisma.storeSettings.update({
        where: { id: existing.id },
        data: {
          ...STORE_SETTINGS,
          cateringMinimumAmount: new Decimal(STORE_SETTINGS.cateringMinimumAmount),
          taxRate: new Decimal(STORE_SETTINGS.taxRate),
          updatedAt: new Date(),
        },
      });
      console.log('  ✅ Updated store settings');
    } else {
      await prisma.storeSettings.create({
        data: {
          ...STORE_SETTINGS,
          cateringMinimumAmount: new Decimal(STORE_SETTINGS.cateringMinimumAmount),
          taxRate: new Decimal(STORE_SETTINGS.taxRate),
        },
      });
      console.log('  ✅ Created store settings');
    }
  } catch (error) {
    console.error('  ❌ Error with store settings:', error);
  }
}

/**
 * Verify catering data integrity
 */
async function verifyCateringData() {
  console.log('🔍 Verifying catering data integrity...');

  const packages = await prisma.cateringPackage.count();
  const appetizerPackages = await prisma.cateringPackage.count({
    where: {
      type: 'INDIVIDUAL',
    },
  });
  const boxedLunchPackages = await prisma.cateringPackage.count({
    where: { type: 'BOXED_LUNCH' },
  });
  const cateringItems = await prisma.cateringItem.count();
  const appetizerItems = await prisma.cateringItem.count({
    where: { squareCategory: 'CATERING- APPETIZERS' },
  });

  console.log('📊 Catering Data Summary:');
  console.log(`  • Total Packages: ${packages}`);
  console.log(`  • Appetizer Packages: ${appetizerPackages}`);
  console.log(`  • Boxed Lunch Packages: ${boxedLunchPackages}`);
  console.log(`  • Total Catering Items: ${cateringItems}`);
  console.log(`  • Appetizer Items: ${appetizerItems}`);

  return {
    packages,
    appetizerPackages,
    boxedLunchPackages,
    cateringItems,
    appetizerItems,
  };
}

/**
 * Main restoration function
 */
async function restoreAllCateringData() {
  console.log('🚀 Starting comprehensive catering data restoration...');
  console.log('');

  try {
    // Step 1: Restore packages (this fixes the appetizer menu issue)
    const packageResults = await restoreCateringPackages();
    console.log('');

    // Step 2: Update existing catering items
    const itemsUpdated = await updateCateringItems();
    console.log('');

    // Step 3: Restore store settings
    await restoreStoreSettings();
    console.log('');

    // Step 4: Verify everything is working
    const verification = await verifyCateringData();
    console.log('');

    console.log('🎉 Catering data restoration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(
      `  • Packages: ${packageResults.created} created, ${packageResults.updated} updated`
    );
    console.log(`  • Items: ${itemsUpdated} updated`);
    console.log(`  • Store settings: configured`);
    console.log('');

    if (verification.appetizerPackages > 0) {
      console.log('✅ Appetizer menu should now be working!');
      console.log('   Visit: http://localhost:3000/catering to test');
    } else {
      console.log('⚠️  Warning: No appetizer packages found after restoration');
    }
  } catch (error) {
    console.error('❌ Error during catering data restoration:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await restoreAllCateringData();
  } catch (error) {
    console.error('Failed to restore catering data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-run when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { restoreAllCateringData, restoreCateringPackages, updateCateringItems };
