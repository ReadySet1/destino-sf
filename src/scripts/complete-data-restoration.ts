#!/usr/bin/env tsx

/**
 * Complete Data Restoration Script
 * 
 * This is the master script that restores ALL data for Destino SF:
 * 1. Square product synchronization (store products with proper categories)
 * 2. Catering packages and items
 * 3. Store configuration
 * 4. Category slug fixes
 * 
 * Use this script to completely restore the application data after any database issues.
 */

import { PrismaClient } from '@prisma/client';
import { syncSquareProducts } from '../lib/square/sync';
import { restoreAllCateringData } from './restore-catering-data';

const prisma = new PrismaClient();

/**
 * Sync Square products and fix category slugs
 */
async function syncSquareData() {
  console.log('🔄 Syncing Square products...');
  
  try {
    const result = await syncSquareProducts();
    console.log(`✅ Square sync completed: ${JSON.stringify(result)}`);
    
    // Fix category slugs that might be null
    await fixCategorySlugs();
    
    return result;
  } catch (error) {
    console.error('❌ Error syncing Square data:', error);
    throw error;
  }
}

/**
 * Fix any category slugs that are null
 */
async function fixCategorySlugs() {
  console.log('🔧 Fixing category slugs...');
  
  const categoriesWithNullSlugs = await prisma.category.findMany({
    where: {
      slug: null
    }
  });

  let fixed = 0;
  for (const category of categoriesWithNullSlugs) {
    const slug = category.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    await prisma.category.update({
      where: { id: category.id },
      data: { slug }
    });
    
    console.log(`  ✅ Fixed slug for ${category.name} → ${slug}`);
    fixed++;
  }

  if (fixed === 0) {
    console.log('  ✅ All category slugs are properly set');
  }

  return fixed;
}

/**
 * Verify all data is properly set up
 */
async function verifyDataIntegrity() {
  console.log('🔍 Verifying complete data integrity...');

  // Check categories
  const categories = await prisma.category.findMany();
  const alfajoresCategory = categories.find(c => c.slug === 'alfajores');
  const empanadasCategory = categories.find(c => c.slug === 'empanadas');

  // Check products
  const products = await prisma.product.count();
  const alfajoresProducts = await prisma.product.count({
    where: { categoryId: alfajoresCategory?.id }
  });
  const empanadasProducts = await prisma.product.count({
    where: { categoryId: empanadasCategory?.id }
  });

  // Check catering data
  const cateringPackages = await prisma.cateringPackage.count();
  const appetizerPackages = await prisma.cateringPackage.count({
    where: {
      type: 'INDIVIDUAL'
    }
  });
  const cateringItems = await prisma.cateringItem.count();

  console.log('📊 Complete Data Summary:');
  console.log('');
  console.log('🏪 Store Products:');
  console.log(`  • Total Categories: ${categories.length}`);
  console.log(`  • Total Products: ${products}`);
  console.log(`  • Alfajores Products: ${alfajoresProducts}`);
  console.log(`  • Empanadas Products: ${empanadasProducts}`);
  console.log('');
  console.log('🍽️ Catering Data:');
  console.log(`  • Total Packages: ${cateringPackages}`);
  console.log(`  • Appetizer Packages: ${appetizerPackages}`);
  console.log(`  • Catering Items: ${cateringItems}`);
  console.log('');

  // Verify specific routes that were failing
  const routeChecks = [
    {
      route: '/products/category/alfajores',
      category: alfajoresCategory,
      productCount: alfajoresProducts
    },
    {
      route: '/products/category/empanadas', 
      category: empanadasCategory,
      productCount: empanadasProducts
    },
    {
      route: '/catering (appetizer section)',
      category: { name: 'Appetizer Packages' },
      productCount: appetizerPackages
    }
  ];

  console.log('🌐 Route Status:');
  routeChecks.forEach(check => {
    const status = check.category && check.productCount > 0 ? '✅' : '❌';
    console.log(`  ${status} ${check.route}: ${check.productCount} items`);
  });

  return {
    categories: categories.length,
    products,
    cateringPackages,
    appetizerPackages,
    cateringItems,
    routesWorking: routeChecks.filter(c => c.category && c.productCount > 0).length
  };
}

/**
 * Complete data restoration process
 */
async function completeDataRestoration() {
  console.log('🚀 Starting complete data restoration for Destino SF...');
  console.log('=====================================');
  console.log('');

  try {
    // Step 1: Sync Square products (fixes store product routes)
    console.log('STEP 1: Syncing Square Products');
    console.log('--------------------------------');
    const squareResult = await syncSquareData();
    console.log('');

    // Step 2: Restore catering data (fixes appetizer menu)
    console.log('STEP 2: Restoring Catering Data');
    console.log('--------------------------------');
    await restoreAllCateringData();
    console.log('');

    // Step 3: Verify everything is working
    console.log('STEP 3: Final Verification');
    console.log('---------------------------');
    const verification = await verifyDataIntegrity();
    console.log('');

    console.log('🎉 COMPLETE DATA RESTORATION FINISHED!');
    console.log('=====================================');
    console.log('');
    
    if (verification.routesWorking === 3) {
      console.log('✅ ALL ROUTES SHOULD NOW BE WORKING:');
      console.log('   • http://localhost:3000/products/category/alfajores');
      console.log('   • http://localhost:3000/products/category/empanadas');
      console.log('   • http://localhost:3000/catering (appetizer section)');
    } else {
      console.log('⚠️  Some routes may still have issues. Check the verification summary above.');
    }

    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Start your development server: pnpm dev');
    console.log('   2. Test the routes mentioned above');
    console.log('   3. Try signing up/signing in with auth');
    console.log('');

    return verification;

  } catch (error) {
    console.error('❌ Error during complete data restoration:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await completeDataRestoration();
  } catch (error) {
    console.error('Failed to complete data restoration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-run when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { completeDataRestoration, syncSquareData, fixCategorySlugs }; 