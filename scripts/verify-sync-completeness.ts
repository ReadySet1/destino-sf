#!/usr/bin/env tsx

/**
 * Verify Sync Completeness
 * 
 * Check the current state of the production database to see how many items 
 * we have compared to Square, and identify specific missing items
 */

import { config } from 'dotenv';
import path from 'path';
import { prisma } from '../src/lib/db';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

interface CategoryStats {
  name: string;
  localCount: number;
  expectedSquareItems?: string[];
  missingItems?: string[];
}

async function verifySyncCompleteness(): Promise<void> {
  console.log('🔍 MASTER PLAN VERIFICATION: Checking sync completeness...');
  console.log('');

  try {
    // Check current state of products table
    const allProducts = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: {
        category: {
          name: 'asc'
        }
      }
    });

    console.log(`📊 TOTAL ACTIVE PRODUCTS: ${allProducts.length}`);
    console.log('');

    // Group by category
    const categoryCounts = new Map<string, CategoryStats>();
    
    allProducts.forEach(product => {
      const categoryName = product.category.name;
      if (!categoryCounts.has(categoryName)) {
        categoryCounts.set(categoryName, {
          name: categoryName,
          localCount: 0
        });
      }
      categoryCounts.get(categoryName)!.localCount++;
    });

    // Sort categories and display
    const sortedCategories = Array.from(categoryCounts.values()).sort((a, b) => a.name.localeCompare(b.name));

    console.log('📋 PRODUCTS BY CATEGORY:');
    console.log('');

    let totalCateringItems = 0;
    let totalCoreItems = 0;

    sortedCategories.forEach(cat => {
      const isCatering = cat.name.includes('CATERING');
      const icon = isCatering ? '🍽️ ' : '🥟 ';
      console.log(`${icon} ${cat.name}: ${cat.localCount} items`);
      
      if (isCatering) {
        totalCateringItems += cat.localCount;
      } else {
        totalCoreItems += cat.localCount;
      }
    });

    console.log('');
    console.log('📈 SUMMARY:');
    console.log(`   • Total Catering Items: ${totalCateringItems}`);
    console.log(`   • Total Core Products: ${totalCoreItems}`);
    console.log(`   • Grand Total: ${totalCateringItems + totalCoreItems}`);
    console.log('');

    // Check specifically for the problematic category
    const boxedLunchCategory = sortedCategories.find(cat => 
      cat.name.includes('BOXED LUNCH ENTREES')
    );

    if (boxedLunchCategory) {
      console.log('🎯 FOCUS: BOXED LUNCH ENTREES Category:');
      console.log(`   • Current Count: ${boxedLunchCategory.localCount} items`);
      console.log(`   • Expected Count: 8 items (from Square)`);
      console.log(`   • Missing: ${8 - boxedLunchCategory.localCount} items`);
      
      if (boxedLunchCategory.localCount < 8) {
        console.log('');
        console.log('❌ DISCREPANCY CONFIRMED: Missing items in BOXED LUNCH ENTREES');
        console.log('This matches the master plan analysis.');
        
        // Get the specific products in this category
        const boxedLunchProducts = allProducts.filter(p => 
          p.category.name.includes('BOXED LUNCH ENTREES')
        );
        
        console.log('');
        console.log('📝 CURRENT BOXED LUNCH ENTREES ITEMS:');
        boxedLunchProducts.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} (Square ID: ${product.squareId})`);
        });
        
        console.log('');
        console.log('🔍 MISSING ITEMS (according to master plan):');
        console.log('   - Acorn Squash (GZNXPT6ONKIIUIMPD3PJV64U)');
        console.log('   - Beef Stir Fry (XXTYXJS5IH7Y7ILKUAOVSNAZ)');
        console.log('   - Churrasco with Chimichurri (ZDUYM3XR5JWZ4VZWN43MZM5X)');
      } else {
        console.log('');
        console.log('✅ BOXED LUNCH ENTREES: No discrepancy detected!');
      }
    } else {
      console.log('⚠️  BOXED LUNCH ENTREES category not found!');
    }

    console.log('');
    
    // Check expected vs actual based on master plan
    const expectedTotal = 129; // From master plan
    const actualTotal = allProducts.length;
    const discrepancy = expectedTotal - actualTotal;
    
    console.log('🎯 MASTER PLAN COMPARISON:');
    console.log(`   • Expected Total (from Square): ${expectedTotal} items`);
    console.log(`   • Actual Total (in database): ${actualTotal} items`);
    console.log(`   • Discrepancy: ${discrepancy} items`);
    
    if (discrepancy === 0) {
      console.log('');
      console.log('🎉 SUCCESS: Database matches Square perfectly!');
      console.log('The master plan fix was successful.');
    } else if (discrepancy > 0) {
      console.log('');
      console.log(`❌ MISSING ${discrepancy} ITEMS: Database has fewer items than Square`);
      console.log('The force sync is needed to resolve this discrepancy.');
    } else {
      console.log('');
      console.log(`⚠️  EXTRA ${Math.abs(discrepancy)} ITEMS: Database has more items than expected`);
      console.log('This might indicate duplicate items or items not in Square.');
    }

  } catch (error) {
    console.error('❌ VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  verifySyncCompleteness()
    .then(() => {
      console.log('');
      console.log('🏁 Verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifySyncCompleteness };
