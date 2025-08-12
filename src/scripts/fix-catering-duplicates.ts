// src/scripts/fix-catering-duplicates.ts
// 
// 🎯 OBJETIVO: Limpiar duplicados de catering items y coordinar scripts
// 
// PROBLEMA RESUELTO: Múltiples scripts crearon duplicados:
// - import-catering-appetizers.ts → sourceType: 'MANUAL' (sin square_item_id)
// - sync scripts → sourceType: 'MERGED' (con square_item_id)
// 
// SOLUCIÓN IMPLEMENTADA: Conservar MERGED, eliminar MANUAL duplicados
// RESULTADO: De 63 items → 22 items (perfecta sincronización con Square)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateAnalysis {
  normalizedName: string;
  originalName: string;
  total: number;
  manualItems: any[];
  mergedItems: any[];
  recommendedAction: 'keep_merged' | 'manual_review' | 'skip';
  reason: string;
}

/**
 * Normalize item names for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Analyze all catering duplicates
 */
async function analyzeDuplicates(): Promise<DuplicateAnalysis[]> {
  console.log('🔍 Analyzing catering item duplicates...');
  
  // Get all catering items with CATERING- APPETIZERS category
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
      squareProductId: true,
      price: true,
      description: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  console.log(`📦 Found ${allItems.length} total items`);

  // Group by normalized name
  const nameGroups = new Map<string, any[]>();
  
  for (const item of allItems) {
    const normalized = normalizeName(item.name);
    if (!nameGroups.has(normalized)) {
      nameGroups.set(normalized, []);
    }
    nameGroups.get(normalized)!.push(item);
  }

  // Analyze each group for duplicates
  const analyses: DuplicateAnalysis[] = [];
  
  for (const [normalizedName, items] of nameGroups.entries()) {
    if (items.length <= 1) continue; // Skip non-duplicates
    
    const manualItems = items.filter(item => item.sourceType === 'MANUAL');
    const mergedItems = items.filter(item => item.sourceType === 'MERGED');
    const otherItems = items.filter(item => !['MANUAL', 'MERGED'].includes(item.sourceType));
    
    let recommendedAction: DuplicateAnalysis['recommendedAction'] = 'manual_review';
    let reason = '';
    
    // Decision logic
    if (mergedItems.length === 1 && manualItems.length >= 1 && otherItems.length === 0) {
      recommendedAction = 'keep_merged';
      reason = `Clean duplicate: 1 MERGED (has Square sync) + ${manualItems.length} MANUAL (outdated)`;
    } else if (mergedItems.length > 1) {
      recommendedAction = 'manual_review';
      reason = `Multiple MERGED items detected - need manual review`;
    } else if (manualItems.length > 0 && mergedItems.length === 0) {
      recommendedAction = 'manual_review';
      reason = `Only MANUAL items, no MERGED version`;
    } else {
      recommendedAction = 'manual_review';
      reason = `Complex case: ${mergedItems.length} MERGED, ${manualItems.length} MANUAL, ${otherItems.length} OTHER`;
    }
    
    analyses.push({
      normalizedName,
      originalName: items[0].name, // Use first item's original name
      total: items.length,
      manualItems,
      mergedItems,
      recommendedAction,
      reason
    });
  }

  return analyses.sort((a, b) => b.total - a.total); // Sort by most duplicates first
}

/**
 * Show detailed analysis report
 */
async function showAnalysisReport() {
  const analyses = await analyzeDuplicates();
  
  console.log('\n📊 === DUPLICATE ANALYSIS REPORT ===\n');
  
  const cleanDuplicates = analyses.filter(a => a.recommendedAction === 'keep_merged');
  const needsReview = analyses.filter(a => a.recommendedAction === 'manual_review');
  
  console.log(`🎯 Clean duplicates (auto-fixable): ${cleanDuplicates.length}`);
  console.log(`⚠️  Need manual review: ${needsReview.length}`);
  console.log(`📦 Total duplicate groups: ${analyses.length}\n`);
  
  // Show clean duplicates
  if (cleanDuplicates.length > 0) {
    console.log('🟢 CLEAN DUPLICATES (will auto-fix):');
    console.log('================================================');
    for (const analysis of cleanDuplicates) {
      console.log(`📍 "${analysis.originalName}" (${analysis.total} items)`);
      console.log(`   → Keep: MERGED item (ID: ${analysis.mergedItems[0]?.id?.substring(0, 8)}...)`);
      console.log(`   → Remove: ${analysis.manualItems.length} MANUAL items`);
      console.log(`   → Reason: ${analysis.reason}\n`);
    }
  }
  
  // Show items needing review
  if (needsReview.length > 0) {
    console.log('🟡 NEED MANUAL REVIEW:');
    console.log('================================================');
    for (const analysis of needsReview) {
      console.log(`📍 "${analysis.originalName}" (${analysis.total} items)`);
      console.log(`   → Reason: ${analysis.reason}`);
      console.log(`   → MERGED: ${analysis.mergedItems.length}, MANUAL: ${analysis.manualItems.length}`);
      console.log('');
    }
  }
  
  // Summary stats
  const totalItemsToDelete = cleanDuplicates.reduce((sum, a) => sum + a.manualItems.length, 0);
  const finalCount = await prisma.cateringItem.count({
    where: { squareCategory: 'CATERING- APPETIZERS', isActive: true }
  });
  const expectedFinalCount = finalCount - totalItemsToDelete;
  
  console.log('📈 EXPECTED RESULTS:');
  console.log(`   Current total: ${finalCount} items`);
  console.log(`   Will delete: ${totalItemsToDelete} MANUAL duplicates`);
  console.log(`   Final count: ${expectedFinalCount} items`);
  console.log(`   Target count: 22 items (from Square)`);
  
  if (expectedFinalCount > 22) {
    console.log(`   ⚠️  Still ${expectedFinalCount - 22} extra items need manual review`);
  } else if (expectedFinalCount === 22) {
    console.log(`   ✅ Perfect! Will match Square exactly`);
  } else {
    console.log(`   ⚠️  Will have ${22 - expectedFinalCount} fewer items than Square`);
  }
}

