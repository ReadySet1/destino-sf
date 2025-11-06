/**
 * Check Spotlight Picks in Database
 * Quick diagnostic script to see what's in the spotlight_picks table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpotlightPicks() {
  try {
    console.log('🔍 Checking spotlight_picks table...\n');

    // Get all spotlight picks
    const allPicks = await prisma.spotlightPick.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    console.log(`📊 Total spotlight picks: ${allPicks.length}`);

    if (allPicks.length === 0) {
      console.log('\n❌ No spotlight picks found in database!');
      console.log('\n💡 To fix this:');
      console.log('   1. Visit http://localhost:3000/admin/spotlight-picks');
      console.log('   2. Add products to spotlight picks');
      console.log('   3. Or run: pnpm tsx scripts/seed-spotlight-picks.ts');
    } else {
      console.log('\n📋 Spotlight Picks:\n');
      allPicks.forEach(pick => {
        const status = pick.isActive ? '✅ Active' : '❌ Inactive';
        console.log(`Position ${pick.position}: ${status}`);
        console.log(`  Product: ${pick.product.name}`);
        console.log(`  Price: $${pick.product.price}`);
        console.log(`  Available: ${pick.product.isAvailable ? 'Yes' : 'No'}`);
        console.log('');
      });

      const activePicks = allPicks.filter(p => p.isActive);
      console.log(`\n✅ Active picks: ${activePicks.length}`);
      console.log(`❌ Inactive picks: ${allPicks.length - activePicks.length}`);
    }

    // Check if products table has any products
    const productCount = await prisma.product.count();
    console.log(`\n📦 Total products in database: ${productCount}`);

    if (productCount === 0) {
      console.log('\n⚠️  WARNING: No products found in database!');
      console.log('   Run product sync first: pnpm square-sync');
    }
  } catch (error) {
    console.error('❌ Error checking spotlight picks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpotlightPicks();
