// src/scripts/cleanup-dessert-duplicates.ts
//
// 🧹 LIMPIEZA DE DESSERTS DUPLICADOS
// 
// OBJETIVO: Eliminar desserts duplicados manteniendo solo las versiones de Square
// ESTRATEGIA: Square es la fuente autoritativa - eliminar items sin squareProductId
//
// USO:
// pnpm tsx src/scripts/cleanup-dessert-duplicates.ts --dry-run  # Vista previa
// pnpm tsx src/scripts/cleanup-dessert-duplicates.ts --execute  # Ejecutar limpieza

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateAnalysis {
  duplicateGroups: Array<{
    names: string[];
    squareItems: Array<{ id: string; name: string; squareProductId: string }>;
    manualItems: Array<{ id: string; name: string }>;
    toDelete: Array<{ id: string; name: string; reason: string }>;
  }>;
  summary: {
    totalDuplicates: number;
    squareItems: number;
    manualItems: number;
    itemsToDelete: number;
  };
}

class DessertDuplicateCleanup {
  
  /**
   * Analizar duplicados en desserts de catering
   */
  async analyzeDuplicates(): Promise<DuplicateAnalysis> {
    console.log('🔍 Analizando duplicados en desserts de catering...');

    // Obtener todos los desserts de catering
    const allDesserts = await prisma.cateringItem.findMany({
      where: {
        squareCategory: 'CATERING- DESSERTS',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        squareProductId: true,
        price: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 Encontrados ${allDesserts.length} desserts en total`);

    // Normalizar nombres para detectar duplicados
    const nameGroups = new Map<string, typeof allDesserts>();
    
    allDesserts.forEach(item => {
      const normalizedName = this.normalizeItemName(item.name);
      if (!nameGroups.has(normalizedName)) {
        nameGroups.set(normalizedName, []);
      }
      nameGroups.get(normalizedName)!.push(item);
    });

    // Encontrar grupos con duplicados
    const duplicateGroups = Array.from(nameGroups.entries())
      .filter(([_, items]) => items.length > 1)
      .map(([normalizedName, items]) => {
        const squareItems = items.filter(item => item.squareProductId !== null);
        const manualItems = items.filter(item => item.squareProductId === null);
        
        // Decidir qué eliminar
        const toDelete: Array<{ id: string; name: string; reason: string }> = [];
        
        if (squareItems.length > 0) {
          // Si hay items de Square, eliminar todos los manuales
          manualItems.forEach(item => {
            toDelete.push({
              id: item.id,
              name: item.name,
              reason: `Duplicado manual - existe versión de Square: "${squareItems[0].name}"`
            });
          });
        } else {
          // Si todos son manuales, mantener el primero alfabéticamente
          const sorted = manualItems.sort((a, b) => a.name.localeCompare(b.name));
          sorted.slice(1).forEach(item => {
            toDelete.push({
              id: item.id,
              name: item.name,
              reason: `Duplicado manual - manteniendo: "${sorted[0].name}"`
            });
          });
        }

        return {
          names: items.map(i => i.name),
          squareItems: squareItems.map(i => ({ 
            id: i.id, 
            name: i.name, 
            squareProductId: i.squareProductId! 
          })),
          manualItems: manualItems.map(i => ({ 
            id: i.id, 
            name: i.name 
          })),
          toDelete
        };
      });

    // Calcular resumen
    const summary = {
      totalDuplicates: allDesserts.length,
      squareItems: allDesserts.filter(i => i.squareProductId !== null).length,
      manualItems: allDesserts.filter(i => i.squareProductId === null).length,
      itemsToDelete: duplicateGroups.reduce((acc, group) => acc + group.toDelete.length, 0)
    };

    return {
      duplicateGroups,
      summary
    };
  }

  /**
   * Normalizar nombre de item para comparación
   */
  private normalizeItemName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*-\s*/g, ' ')  // "Alfajores - Classic" -> "alfajores classic"
      .replace(/[^\w\s]/g, '')   // remover puntuación
      .replace(/\s+/g, ' ')      // normalizar espacios
      .trim();
  }

  /**
   * Ejecutar limpieza de duplicados
   */
  async executeCleanup(dryRun: boolean = true): Promise<{
    deleted: number;
    errors: string[];
    deletedItems: Array<{ id: string; name: string; reason: string }>;
  }> {
    const analysis = await this.analyzeDuplicates();
    const result = {
      deleted: 0,
      errors: [] as string[],
      deletedItems: [] as Array<{ id: string; name: string; reason: string }>
    };

    if (analysis.summary.itemsToDelete === 0) {
      console.log('✅ No se encontraron duplicados para limpiar');
      return result;
    }

    console.log(`\n${dryRun ? '🔍 DRY RUN' : '🧹 EJECUTANDO LIMPIEZA'}`);
    console.log(`Items a eliminar: ${analysis.summary.itemsToDelete}`);

    // Procesar cada grupo de duplicados
    for (const group of analysis.duplicateGroups) {
      if (group.toDelete.length === 0) continue;

      console.log(`\n📝 Grupo: ${group.names.join(', ')}`);
      console.log(`   Square items: ${group.squareItems.length}`);
      console.log(`   Manual items: ${group.manualItems.length}`);
      console.log(`   A eliminar: ${group.toDelete.length}`);

      for (const itemToDelete of group.toDelete) {
        try {
          console.log(`   ${dryRun ? '🔍' : '🗑️ '} "${itemToDelete.name}" - ${itemToDelete.reason}`);
          
          if (!dryRun) {
            await prisma.cateringItem.delete({
              where: { id: itemToDelete.id }
            });
            result.deleted++;
          }
          
          result.deletedItems.push(itemToDelete);
        } catch (error) {
          const errorMsg = `Error eliminando "${itemToDelete.name}": ${error}`;
          console.error(`   ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
    }

    return result;
  }

  /**
   * Mostrar reporte detallado
   */
  async showDetailedReport(): Promise<void> {
    const analysis = await this.analyzeDuplicates();

    console.log('\n📊 REPORTE DETALLADO DE DUPLICADOS');
    console.log('=====================================');
    console.log(`Total desserts: ${analysis.summary.totalDuplicates}`);
    console.log(`├─ De Square (con squareProductId): ${analysis.summary.squareItems}`);
    console.log(`├─ Manuales (sin squareProductId): ${analysis.summary.manualItems}`);
    console.log(`└─ A eliminar: ${analysis.summary.itemsToDelete}`);

    if (analysis.duplicateGroups.length === 0) {
      console.log('\n✅ No se encontraron grupos duplicados');
      return;
    }

    console.log(`\n🔍 GRUPOS DUPLICADOS (${analysis.duplicateGroups.length}):`);
    
    analysis.duplicateGroups.forEach((group, index) => {
      console.log(`\n${index + 1}. Grupo: ${group.names.join(' | ')}`);
      
      if (group.squareItems.length > 0) {
        console.log(`   ✅ Square (mantener):`);
        group.squareItems.forEach(item => {
          console.log(`      • "${item.name}" (${item.squareProductId})`);
        });
      }
      
      if (group.manualItems.length > 0) {
        console.log(`   📝 Manuales:`);
        group.manualItems.forEach(item => {
          const toDelete = group.toDelete.find(d => d.id === item.id);
          console.log(`      ${toDelete ? '🗑️ ' : '✅ '} "${item.name}" ${toDelete ? '(eliminar)' : '(mantener)'}`);
        });
      }
    });

    console.log('\n💡 ACCIÓN RECOMENDADA:');
    if (analysis.summary.itemsToDelete > 0) {
      console.log(`   pnpm tsx src/scripts/cleanup-dessert-duplicates.ts --execute`);
      console.log(`   Esto eliminará ${analysis.summary.itemsToDelete} duplicados`);
    } else {
      console.log(`   ✅ No hay duplicados que limpiar`);
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const showReport = args.includes('--report') || args.length === 0;

  try {
    const cleanup = new DessertDuplicateCleanup();
    
    if (showReport) {
      await cleanup.showDetailedReport();
      return;
    }

    console.log('🧹 LIMPIEZA DE DESSERTS DUPLICADOS\n');
    
    const result = await cleanup.executeCleanup(dryRun);
    
    console.log('\n📊 RESULTADOS:');
    console.log(`   🗑️  Eliminados: ${result.deleted}`);
    console.log(`   ❌ Errores: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      result.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (dryRun && result.deletedItems.length > 0) {
      console.log('\n💡 Para ejecutar la limpieza real:');
      console.log('   pnpm tsx src/scripts/cleanup-dessert-duplicates.ts --execute');
    }
    
  } catch (error) {
    console.error('❌ Script falló:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DessertDuplicateCleanup };
