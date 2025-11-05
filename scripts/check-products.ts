/**
 * Check Products in Database
 * Diagnostic script to see product counts by category
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('🔍 Checking products table...\n');

    // Total products
    const totalProducts = await prisma.product.count();
    console.log(`📦 Total products: ${totalProducts}`);

    // Products by availability
    const availableCount = await prisma.product.count({ where: { isAvailable: true } });
    const unavailableCount = totalProducts - availableCount;
    console.log(`  ✅ Available: ${availableCount}`);
    console.log(`  ❌ Unavailable: ${unavailableCount}`);

    // Products by category
    console.log('\n📊 Products by Category:\n');
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        products: {
          _count: 'desc',
        },
      },
    });

    categories.forEach((cat) => {
      if (cat._count.products > 0) {
        console.log(`  ${cat.name}: ${cat._count.products} products`);
      }
    });

    // Check EMPANADAS specifically
    console.log('\n🌮 EMPANADAS Category Details:\n');
    const empanadasCategory = await prisma.category.findFirst({
      where: {
        name: 'EMPANADAS',
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
            squareId: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!empanadasCategory || empanadasCategory.products.length === 0) {
      console.log('  ❌ No empanadas found!');

      // Check if category exists
      const allCategories = await prisma.category.findMany({
        select: { name: true, slug: true },
      });
      console.log('\n📋 All categories in database:');
      allCategories.forEach(cat => console.log(`    - ${cat.name} (${cat.slug})`));
    } else {
      console.log(`  Found ${empanadasCategory.products.length} empanadas:`);
      empanadasCategory.products.forEach((emp, idx) => {
        const status = emp.isAvailable ? '✅' : '❌';
        console.log(`    ${idx + 1}. ${status} ${emp.name} - $${emp.price}`);
      });
    }

    // Recent sync info
    console.log('\n⏰ Recent Syncs:\n');
    const recentSyncs = await prisma.syncLog.findMany({
      take: 5,
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        startedAt: true,
        status: true,
        itemsSynced: true,
        errorMessage: true,
      },
    });

    if (recentSyncs.length === 0) {
      console.log('  No sync logs found');
    } else {
      recentSyncs.forEach((log, idx) => {
        const statusIcon = log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '⏳';
        console.log(`  ${idx + 1}. ${statusIcon} ${log.startedAt.toLocaleString()}`);
        console.log(`     Items synced: ${log.itemsSynced || 0}`);
        if (log.errorMessage) {
          console.log(`     Error: ${log.errorMessage.substring(0, 100)}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error checking products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
