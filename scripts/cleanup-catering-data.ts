#!/usr/bin/env npx ts-node
/**
 * Script para limpiar TODA la data de catering
 * ⚠️ PRECAUCIÓN: Esta operación NO se puede deshacer
 */

import { prisma } from '../src/lib/db.js';

async function cleanupAllCateringData() {
  console.log('🧹 INICIANDO LIMPIEZA COMPLETA DE DATOS DE CATERING');
  console.log('⚠️  Esta operación eliminará TODA la información de catering');
  console.log('═'.repeat(60));

  try {
    // Usar transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar órdenes de catering (CASCADE eliminará los items automáticamente)
      const deletedOrders = await tx.cateringOrder.deleteMany({});
      console.log(`✅ Eliminadas ${deletedOrders.count} órdenes de catering`);

      // 2. Eliminar paquetes de catering (CASCADE eliminará ratings y package items)
      const deletedPackages = await tx.cateringPackage.deleteMany({});
      console.log(`✅ Eliminados ${deletedPackages.count} paquetes de catering`);

      // 3. Nota: El modelo CateringItem no existe en el schema actual
      console.log(`ℹ️  Modelo CateringItem no existe - omitiendo`);

      // 4. Eliminar mapeos de items de catering
      const deletedMappings = await tx.cateringItemMapping.deleteMany({});
      console.log(`✅ Eliminados ${deletedMappings.count} mapeos de items`);

      // 5. Eliminar zonas de entrega de catering
      const deletedZones = await tx.cateringDeliveryZone.deleteMany({});
      console.log(`✅ Eliminadas ${deletedZones.count} zonas de entrega`);

      // 6. Obtener categorías de catering antes de eliminar productos
      const cateringCategories = await tx.category.findMany({
        where: {
          OR: [
            { name: { startsWith: 'CATERING-' } },
            { name: { startsWith: 'CATERING- ' } }
          ]
        }
      });
      
      const categoryIds = cateringCategories.map(cat => cat.id);
      console.log(`📂 Encontradas ${cateringCategories.length} categorías de catering:`, 
        cateringCategories.map(cat => cat.name));

      // 7. Eliminar productos de categorías de catering
      if (categoryIds.length > 0) {
        const deletedProducts = await tx.product.deleteMany({
          where: {
            categoryId: {
              in: categoryIds
            }
          }
        });
        console.log(`✅ Eliminados ${deletedProducts.count} productos de categorías de catering`);
      }

      // 8. Eliminar categorías de catering
      if (categoryIds.length > 0) {
        const deletedCategories = await tx.category.deleteMany({
          where: {
            id: {
              in: categoryIds
            }
          }
        });
        console.log(`✅ Eliminadas ${deletedCategories.count} categorías de catering`);
      }

      // 9. Limpiar órdenes regulares marcadas como catering
      const updatedOrders = await tx.order.updateMany({
        where: {
          isCateringOrder: true
        },
        data: {
          isCateringOrder: false
        }
      });
      console.log(`✅ Desmarcadas ${updatedOrders.count} órdenes regulares como catering`);

      console.log('═'.repeat(60));
      console.log('🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
    });

    // Verificar que todo esté limpio
    console.log('🔍 VERIFICANDO LIMPIEZA...');
    
    const verification = await Promise.all([
      prisma.cateringOrder.count(),
      prisma.cateringPackage.count(),  
      // prisma.cateringItem.count(), // Modelo no existe
      prisma.cateringItemMapping.count(),
      prisma.cateringDeliveryZone.count(),
      prisma.category.count({
        where: {
          OR: [
            { name: { startsWith: 'CATERING-' } },
            { name: { startsWith: 'CATERING- ' } }
          ]
        }
      }),
      prisma.product.count({
        where: {
          category: {
            OR: [
              { name: { startsWith: 'CATERING-' } },
              { name: { startsWith: 'CATERING- ' } }
            ]
          }
        }
      })
    ]);

    const [orders, packages, mappings, zones, categories, products] = verification;

    console.log('📊 ESTADO FINAL:');
    console.log(`   • Órdenes de catering: ${orders}`);
    console.log(`   • Paquetes de catering: ${packages}`);
    console.log(`   • Mapeos de items: ${mappings}`);
    console.log(`   • Zonas de entrega: ${zones}`);
    console.log(`   • Categorías de catering: ${categories}`);
    console.log(`   • Productos de catering: ${products}`);

    const totalRemaining = orders + packages + mappings + zones + categories + products;
    
    if (totalRemaining === 0) {
      console.log('✅ LIMPIEZA VERIFICADA - Todos los datos de catering han sido eliminados');
    } else {
      console.log(`⚠️  Quedan ${totalRemaining} elementos relacionados con catering`);
    }

  } catch (error) {
    console.error('❌ ERROR durante la limpieza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar limpieza
cleanupAllCateringData()
  .then(() => {
    console.log('🎯 Proceso completado. La página /catering ahora debe mostrar el mensaje de "No Catering Data Available"');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
