// src/scripts/remove-all-manual-catering-items.ts
//
// 🧹 ELIMINAR TODOS LOS ITEMS MANUALES DE CATERING
// 
// OBJETIVO: Mantener SOLO items de Square como fuente única de verdad
// ESTRATEGIA: Eliminar todos los items que NO tienen squareProductId
//
// USO:
// pnpm tsx src/scripts/remove-all-manual-catering-items.ts --dry-run  # Vista previa
// pnpm tsx src/scripts/remove-all-manual-catering-items.ts --execute  # Ejecutar limpieza

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupSummary {
  beforeCleanup: {
    totalItems: number;
    squareItems: number;
    manualItems: number;
    breakdown: Array<{
      category: string;
      total: number;
      square: number;
      manual: number;
    }>;
  };
  itemsToDelete: Array<{
    id: string;
    name: string;
    squareCategory: string;
    price: number;
  }>;
  afterCleanup?: {
    totalItems: number;
    squareItems: number;
    manualItems: number;
  };
}

async function analyzeManualItems(): Promise<CleanupSummary> {
  console.log('🔍 Analizando items manuales para eliminación...\n');

  // Get current state by category
  const categoryCounts = await prisma.cateringItem.groupBy({
    by: ['squareCategory'],
    where: { isActive: true },
    _count: {
      _all: true,
    },
  });

  const breakdown = [];
  let totalItems = 0;
  let totalSquareItems = 0;
  let totalManualItems = 0;

  for (const categoryGroup of categoryCounts) {
    const category = categoryGroup.squareCategory || 'Unknown';
    const total = categoryGroup._count._all;
    
    const squareItems = await prisma.cateringItem.count({
      where: {
        isActive: true,
        squareCategory: categoryGroup.squareCategory,
        squareProductId: { not: null }
      }
    });
    
    const manualItems = total - squareItems;
    
    breakdown.push({
      category,
      total,
      square: squareItems,
      manual: manualItems
    });
    
    totalItems += total;
    totalSquareItems += squareItems;
    totalManualItems += manualItems;
  }

  // Get all manual items to delete
  const itemsToDelete = await prisma.cateringItem.findMany({
    where: {
      isActive: true,
      squareProductId: null
    },
    select: {
      id: true,
      name: true,
      squareCategory: true,
      price: true
    },
    orderBy: [
      { squareCategory: 'asc' },
      { name: 'asc' }
    ]
  });

  return {
    beforeCleanup: {
      totalItems,
      squareItems: totalSquareItems,
      manualItems: totalManualItems,
      breakdown
    },
    itemsToDelete: itemsToDelete.map(item => ({
      id: item.id,
      name: item.name,
      squareCategory: item.squareCategory || 'Unknown',
      price: Number(item.price)
    }))
  };
}

async function executeCleanup(summary: CleanupSummary): Promise<CleanupSummary> {
  console.log('🗑️  Ejecutando limpieza de items manuales...\n');

  const idsToDelete = summary.itemsToDelete.map(item => item.id);
  
  if (idsToDelete.length === 0) {
    console.log('✅ No hay items manuales para eliminar.');
    return summary;
  }

  // Delete all manual items
  const deleteResult = await prisma.cateringItem.deleteMany({
    where: {
      id: { in: idsToDelete }
    }
  });

  console.log(`🗑️  Eliminados ${deleteResult.count} items manuales.`);

  // Get post-cleanup state
  const afterTotalItems = await prisma.cateringItem.count({
    where: { isActive: true }
  });
  
  const afterSquareItems = await prisma.cateringItem.count({
    where: { 
      isActive: true,
      squareProductId: { not: null }
    }
  });

  summary.afterCleanup = {
    totalItems: afterTotalItems,
    squareItems: afterSquareItems,
    manualItems: 0 // Should be 0 after cleanup
  };

  return summary;
}

function printReport(summary: CleanupSummary, isDryRun: boolean = true) {
  console.log('📊 REPORTE DE LIMPIEZA DE ITEMS MANUALES');
  console.log('=' .repeat(60));
  
  if (isDryRun) {
    console.log('🔍 MODO: Vista Previa (--dry-run)\n');
  } else {
    console.log('✅ MODO: Ejecutado (--execute)\n');
  }

  // Before cleanup
  console.log('📊 ESTADO ANTES DE LA LIMPIEZA:');
  console.log(`   Total Items: ${summary.beforeCleanup.totalItems}`);
  console.log(`   Items de Square: ${summary.beforeCleanup.squareItems}`);
  console.log(`   Items Manuales: ${summary.beforeCleanup.manualItems}\n`);

  // Breakdown by category
  console.log('📈 DESGLOSE POR CATEGORÍA:');
  console.log('   Categoría                          Total   Square  Manual');
  console.log('   ' + '-'.repeat(58));
  
  for (const cat of summary.beforeCleanup.breakdown) {
    const category = cat.category.padEnd(32);
    const total = cat.total.toString().padStart(5);
    const square = cat.square.toString().padStart(7);
    const manual = cat.manual.toString().padStart(7);
    console.log(`   ${category} ${total} ${square} ${manual}`);
  }

  // Items to delete
  if (summary.itemsToDelete.length > 0) {
    console.log(`\n🗑️  ITEMS MANUALES A ELIMINAR (${summary.itemsToDelete.length}):`);
    console.log('   ' + '-'.repeat(70));
    
    let currentCategory = '';
    for (const item of summary.itemsToDelete) {
      if (item.squareCategory !== currentCategory) {
        currentCategory = item.squareCategory;
        console.log(`\n   📁 ${currentCategory}:`);
      }
      const price = item.price === 0 ? 'FREE' : `$${item.price}`;
      console.log(`      ❌ ${item.name} (${price})`);
    }
  } else {
    console.log('\n✅ No hay items manuales para eliminar.');
  }

  // After cleanup
  if (summary.afterCleanup) {
    console.log('\n📊 ESTADO DESPUÉS DE LA LIMPIEZA:');
    console.log(`   Total Items: ${summary.afterCleanup.totalItems}`);
    console.log(`   Items de Square: ${summary.afterCleanup.squareItems}`);
    console.log(`   Items Manuales: ${summary.afterCleanup.manualItems}`);
    
    const eliminated = summary.beforeCleanup.manualItems;
    console.log(`\n🎉 ÉXITO: Eliminados ${eliminated} items manuales`);
    console.log('   🏆 Square es ahora la ÚNICA fuente de verdad!');
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isExecute = process.argv.includes('--execute');
  
  if (!isDryRun && !isExecute) {
    console.log('❌ Especifica --dry-run o --execute');
    console.log('   pnpm tsx src/scripts/remove-all-manual-catering-items.ts --dry-run');
    console.log('   pnpm tsx src/scripts/remove-all-manual-catering-items.ts --execute');
    process.exit(1);
  }

  try {
    let summary = await analyzeManualItems();
    
    if (isExecute && summary.itemsToDelete.length > 0) {
      console.log('⚠️  ADVERTENCIA: Vas a eliminar TODOS los items manuales.');
      console.log('   Solo quedarán items sincronizados con Square.\n');
      
      summary = await executeCleanup(summary);
    }
    
    printReport(summary, isDryRun);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeManualItems, executeCleanup };
