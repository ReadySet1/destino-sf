#!/usr/bin/env tsx

/**
 * Cleanup Duplicate Platters Script
 * 
 * This script merges existing duplicate platter items ONLY in "CATERING- SHARE PLATTERS" category.
 * Converts separate "Product - Small" and "Product - Large" items into single products with Square variations.
 * 
 * ⚠️  IMPORTANT: Only affects SHARE PLATTERS category - all other categories remain as individual products.
 */

import { PrismaClient } from '@prisma/client';
import { VariationGrouper } from '../src/lib/square/variation-grouper';

const prisma = new PrismaClient();

interface ProductWithCategory {
  id: string;
  name: string;
  price: number;
  squareId: string | null;
  images: string[];
  description: string | null;
  slug: string | null;
  active: boolean;
  category: {
    name: string;
  };
  variants: Array<{
    id: string;
    name: string;
    price: number | null;
    squareVariantId: string | null;
  }>;
}

async function cleanupDuplicatePlatters() {
  console.log('🚀 Starting cleanup of duplicate platter items...');

  try {
    // Find all catering share platter products (including inactive ones)
    const sharePlatters = await prisma.product.findMany({
      where: {
        category: {
          name: 'CATERING- SHARE PLATTERS'
        }
        // Remove active: true filter to include inactive products
      },
      include: { 
        variants: true,
        category: true
      }
    }) as ProductWithCategory[];

    const activeCount = sharePlatters.filter(p => p.active).length;
    const inactiveCount = sharePlatters.length - activeCount;
    console.log(`📊 Found ${sharePlatters.length} share platter products (${activeCount} active, ${inactiveCount} inactive)`);

    if (sharePlatters.length === 0) {
      console.log('✅ No share platter products found. Nothing to cleanup.');
      return;
    }

    // Group by base name to identify duplicates
    const grouped = new Map<string, ProductWithCategory[]>();
    
    sharePlatters.forEach(product => {
      const { baseName } = VariationGrouper.detectSizePattern(product.name);
      const normalizedBaseName = VariationGrouper.normalizeProductName(baseName);
      
      if (!grouped.has(normalizedBaseName)) {
        grouped.set(normalizedBaseName, []);
      }
      grouped.get(normalizedBaseName)!.push(product);
    });

    console.log(`📦 Grouped into ${grouped.size} base products`);

    let mergedCount = 0;
    let variationsCreated = 0;
    let productsDeactivated = 0;
    let productsActivated = 0;

    // Process each group
    for (const [baseName, products] of grouped) {
      if (products.length > 1) {
        console.log(`\n🔄 Processing "${baseName}" (${products.length} duplicates)`);
        
        // Sort products by size preference (Small first, then Large)
        const sortedProducts = products.sort((a, b) => {
          const { size: sizeA } = VariationGrouper.detectSizePattern(a.name);
          const { size: sizeB } = VariationGrouper.detectSizePattern(b.name);
          
          const sizeOrder = { 'small': 1, 'regular': 2, 'large': 3 };
          const orderA = sizeOrder[sizeA?.toLowerCase() as keyof typeof sizeOrder] || 2;
          const orderB = sizeOrder[sizeB?.toLowerCase() as keyof typeof sizeOrder] || 2;
          
          return orderA - orderB;
        });

        // Keep the first product as the base (usually Small)
        const baseProduct = sortedProducts[0];
        const duplicates = sortedProducts.slice(1);

        console.log(`  📍 Using "${baseProduct.name}" as base product`);

        // Extract original base name without size suffix
        const { baseName: cleanBaseName } = VariationGrouper.detectSizePattern(baseProduct.name);

        // Check if base product was inactive
        const wasInactive = !baseProduct.active;
        
        // Update base product to remove size suffix from name and ensure it's active
        await prisma.product.update({
          where: { id: baseProduct.id },
          data: {
            name: cleanBaseName,
            // Use lowest price as base price
            price: Math.min(...sortedProducts.map(p => Number(p.price))),
            // Use best available image
            images: sortedProducts.find(p => p.images.length > 0)?.images || baseProduct.images,
            // Ensure base product is active
            active: true
          }
        });

        if (wasInactive) {
          productsActivated++;
          console.log(`  🔄 Activated base product: "${cleanBaseName}"`);
        } else {
          console.log(`  ✏️  Updated base product name to "${cleanBaseName}"`);
        }

        // Create variation for the base product if it doesn't have one
        const { size: baseSize } = VariationGrouper.detectSizePattern(baseProduct.name);
        const baseVariationName = VariationGrouper.generateVariantName(
          cleanBaseName, 
          baseSize || 'regular', 
          Number(baseProduct.price)
        );

        const existingBaseVariant = await prisma.variant.findFirst({
          where: {
            productId: baseProduct.id,
            squareVariantId: baseProduct.squareId
          }
        });

        if (!existingBaseVariant) {
          await prisma.variant.create({
            data: {
              productId: baseProduct.id,
              squareVariantId: baseProduct.squareId || `cleanup-base-${baseProduct.id}`,
              name: baseVariationName,
              price: baseProduct.price
            }
          });
          variationsCreated++;
          console.log(`  ➕ Created base variation: ${baseVariationName}`);
        }

        // Create variations from duplicates
        for (const duplicate of duplicates) {
          const { size } = VariationGrouper.detectSizePattern(duplicate.name);
          const variantName = VariationGrouper.generateVariantName(
            cleanBaseName,
            size || 'regular',
            Number(duplicate.price)
          );

          // Check if this variation already exists
          const existingVariant = await prisma.variant.findFirst({
            where: {
              productId: baseProduct.id,
              squareVariantId: duplicate.squareId
            }
          });

          if (!existingVariant) {
            await prisma.variant.create({
              data: {
                productId: baseProduct.id,
                squareVariantId: duplicate.squareId || `cleanup-${duplicate.id}`,
                name: variantName,
                price: duplicate.price
              }
            });
            variationsCreated++;
            console.log(`  ➕ Created variation: ${variantName}`);
          } else {
            console.log(`  ⏭️  Variation already exists: ${variantName}`);
          }

          // Deactivate duplicate product
          await prisma.product.update({
            where: { id: duplicate.id },
            data: { active: false }
          });
          productsDeactivated++;
          console.log(`  🗑️  Deactivated duplicate: "${duplicate.name}"`);
        }

        mergedCount++;
        console.log(`  ✅ Merged "${cleanBaseName}" (${duplicates.length} variations created)`);
      } else {
        console.log(`\n👍 "${products[0].name}" - No duplicates found`);
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`  🔗 Products merged: ${mergedCount}`);
    console.log(`  📝 Variations created: ${variationsCreated}`);
    console.log(`  🔄 Products activated: ${productsActivated}`);
    console.log(`  🗑️  Products deactivated: ${productsDeactivated}`);
    console.log('  ✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Show usage if called with --help
if (process.argv.includes('--help')) {
  console.log(`
🔧 Cleanup Duplicate Platters Script

This script merges duplicate platter items in the "CATERING- SHARE PLATTERS" category
into single products with size variations.

Usage:
  tsx scripts/cleanup-duplicate-platters.ts [options]

Options:
  --help    Show this help message
  --dry-run Preview what would be changed (not implemented yet)

Examples:
  # Run the cleanup
  tsx scripts/cleanup-duplicate-platters.ts

What it does:
  1. Finds all products in "CATERING- SHARE PLATTERS" category ONLY (including inactive)
  2. Groups products by base name (removing size suffixes like "- Small", "- Large")  
  3. For each group with duplicates:
     - Keeps the first product as the base
     - Updates the base product name to remove size suffix
     - Activates the base product if it was inactive
     - Creates database variations for each size/price combination
     - Deactivates duplicate products
  4. Other categories remain unchanged as individual products

⚠️  IMPORTANT: 
  - Only affects SHARE PLATTERS category
  - Make sure to backup your database before running this script!
  - After running this, configure actual Square variations in Square Dashboard
`);
  process.exit(0);
}

// Run the cleanup (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDuplicatePlatters()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { cleanupDuplicatePlatters };
