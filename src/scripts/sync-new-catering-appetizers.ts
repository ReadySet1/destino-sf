// src/scripts/sync-new-catering-appetizers.ts
//
// 🎯 OBJETIVO: Detectar y sincronizar NUEVOS appetizers desde Square
// 
// FLUJO COMPLETO:
// 1. Square Sync → Alfajores & Empanadas (protege catering)
// 2. Este script → Nuevos Catering Appetizers (detecta y crea)  
// 3. Catering Sync → Actualiza imágenes/disponibilidad (de items existentes)

import { PrismaClient } from '@prisma/client';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

interface NewAppetizerResult {
  detected: number;
  created: number;
  skipped: number;
  errors: string[];
  newItems: Array<{
    squareId: string;
    name: string;
    status: 'created' | 'skipped' | 'error';
    reason?: string;
  }>;
}

class NewCateringAppetizerSync {
  
  /**
   * Detectar y sincronizar NUEVOS appetizers desde Square
   */
  async syncNewAppetizers(dryRun: boolean = false): Promise<NewAppetizerResult> {
    const result: NewAppetizerResult = {
      detected: 0,
      created: 0,
      skipped: 0,
      errors: [],
      newItems: []
    };

    try {
      logger.info('🔍 Detecting new catering appetizers from Square...');

      // 1. Obtener todos los items de Square en categoría CATERING- APPETIZERS
      const squareItems = await this.getSquareCateringAppetizers();
      logger.info(`📦 Found ${squareItems.length} items in Square CATERING- APPETIZERS`);

      // 2. Obtener items existentes en nuestra base de datos
      const existingItems = await prisma.cateringItem.findMany({
        where: {
          squareCategory: 'CATERING- APPETIZERS',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          squareItemId: true,
          squareProductId: true
        }
      });

      logger.info(`🗃️  Found ${existingItems.length} existing items in database`);

      // 3. Detectar items nuevos (que NO existen en nuestra DB)
      for (const squareItem of squareItems) {
        try {
          const itemName = squareItem.item_data?.name;
          if (!itemName) {
            result.errors.push('Square item missing name');
            continue;
          }

          // Enhanced duplicate detection using centralized utility
          const { isDuplicate, existingItem, matchType } = await import('@/lib/catering-duplicate-detector').then(
            module => module.CateringDuplicateDetector.checkForDuplicate({
              name: itemName,
              squareProductId: squareItem.id,
              squareCategory: 'CATERING- APPETIZERS'
            })
          );

          if (isDuplicate && existingItem) {
            result.newItems.push({
              squareId: squareItem.id,
              name: itemName,
              status: 'skipped',
              reason: `${matchType}: exists as "${existingItem.name}" (${existingItem.source})`
            });
            result.skipped++;
            continue;
          }

          // ✅ NUEVO ITEM DETECTADO
          result.detected++;
          logger.info(`🆕 NEW ITEM DETECTED: "${itemName}"`);

          if (!dryRun) {
            // Crear nuevo catering item
            const newItem = await this.createNewCateringItem(squareItem);
            
            result.newItems.push({
              squareId: squareItem.id,
              name: itemName,
              status: 'created'
            });
            result.created++;
            
            logger.info(`✅ Created new catering item: ${itemName}`);
          } else {
            result.newItems.push({
              squareId: squareItem.id,
              name: itemName,
              status: 'created',
              reason: 'DRY RUN - would be created'
            });
            result.created++; // Count for dry run
          }

        } catch (error) {
          const errorMsg = `Failed to process ${squareItem.item_data?.name}: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
          
          result.newItems.push({
            squareId: squareItem.id,
            name: squareItem.item_data?.name || 'Unknown',
            status: 'error',
            reason: errorMsg
          });
        }
      }

      // 4. Resultado final
      logger.info(`🎯 NEW APPETIZER SYNC COMPLETE:`);
      logger.info(`   Detected: ${result.detected} new items`);
      logger.info(`   Created: ${result.created} items`);
      logger.info(`   Skipped: ${result.skipped} items`);
      logger.info(`   Errors: ${result.errors.length} items`);

      return result;

    } catch (error) {
      logger.error('❌ New appetizer sync failed:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los items de Square en categoría CATERING- APPETIZERS
   */
  private async getSquareCateringAppetizers(): Promise<any[]> {
    try {
      if (!squareClient.catalogApi) {
        throw new Error('Square Catalog API not available');
      }
      
      const response = await squareClient.catalogApi.searchCatalogObjects({
        object_types: ['ITEM', 'CATEGORY'],
        include_related_objects: true,
        include_deleted_objects: false,
        limit: 1000
      });

      const allObjects = response?.result?.objects || [];
      const relatedObjects = response?.result?.related_objects || [];

      // Encontrar categoría CATERING- APPETIZERS
      const allCategories = [...allObjects, ...relatedObjects].filter(obj => obj.type === 'CATEGORY');
      const cateringCategory = allCategories.find(cat => 
        cat.category_data?.name === 'CATERING- APPETIZERS'
      );

      if (!cateringCategory) {
        logger.warn('⚠️  CATERING- APPETIZERS category not found in Square');
        return [];
      }

      logger.info(`📂 Found CATERING- APPETIZERS category: ${cateringCategory.id}`);

      // Filtrar items de esa categoría
      const allItems = allObjects.filter((obj: any) => obj.type === 'ITEM');
      const cateringItems = allItems.filter((item: any) => {
        const itemCategories = item.item_data?.categories || [];
        return itemCategories.some((cat: any) => cat.id === cateringCategory.id);
      });

      return cateringItems;

    } catch (error) {
      logger.error('Failed to fetch Square catering appetizers:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo catering item desde Square data
   */
  private async createNewCateringItem(squareItem: any) {
    const itemData = squareItem.item_data;
    const itemName = itemData?.name;

    // Extraer imagen URL si existe
    const imageUrl = this.extractImageUrl(squareItem, []);

    // Crear item con datos básicos - las características específicas se añaden manualmente después
    const newItem = await prisma.cateringItem.create({
      data: {
        name: itemName,
        description: itemData?.description || '',
        price: 0, // Package-based pricing
        category: 'APPETIZER',
        squareCategory: 'CATERING- APPETIZERS',
        squareItemId: squareItem.id,
        sourceType: 'MERGED', // Sincronizado desde Square
        
        // Imagen desde Square si existe
        imageUrl: imageUrl || null,
        
        // Valores por defecto - requieren configuración manual
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        servingSize: 'per piece',
        
        // Estado activo
        isActive: !itemData?.is_deleted,
        syncEnabled: true,
        lastSquareSync: new Date(),
        
        // Campos opcionales vacíos - configurar manualmente
        ingredients: [],
        dietaryTags: []
      }
    });

    return newItem;
  }

  /**
   * Extraer URL de imagen desde Square item
   */
  private extractImageUrl(squareItem: any, relatedObjects: any[]): string | undefined {
    const imageIds = squareItem.item_data?.image_ids || [];
    
    if (imageIds.length > 0) {
      const imageObject = relatedObjects.find((obj: any) => 
        obj.type === 'IMAGE' && imageIds.includes(obj.id)
      );
      
      if (imageObject?.image_data?.url) {
        return imageObject.image_data.url;
      }
    }
    
    const ecomImageUris = squareItem.item_data?.ecom_image_uris || [];
    if (ecomImageUris.length > 0) {
      return ecomImageUris[0];
    }
    
    return undefined;
  }

  /**
   * Obtener resumen del estado de sincronización
   */
  async getSyncSummary(): Promise<{
    totalInSquare: number;
    totalInDatabase: number;
    potentialNewItems: number;
    lastSync: Date | null;
  }> {
    try {
      const [squareItems, dbItems] = await Promise.all([
        this.getSquareCateringAppetizers(),
        prisma.cateringItem.findMany({
          where: {
            squareCategory: 'CATERING- APPETIZERS',
            isActive: true
          },
          select: {
            id: true,
            name: true,
            squareItemId: true,
            lastSquareSync: true
          }
        })
      ]);

      // Estimar items potencialmente nuevos
      const potentialNewItems = squareItems.filter(squareItem => {
        const itemName = squareItem.item_data?.name;
        return !dbItems.some(dbItem => 
          dbItem.squareItemId === squareItem.id ||
          dbItem.name.toLowerCase() === itemName?.toLowerCase()
        );
      }).length;

      // Última sincronización
      const lastSyncDates = dbItems
        .map(item => item.lastSquareSync)
        .filter((date): date is Date => date !== null)
        .sort((a, b) => b.getTime() - a.getTime());

      return {
        totalInSquare: squareItems.length,
        totalInDatabase: dbItems.length,
        potentialNewItems,
        lastSync: lastSyncDates[0] || null
      };

    } catch (error) {
      logger.error('Failed to get sync summary:', error);
      throw error;
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const command = process.argv[2];
  const dryRunFlag = process.argv.includes('--dry-run');
  
  try {
    const syncService = new NewCateringAppetizerSync();
    
    switch (command) {
      case 'sync':
        console.log(`🚀 ${dryRunFlag ? 'DRY RUN: ' : ''}Syncing new catering appetizers from Square...`);
        const result = await syncService.syncNewAppetizers(dryRunFlag);
        
        console.log('\n📊 SYNC RESULTS:');
        console.log(`   🔍 Detected: ${result.detected} new items`);
        console.log(`   ✅ Created: ${result.created} items`);
        console.log(`   ⏭️  Skipped: ${result.skipped} items`);
        console.log(`   ❌ Errors: ${result.errors.length} items`);
        
        if (result.newItems.length > 0) {
          console.log('\n📋 NEW ITEMS:');
          result.newItems.forEach((item, index) => {
            const status = item.status === 'created' ? '✅' : 
                          item.status === 'skipped' ? '⏭️' : '❌';
            console.log(`   ${status} ${item.name} (${item.reason || item.status})`);
          });
        }
        
        if (result.errors.length > 0) {
          console.log('\n❌ ERRORS:');
          result.errors.forEach(error => console.log(`   • ${error}`));
        }
        
        break;
        
      case 'summary':
        console.log('📊 Getting sync summary...');
        const summary = await syncService.getSyncSummary();
        
        console.log('\n📊 SYNC SUMMARY:');
        console.log(`   🟦 Square items: ${summary.totalInSquare}`);
        console.log(`   🗃️  Database items: ${summary.totalInDatabase}`);
        console.log(`   🆕 Potential new: ${summary.potentialNewItems}`);
        console.log(`   🕐 Last sync: ${summary.lastSync ? summary.lastSync.toISOString() : 'Never'}`);
        
        if (summary.potentialNewItems > 0) {
          console.log(`\n💡 Run 'pnpm tsx src/scripts/sync-new-catering-appetizers.ts sync --dry-run' to preview`);
        }
        
        break;
        
      default:
        console.log('🔄 New Catering Appetizer Sync\n');
        console.log('USAGE:');
        console.log('  pnpm tsx src/scripts/sync-new-catering-appetizers.ts summary     # Show sync status');
        console.log('  pnpm tsx src/scripts/sync-new-catering-appetizers.ts sync       # Sync new items');
        console.log('  pnpm tsx src/scripts/sync-new-catering-appetizers.ts sync --dry-run  # Preview sync');
        console.log('\nFills the gap: detects NEW appetizers in Square and creates them in the database.');
        console.log('Use AFTER Square sync (for alfajores/empanadas) and BEFORE Catering sync (for images).');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

// Export for use in API endpoints
export { NewCateringAppetizerSync };