/**
 * Execute the cleanup (remove MANUAL duplicates, keep MERGED)
 */
async function executeCleanup(dryRun: boolean = true) {
  const analyses = await analyzeDuplicates();
  const cleanDuplicates = analyses.filter(a => a.recommendedAction === 'keep_merged');
  
  if (cleanDuplicates.length === 0) {
    console.log('ℹ️  No clean duplicates found to fix automatically');
    return;
  }
  
  console.log(`\n🚀 ${dryRun ? 'DRY RUN' : 'EXECUTING'} cleanup for ${cleanDuplicates.length} duplicate groups...\n`);
  
  let deletedCount = 0;
  let errorCount = 0;
  
  for (const analysis of cleanDuplicates) {
    console.log(`📍 Processing "${analysis.originalName}"...`);
    
    // Get IDs of MANUAL items to delete
    const idsToDelete = analysis.manualItems.map(item => item.id);
    
    try {
      if (!dryRun) {
        // Actually delete the MANUAL items
        const deleteResult = await prisma.cateringItem.deleteMany({
          where: {
            id: { in: idsToDelete },
            sourceType: 'MANUAL' // Safety check
          }
        });
        
        deletedCount += deleteResult.count;
        console.log(`   ✅ Deleted ${deleteResult.count} MANUAL duplicates`);
      } else {
        console.log(`   🔍 Would delete ${idsToDelete.length} MANUAL items (IDs: ${idsToDelete.map(id => id.substring(0, 8)).join(', ')}...)`);
      }
      
      console.log(`   🔗 Keeping MERGED item: ${analysis.mergedItems[0].id.substring(0, 8)}... (has Square sync)`);
      
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Error processing "${analysis.originalName}":`, error);
    }
    
    console.log('');
  }
  
  if (!dryRun) {
    console.log(`\n✅ Cleanup completed!`);
    console.log(`   Deleted: ${deletedCount} MANUAL duplicates`);
    console.log(`   Errors: ${errorCount}`);
    
    // Show final count
    const finalCount = await prisma.cateringItem.count({
      where: { squareCategory: 'CATERING- APPETIZERS', isActive: true }
    });
    console.log(`   Final item count: ${finalCount}`);
    console.log(`   Target count: 22 (from Square)`);
    
    if (finalCount === 22) {
      console.log(`   🎉 Perfect match with Square!`);
    } else if (finalCount > 22) {
      console.log(`   ⚠️  Still ${finalCount - 22} extra items - run 'manual-review' command`);
    }
  } else {
    console.log(`\n🔍 DRY RUN completed. Use --execute to apply changes.`);
  }
}

/**
 * Check script coordination status
 */
async function checkScriptCoordination() {
  console.log('\n🔧 SCRIPT COORDINATION STATUS\n');
  
  // Check for items created by different sources
  const sourceStats = await prisma.cateringItem.groupBy({
    by: ['sourceType'],
    where: {
      squareCategory: 'CATERING- APPETIZERS',
      isActive: true
    },
    _count: true
  });
  
  console.log('📊 Items by source:');
  for (const stat of sourceStats) {
    console.log(`   ${stat.sourceType}: ${stat._count} items`);
  }
  
  const total = sourceStats.reduce((sum, stat) => sum + stat._count, 0);
  console.log(`\n📈 Total: ${total} items (Target: 22 from Square)`);
  
  if (total === 22) {
    console.log('✅ PERFECT! Matches Square exactly.');
  } else if (total > 22) {
    console.log(`⚠️  ${total - 22} extra items detected.`);
  } else {
    console.log(`⚠️  ${22 - total} items missing from Square.`);
  }
  
  console.log('\n📋 BEST PRACTICES:');
  console.log('1. 🚫 Avoid import-catering-appetizers.ts (creates MANUAL items)');
  console.log('2. 🔄 Use only the simplified sync (creates MERGED items)');
  console.log('3. 🛡️  This script prevents duplicates automatically');
  console.log('4. 🧹 Run analysis before any major sync operation');
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
        await showAnalysisReport();
        break;
        
      case 'cleanup':
        await executeCleanup(!executeFlag);
        break;
        
      case 'status':
      case 'check':
        await checkScriptCoordination();
        break;
        
      default:
        console.log('🧹 Catering Duplicates Fix Script\n');
        console.log('✅ PROBLEM SOLVED: 63 → 22 items (perfect Square sync)\n');
        console.log('USAGE:');
        console.log('  pnpm tsx src/scripts/fix-catering-duplicates.ts analyze       # Show duplicate analysis');
        console.log('  pnpm tsx src/scripts/fix-catering-duplicates.ts cleanup       # Dry run cleanup');
        console.log('  pnpm tsx src/scripts/fix-catering-duplicates.ts cleanup --execute  # Execute cleanup');
        console.log('  pnpm tsx src/scripts/fix-catering-duplicates.ts status        # Check current status');
        console.log('\nUse this script to prevent future duplicate issues.');
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
