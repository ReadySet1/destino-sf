#!/usr/bin/env tsx

/**
 * Quick diagnostic script to check catering data integrity
 * Use this after database resets or sync operations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CateringDataStatus {
  totalItems: number;
  zeropriceItems: number;
  totalPackages: number;
  appetizerPackages: number;
  isAppetizerSectionWorking: boolean;
  issues: string[];
  suggestions: string[];
}

async function checkCateringData(): Promise<CateringDataStatus> {
  console.log('🔍 Checking catering data integrity...\n');

  const status: CateringDataStatus = {
    totalItems: 0,
    zeropriceItems: 0,
    totalPackages: 0,
    appetizerPackages: 0,
    isAppetizerSectionWorking: false,
    issues: [],
    suggestions: [],
  };

  try {
    // Check catering items
    const itemStats = await prisma.cateringItem.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
      },
    });

    const zeropriceStats = await prisma.cateringItem.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
        price: 0,
      },
    });

    status.totalItems = itemStats._count.id || 0;
    status.zeropriceItems = zeropriceStats._count.id || 0;

    // Check catering packages
    const packageStats = await prisma.cateringPackage.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
      },
    });

    const appetizerPackageStats = await prisma.cateringPackage.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
        name: {
          contains: 'Appetizer Selection',
        },
      },
    });

    status.totalPackages = packageStats._count.id || 0;
    status.appetizerPackages = appetizerPackageStats._count.id || 0;

    // Determine if appetizer section will work
    status.isAppetizerSectionWorking = status.appetizerPackages > 0 && status.zeropriceItems > 0;

    // Identify issues
    if (status.totalItems === 0) {
      status.issues.push('No catering items found');
      status.suggestions.push('Run Square sync to import catering items');
    }

    if (status.zeropriceItems === 0) {
      status.issues.push('No zero-price (package-only) items found');
      status.suggestions.push('Run setup-catering-menu-2025.ts to create package items');
    }

    if (status.totalPackages === 0) {
      status.issues.push('No catering packages found');
      status.suggestions.push('Run setup-catering-menu-2025.ts to create packages');
    }

    if (status.appetizerPackages === 0) {
      status.issues.push('No appetizer packages found');
      status.suggestions.push('Run setup-catering-menu-2025.ts to create appetizer packages');
    }

    if (!status.isAppetizerSectionWorking) {
      status.issues.push('Appetizer section will show "packages unavailable" message');
    }
  } catch (error) {
    status.issues.push(`Database error: ${error instanceof Error ? error.message : String(error)}`);
    status.suggestions.push('Check database connection and schema');
  }

  return status;
}

function displayResults(status: CateringDataStatus) {
  console.log('📊 CATERING DATA STATUS');
  console.log('========================');
  console.log(`Total Items: ${status.totalItems}`);
  console.log(`Zero-price Items: ${status.zeropriceItems}`);
  console.log(`Total Packages: ${status.totalPackages}`);
  console.log(`Appetizer Packages: ${status.appetizerPackages}`);
  console.log(
    `Appetizer Section Working: ${status.isAppetizerSectionWorking ? '✅ YES' : '❌ NO'}`
  );

  if (status.issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND');
    console.log('================');
    status.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  if (status.suggestions.length > 0) {
    console.log('\n💡 SUGGESTED FIXES');
    console.log('==================');
    status.suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });

    console.log('\n🛠️  QUICK FIX COMMANDS');
    console.log('======================');
    console.log('npx tsx src/scripts/setup-catering-menu-2025.ts');
    console.log('# OR run Square sync if items are missing entirely');
  }

  if (status.isAppetizerSectionWorking) {
    console.log('\n🎉 All catering data looks good!');
  }
}

async function main() {
  try {
    const status = await checkCateringData();
    displayResults(status);
  } catch (error) {
    console.error('❌ Error checking catering data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
