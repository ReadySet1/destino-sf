/**
 * Test Square Category IDs for Empanadas
 * Simple version using existing Square client
 */

import { squareClient } from '../src/lib/square/client';

// The 3 Square category IDs mapped to EMPANADAS
const EMPANADAS_CATEGORY_IDS = [
  'CBCQ73NCXQKUAFWGP2KQFOJN', // Primary
  'SDGSB4F4YOUFY3UFJF2KWXUB', // Alternative
  'CISOGPONZYWZNS4QIZILKRRN', // Other
];

async function testSquareCategoryID(categoryId: string, index: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Category ID ${index + 1}/3: ${categoryId}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const catalogClient = squareClient.getCatalogClient();

    // Search for items in this category
    const response = await catalogClient.searchCatalogItems({
      categoryIds: [categoryId],
      productTypes: ['REGULAR'],
    });

    if (response.result.items && response.result.items.length > 0) {
      console.log(`✅ Found ${response.result.items.length} items in this category\n`);

      // Show first 10 items
      const itemsToShow = response.result.items.slice(0, 10);
      itemsToShow.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.itemData?.name || 'Unknown'}`);
        if (item.itemData?.variations && item.itemData.variations.length > 0) {
          const price = item.itemData.variations[0].itemVariationData?.priceMoney;
          if (price) {
            console.log(`     Price: $${(Number(price.amount) / 100).toFixed(2)}`);
          }
        }
      });

      if (response.result.items.length > 10) {
        console.log(`\n  ... and ${response.result.items.length - 10} more items`);
      }

      return {
        categoryId,
        itemCount: response.result.items.length,
        success: true,
        items: response.result.items,
      };
    } else {
      console.log(`❌ No items found in this category`);
      return {
        categoryId,
        itemCount: 0,
        success: false,
      };
    }
  } catch (error: any) {
    console.error(`❌ Error querying Square:`, error.message);
    return {
      categoryId,
      itemCount: 0,
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('\n🔍 Testing Square Category IDs for EMPANADAS\n');

  const results = [];

  // Test each category ID
  for (let i = 0; i < EMPANADAS_CATEGORY_IDS.length; i++) {
    const result = await testSquareCategoryID(EMPANADAS_CATEGORY_IDS[i], i);
    results.push(result);

    // Add delay to avoid rate limiting
    if (i < EMPANADAS_CATEGORY_IDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  const successfulCategories = results.filter(r => r.success && r.itemCount > 0);

  if (successfulCategories.length === 0) {
    console.log('❌ No empanadas found in ANY of the 3 category IDs!');
    console.log('\nPossible issues:');
    console.log('  1. Category IDs have changed in Square');
    console.log('  2. Products were moved to a different category');
    console.log('  3. Items are not enabled for your location');
    console.log('\n💡 Recommendation: Check Square Dashboard → Catalog → Categories');
  } else {
    console.log(`✅ Found empanadas in ${successfulCategories.length} category ID(s):\n`);
    successfulCategories.forEach((cat) => {
      console.log(`  Category: ${cat.categoryId}`);
      console.log(`  Items: ${cat.itemCount}`);
      console.log('');
    });

    // Recommendation
    const primaryCategoryId = successfulCategories[0].categoryId;
    const isCorrectPrimary = primaryCategoryId === EMPANADAS_CATEGORY_IDS[0];

    if (!isCorrectPrimary) {
      console.log('⚠️  WARNING: Primary category ID is not returning items!');
      console.log(`\nCurrent primary: ${EMPANADAS_CATEGORY_IDS[0]}`);
      console.log(`Should be: ${primaryCategoryId}`);
      console.log('\n💡 Recommendation: Update category-mapper.ts to use the correct primary ID');
    } else {
      console.log('✅ Primary category ID is correct!');
      console.log('\n💡 Issue: Sync logic is not trying all category IDs');
      console.log('   Fix: Update unified-sync to query ALL mapped category IDs');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
