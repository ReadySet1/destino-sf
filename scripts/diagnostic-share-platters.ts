#!/usr/bin/env tsx

/**
 * Diagnostic Script for Share Platters
 *
 * This script checks the current state of Share Platter products and their variants
 * to help understand the current database state after cleanup.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosisSharePlatters() {
  console.log('🔍 Running Share Platters diagnosis...\n');

  try {
    // Find all SHARE PLATTERS products (both active and inactive)
    const sharePlatters = await prisma.product.findMany({
      where: {
        category: {
          name: 'CATERING- SHARE PLATTERS',
        },
      },
      include: {
        variants: true,
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`📊 Total Share Platter products found: ${sharePlatters.length}\n`);

    // Group by active/inactive
    const activeProducts = sharePlatters.filter(p => p.active);
    const inactiveProducts = sharePlatters.filter(p => !p.active);

    console.log(`✅ Active products: ${activeProducts.length}`);
    console.log(`❌ Inactive products: ${inactiveProducts.length}\n`);

    console.log('📋 ACTIVE PRODUCTS (These should be the main ones):');
    console.log('================================================');
    activeProducts.forEach(product => {
      console.log(`\n🔸 "${product.name}" (ID: ${product.id})`);
      console.log(`   💰 Base Price: $${product.price}`);
      console.log(`   📦 Square ID: ${product.squareId}`);
      console.log(`   🔧 Variants: ${product.variants.length}`);

      if (product.variants.length > 0) {
        product.variants.forEach(variant => {
          console.log(
            `      • ${variant.name}: $${variant.price} (Square: ${variant.squareVariantId})`
          );
        });
      } else {
        console.log(`      • No variants found`);
      }
    });

    console.log('\n\n📋 INACTIVE PRODUCTS (These should be the duplicates):');
    console.log('=====================================================');
    inactiveProducts.forEach(product => {
      console.log(`\n🔸 "${product.name}" (ID: ${product.id})`);
      console.log(`   💰 Price: $${product.price}`);
      console.log(`   📦 Square ID: ${product.squareId}`);
      console.log(`   🔧 Variants: ${product.variants.length}`);
    });

    // Check for potential issues
    console.log('\n\n🔍 DIAGNOSIS:');
    console.log('=============');

    // Check for active products without variants
    const activeWithoutVariants = activeProducts.filter(p => p.variants.length === 0);
    if (activeWithoutVariants.length > 0) {
      console.log(`⚠️  Warning: ${activeWithoutVariants.length} active products have no variants:`);
      activeWithoutVariants.forEach(p => {
        console.log(`   • "${p.name}"`);
      });
    }

    // Check for naming patterns
    const expectedBaseNames = new Set();
    activeProducts.forEach(product => {
      // Extract base name
      const baseName = product.name
        .replace(/ - (Small|Large|Regular)$/i, '')
        .replace(/ (Small|Large|Regular)$/i, '')
        .trim();
      expectedBaseNames.add(baseName);
    });

    console.log(`\n✅ Expected base product names (${expectedBaseNames.size}):`);
    expectedBaseNames.forEach(name => {
      console.log(`   • "${name}"`);
    });

    // Check if frontend should work
    console.log(`\n🌐 Frontend Status:`);
    const productsWithVariations = activeProducts.filter(p => p.variants.length > 1);
    console.log(`   • Products with multiple variations: ${productsWithVariations.length}`);
    console.log(
      `   • Should show size dropdowns: ${productsWithVariations.length > 0 ? 'YES' : 'NO'}`
    );
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnosisSharePlatters()
    .then(() => {
      console.log('\n🎉 Diagnosis complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Diagnosis failed:', error);
      process.exit(1);
    });
}

export { diagnosisSharePlatters };
