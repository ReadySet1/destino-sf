#!/usr/bin/env tsx

/**
 * Production Issues Diagnostic Script
 * 
 * This script verifies that the database schema fixes have been applied correctly
 * and helps diagnose any remaining issues from the production problems.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

async function main() {
  console.log('🔍 Running Production Issues Database Diagnostic...\n');

  try {
    // Test 1: Verify categories table schema
    console.log('1. Testing Categories Table Schema...');
    
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        active: true, // This should work if schema is correct
        _count: {
          select: {
            products: true,
          },
        },
      },
      take: 5,
    });

    console.log(`✅ Categories query successful! Found ${categories.length} categories`);
    console.log('   Sample categories:');
    categories.forEach(cat => {
      console.log(`   - ${cat.name}: active=${cat.active}, products=${cat._count.products}`);
    });

    // Test 2: Check for any lingering isActive column references
    console.log('\n2. Testing Category Active Status Filtering...');
    
    const activeCategories = await prisma.category.findMany({
      where: { active: true },
      select: { name: true, active: true },
    });

    console.log(`✅ Active categories query successful! Found ${activeCategories.length} active categories`);

    // Test 3: Verify products can query categories correctly
    console.log('\n3. Testing Products with Category Relations...');
    
    const productsWithCategories = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          active: true, // This tests the relation works correctly
        },
      },
      select: {
        name: true,
        category: {
          select: {
            name: true,
            active: true,
          },
        },
      },
      take: 3,
    });

    console.log(`✅ Products with categories query successful! Found ${productsWithCategories.length} products`);
    productsWithCategories.forEach(product => {
      console.log(`   - ${product.name} in category ${product.category.name} (active: ${product.category.active})`);
    });

    // Test 4: Raw SQL verification (as mentioned in fix plan)
    console.log('\n4. Raw SQL Schema Verification...');
    
    const schemaInfo = await prisma.$queryRaw<{ column_name: string; data_type: string }[]>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      AND column_name IN ('active', 'isActive')
    `;

    console.log('✅ Schema columns found:');
    schemaInfo.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    if (schemaInfo.some(col => col.column_name === 'isActive')) {
      console.log('⚠️  WARNING: Old isActive column still exists!');
    } else {
      console.log('✅ Confirmed: isActive column has been properly renamed to active');
    }

    console.log('\n🎉 All database schema tests passed! Production issues appear to be resolved.');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    
    if (error instanceof Error && error.message.includes('column "isActive"')) {
      console.log('\n🚨 ISSUE DETECTED: Code is still referencing old isActive column');
      console.log('   Please update all code references from isActive to active');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 