// src/scripts/cleanup-remaining-duplicates.ts
// 
// 🎯 OBJETIVO: Limpiar duplicados sutiles que el primer script no detectó
// 
// CASOS DETECTADOS:
// 1. "Pan con Tomate" (MANUAL) vs "pa amb tomàquet" (MERGED) - mismo item
// 2. "pintxos vegetarianos (Package Option)" vs "pintxos vegetarianos" 
// 3. "Tamal Verde" vs "tamal verde Empanada"
// 4. Items legacy sin Square sync (precio >0, no sincronizados)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SubtleDuplicate {
  manualItem: any;
  mergedItem: any;
  similarity: number;
  reason: string;
  action: 'safe_delete' | 'needs_review';
}

/**
 * Detect subtle duplicates using fuzzy matching
 */
function detectSubtleDuplicates(manualItems: any[], mergedItems: any[]): SubtleDuplicate[] {
  const duplicates: SubtleDuplicate[] = [];
  
  for (const manual of manualItems) {
    for (const merged of mergedItems) {
      const similarity = calculateSimilarity(manual.name, merged.name);
      let reason = '';
      let action: 'safe_delete' | 'needs_review' = 'needs_review';
      let adjustedSimilarity = similarity;
      
      // Known exact matches (different languages/formatting)
      if (
        (manual.name.toLowerCase() === 'pan con tomate' && merged.name.toLowerCase() === 'pa amb tomàquet') ||
        (manual.name.toLowerCase().includes('tamal verde') && merged.name.toLowerCase().includes('tamal verde')) ||
        (manual.name.toLowerCase().includes('pintxos vegetarianos') && merged.name.toLowerCase().includes('pintxos vegetarianos'))
      ) {
        adjustedSimilarity = 1.0;
        reason = 'Known duplicate: same item, different language/format';
        action = 'safe_delete';
      }
      // High text similarity
      else if (similarity > 0.8) {
        reason = `High similarity (${Math.round(similarity * 100)}%): likely same item`;
        action = 'safe_delete';
      }
      // Moderate similarity  
      else if (adjustedSimilarity > 0.6) {
        reason = `Moderate similarity (${Math.round(adjustedSimilarity * 100)}%): needs review`;
        action = 'needs_review';
      }
      
      if (adjustedSimilarity > 0.6) {
        duplicates.push({
          manualItem: manual,
          mergedItem: merged,
          similarity: adjustedSimilarity,
          reason,
          action
        });
      }
    }
  }
  
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  
  const a = normalize(str1);
  const b = normalize(str2);
  
  if (a === b) return 1.0;
  
  // Calculate Jaccard similarity using words
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  
  const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

/**
 * Analyze remaining items
 */
async function analyzeRemainingItems() {
  console.log('🔍 Analyzing remaining catering items...\n');
  
  const allItems = await prisma.cateringItem.findMany({
    where: {
      squareCategory: 'CATERING- APPETIZERS',
      isActive: true
    },
    select: {
      id: true,
      name: true,
      sourceType: true,
      squareItemId: true,
      price: true,
      description: true
    },
    orderBy: { name: 'asc' }
  });
  
  const manualItems = allItems.filter(item => item.sourceType === 'MANUAL');
  const mergedItems = allItems.filter(item => item.sourceType === 'MERGED');
  
  console.log(`📊 Current Status:`);
  console.log(`   Total items: ${allItems.length}`);
  console.log(`   MANUAL items: ${manualItems.length}`);
  console.log(`   MERGED items: ${mergedItems.length}`);
  console.log(`   Target: 22 items from Square\n`);
  
  if (manualItems.length === 0) {
    console.log('✅ No MANUAL items found. All items are properly synced!');
    return;
  }
  
  // Show remaining MANUAL items
  console.log('🟡 Remaining MANUAL items:');
  console.log('================================================');
  for (const item of manualItems) {
    const hasSquareSync = !!item.squareItemId;
    const priceStatus = Number(item.price) === 0 ? 'FREE' : `$${item.price}`;
    console.log(`📍 "${item.name}" (${priceStatus}, ${hasSquareSync ? 'HAS_SQUARE_ID' : 'NO_SQUARE_ID'})`);
    console.log(`   Description: ${item.description?.substring(0, 80)}...`);
  }
  
  // Detect subtle duplicates
  console.log('\n🔍 Detecting subtle duplicates...');
  const subtleDuplicates = detectSubtleDuplicates(manualItems, mergedItems);
  
  if (subtleDuplicates.length > 0) {
    console.log('\n🚨 SUBTLE DUPLICATES FOUND:');
    console.log('================================================');
    
    const safeDeletions = subtleDuplicates.filter(d => d.action === 'safe_delete');
    const needsReview = subtleDuplicates.filter(d => d.action === 'needs_review');
    
    for (const dup of subtleDuplicates) {
      const icon = dup.action === 'safe_delete' ? '🟢' : '🟡';
      console.log(`${icon} MANUAL: "${dup.manualItem.name}"`);
      console.log(`   MERGED: "${dup.mergedItem.name}"`);
      console.log(`   Similarity: ${Math.round(dup.similarity * 100)}%`);
      console.log(`   Reason: ${dup.reason}`);
      console.log(`   Action: ${dup.action}\n`);
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   Safe deletions: ${safeDeletions.length} duplicates`);
    console.log(`   Need review: ${needsReview.length} items`);
    console.log(`   After cleanup: ${allItems.length - safeDeletions.length} items`);
  } else {
    console.log('   ✅ No subtle duplicates detected');
  }
  
  // Check legacy items (high price, no Square sync)
  const legacyItems = manualItems.filter(item => 
    parseFloat(item.price.toString()) > 0 && !item.squareItemId
  );
  
  if (legacyItems.length > 0) {
    console.log('\n🏚️  LEGACY ITEMS (not in Square sync):');
    console.log('================================================');
    for (const item of legacyItems) {
      console.log(`📍 "${item.name}" ($${item.price})`);
      console.log(`   → Not synced with Square, likely old menu item`);
    }
    console.log(`\nThese ${legacyItems.length} items are probably from old menu versions.`);
    console.log('Consider removing if not needed for catering packages.');
  }
}

/**
 * Execute cleanup of safe duplicates
 */
async function executeSafeCleanup(dryRun: boolean = true) {
  const allItems = await prisma.cateringItem.findMany({
    where: {
      squareCategory: 'CATERING- APPETIZERS',
      isActive: true
    },
    select: {
      id: true,
      name: true,
      sourceType: true,
      squareItemId: true,
      price: true
    }
  });
  
  const manualItems = allItems.filter(item => item.sourceType === 'MANUAL');
  const mergedItems = allItems.filter(item => item.sourceType === 'MERGED');
  
  const subtleDuplicates = detectSubtleDuplicates(manualItems, mergedItems);
  const safeDeletions = subtleDuplicates.filter(d => d.action === 'safe_delete');
  
  if (safeDeletions.length === 0) {
    console.log('ℹ️  No safe duplicates found to delete.');
    return;
  }
  
  console.log(`\n🚀 ${dryRun ? 'DRY RUN' : 'EXECUTING'} safe duplicate cleanup...\n`);
  
  let deletedCount = 0;
  
  for (const dup of safeDeletions) {
    console.log(`📍 Processing "${dup.manualItem.name}"...`);
    console.log(`   → Deleting MANUAL version (similarity: ${Math.round(dup.similarity * 100)}%)`);
    console.log(`   → Keeping MERGED version: "${dup.mergedItem.name}"`);
    
    if (!dryRun) {
      try {
        await prisma.cateringItem.delete({
          where: { id: dup.manualItem.id }
        });
        deletedCount++;
        console.log(`   ✅ Deleted successfully`);
      } catch (error) {
        console.error(`   ❌ Error deleting:`, error);
      }
    } else {
      console.log(`   🔍 Would delete ID: ${dup.manualItem.id}`);
    }
    console.log('');
  }
  
  if (!dryRun) {
    const finalCount = await prisma.cateringItem.count({
      where: { squareCategory: 'CATERING- APPETIZERS', isActive: true }
    });
    
    console.log(`\n✅ Safe cleanup completed!`);
    console.log(`   Deleted: ${deletedCount} subtle duplicates`);
    console.log(`   Final count: ${finalCount} items`);
    console.log(`   Target: 22 items from Square`);
    
    if (finalCount === 22) {
      console.log(`   🎉 Perfect match!`);
    } else if (finalCount > 22) {
      console.log(`   ⚠️  Still ${finalCount - 22} extra items (likely legacy items)`);
    }
  } else {
    console.log(`\n🔍 DRY RUN completed. Use --execute to apply changes.`);
  }
}

/**
 * Main command handler
 */
async function main() {
  const command = process.argv[2];
  const executeFlag = process.argv.includes('--execute');
  
  try {
    switch (command) {
      case 'analyze':
        await analyzeRemainingItems();
        break;
        
      case 'cleanup':
        await executeSafeCleanup(!executeFlag);
        break;
        
      default:
        console.log('🧹 Remaining Duplicates Cleanup Script\n');
        console.log('USAGE:');
        console.log('  pnpm tsx src/scripts/cleanup-remaining-duplicates.ts analyze    # Analyze remaining items');
        console.log('  pnpm tsx src/scripts/cleanup-remaining-duplicates.ts cleanup    # Dry run cleanup');
        console.log('  pnpm tsx src/scripts/cleanup-remaining-duplicates.ts cleanup --execute  # Execute cleanup');
        console.log('\nCleans subtle duplicates and identifies legacy items.');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute
main();
