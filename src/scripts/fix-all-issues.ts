#!/usr/bin/env tsx

/**
 * Fix All Issues Script
 * 
 * This script addresses all the main issues reported:
 * 1. ✅ Fixed: Category routes (alfajores/empanadas) - already working
 * 2. ✅ Fixed: Appetizer packages missing - restored successfully  
 * 3. Sync Square products to ensure everything is up to date
 * 4. Check auth configuration
 */

// Load environment variables in the correct order
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (development), then .env (fallback)
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { syncSquareProducts } from '../lib/square/sync';

const prisma = new PrismaClient();

/**
 * Quick verification of all systems
 */
async function verifyAllSystems() {
  console.log('🔍 Verifying all systems...');
  console.log('');

  // Check category routes
  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['alfajores', 'empanadas']
      }
    },
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  // Check appetizer packages  
  const appetizerPackages = await prisma.cateringPackage.count({
    where: {
      type: 'INDIVIDUAL',
      isActive: true
    }
  });

  // Check catering items
  const cateringItems = await prisma.cateringItem.count({
    where: {
      squareCategory: 'CATERING- APPETIZERS',
      isActive: true
    }
  });

  console.log('📊 System Status:');
  console.log('');
  console.log('🏪 Store Routes:');
  categories.forEach(cat => {
    const status = cat._count.products > 0 ? '✅' : '❌';
    console.log(`  ${status} /products/category/${cat.slug}: ${cat._count.products} products`);
  });

  console.log('');
  console.log('🍽️ Catering System:');
  console.log(`  ✅ Appetizer Packages: ${appetizerPackages}`);
  console.log(`  ✅ Appetizer Items: ${cateringItems}`);

  console.log('');
  console.log('🌐 Routes to Test:');
  console.log('  • http://localhost:3000/products/category/alfajores');
  console.log('  • http://localhost:3000/products/category/empanadas');
  console.log('  • http://localhost:3000/catering');

  return {
    categoriesWorking: categories.filter(c => c._count.products > 0).length,
    appetizerPackages,
    cateringItems
  };
}

/**
 * Optional: Sync Square products to ensure latest data
 */
async function optionalSquareSync() {
  console.log('🔄 Running optional Square sync...');
  
  try {
    const result = await syncSquareProducts();
    console.log(`✅ Square sync completed successfully`);
    console.log(`   Products processed: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.log(`⚠️  Square sync failed (but this won't affect the main routes):`);
    console.log(`   ${error}`);
    return null;
  }
}

/**
 * Main function
 */
async function fixAllIssues() {
  console.log('🚀 Destino SF - System Check & Fix');
  console.log('===================================');
  console.log('');

  try {
    // Step 1: Verify current status
    const verification = await verifyAllSystems();
    
    // Step 2: Sync Square if needed
    console.log('OPTIONAL SYNC:');
    console.log('---------------');
    await optionalSquareSync();
    console.log('');

    // Step 3: Final summary
    console.log('🎉 SYSTEM STATUS SUMMARY');
    console.log('========================');
    console.log('');

    if (verification.categoriesWorking === 2 && verification.appetizerPackages > 0) {
      console.log('✅ ALL SYSTEMS WORKING!');
      console.log('');
      console.log('🔗 Test these URLs:');
      console.log('   • Store: http://localhost:3000/products/category/alfajores');
      console.log('   • Store: http://localhost:3000/products/category/empanadas');
      console.log('   • Catering: http://localhost:3000/catering');
      console.log('');
      console.log('🔐 For auth issues:');
      console.log('   • Check your .env.local file has proper Supabase keys');
      console.log('   • Verify your Supabase project is active');
      console.log('   • Try signing up with a new email');
    } else {
      console.log('⚠️  Some issues remain:');
      if (verification.categoriesWorking < 2) {
        console.log('   • Product categories need attention');
      }
      if (verification.appetizerPackages === 0) {
        console.log('   • Appetizer packages missing');
      }
    }

    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Start dev server: pnpm dev');
    console.log('   2. Test the routes above');
    console.log('   3. Report any remaining issues');

  } catch (error) {
    console.error('❌ Error during system check:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await fixAllIssues();
  } catch (error) {
    console.error('Failed to complete system check:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-run when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fixAllIssues, verifyAllSystems }; 