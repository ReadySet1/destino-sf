// scripts/update-seasonal-products.ts
// Run this script to implement Friday's high-priority changes

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductUpdate {
  name: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  itemState: 'ACTIVE' | 'SEASONAL' | 'ARCHIVED';
  isAvailable: boolean;
}

const SEASONAL_COOKIES: ProductUpdate[] = [
  {
    name: 'Gingerbread',
    visibility: 'PUBLIC',
    itemState: 'SEASONAL',
    isAvailable: false, // View only, not purchasable
  },
  {
    name: 'Lucuma',
    visibility: 'PUBLIC',
    itemState: 'SEASONAL',
    isAvailable: false,
  },
  {
    name: 'Pride',
    visibility: 'PUBLIC',
    itemState: 'SEASONAL',
    isAvailable: false,
  },
  {
    name: "Valentine's Day",
    visibility: 'PUBLIC',
    itemState: 'SEASONAL',
    isAvailable: false,
  },
];

const PRODUCTS_TO_REMOVE = ["Valentine's Day Cookie", 'Empanadas Combo'];

async function updateSeasonalCookies() {
  console.log('🍪 Updating seasonal cookie display settings...\n');

  for (const cookie of SEASONAL_COOKIES) {
    try {
      const result = await prisma.product.updateMany({
        where: {
          name: {
            contains: cookie.name,
            mode: 'insensitive',
          },
        },
        data: {
          visibility: cookie.visibility,
          itemState: cookie.itemState,
          isAvailable: cookie.isAvailable,
          // Add custom metadata to indicate seasonal badge
          customAttributes: {
            isSeasonal: true,
            seasonalBadge: 'Seasonal Item',
            displayOnly: true,
          },
        },
      });

      console.log(`✅ Updated ${result.count} product(s) for: ${cookie.name}`);
    } catch (error) {
      console.error(`❌ Error updating ${cookie.name}:`, error);
    }
  }
}

async function removeProducts() {
  console.log('\n🗑️  Removing discontinued products...\n');

  for (const productName of PRODUCTS_TO_REMOVE) {
    try {
      const result = await prisma.product.updateMany({
        where: {
          OR: [
            {
              name: {
                contains: productName,
                mode: 'insensitive',
              },
            },
            {
              name: {
                equals: productName,
                mode: 'insensitive',
              },
            },
          ],
        },
        data: {
          active: false,
          itemState: 'ARCHIVED',
          visibility: 'PRIVATE',
          isAvailable: false,
        },
      });

      console.log(`✅ Archived ${result.count} product(s): ${productName}`);
    } catch (error) {
      console.error(`❌ Error removing ${productName}:`, error);
    }
  }
}

async function verifyUpdates() {
  console.log('\n🔍 Verifying updates...\n');

  // Check seasonal cookies
  const seasonalProducts = await prisma.product.findMany({
    where: {
      itemState: 'SEASONAL',
      visibility: 'PUBLIC',
    },
    select: {
      name: true,
      isAvailable: true,
      itemState: true,
      visibility: true,
      customAttributes: true,
    },
  });

  console.log('📊 Seasonal Products (View-Only):');
  seasonalProducts.forEach(product => {
    console.log(`  - ${product.name}`);
    console.log(`    Available: ${product.isAvailable}`);
    console.log(`    State: ${product.itemState}\n`);
  });

  // Check removed products
  const archivedProducts = await prisma.product.findMany({
    where: {
      itemState: 'ARCHIVED',
      active: false,
    },
    select: {
      name: true,
      active: true,
      itemState: true,
    },
  });

  console.log('📊 Archived Products:');
  archivedProducts.forEach(product => {
    console.log(`  - ${product.name} (Active: ${product.active})`);
  });
}

async function main() {
  console.log('🚀 Starting product updates for Friday deployment\n');
  console.log('='.repeat(50));

  try {
    await updateSeasonalCookies();
    await removeProducts();
    await verifyUpdates();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All updates completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update ProductCard.tsx to show "Seasonal Item" badge');
    console.log('2. Test that seasonal items display but cannot be added to cart');
    console.log('3. Verify removed items no longer appear on site');
  } catch (error) {
    console.error('\n❌ Error during updates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
