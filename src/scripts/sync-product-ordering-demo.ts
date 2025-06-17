/**
 * Script de demostración: Sincronización del ordenamiento de productos
 * 
 * Este script demuestra cómo resolver el problema del ordenamiento de productos 
 * utilizando los MCPs de Square y Supabase.
 * 
 * Problema identificado:
 * - Los productos no están ordenados de acuerdo a Square
 * - James prefiere manejar el orden de productos directamente desde Square
 * - El sistema debe tomar la prioridad de ordenamiento desde Square
 * 
 * Solución:
 * 1. Obtener productos de Square con sus ordinales usando MCP Square
 * 2. Actualizar la base de datos con estos ordinales usando MCP Supabase
 * 3. Modificar las consultas para ordenar por ordinal de Square
 */

import { logger } from '@/utils/logger';

interface SquareProduct {
  id: string;
  name: string;
  ordinal: number;
  categoryId?: string;
}

interface ProductUpdateResult {
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Función principal para sincronizar el ordenamiento
 */
export async function syncProductOrderingDemo(): Promise<ProductUpdateResult> {
  logger.info('🚀 Iniciando demo de sincronización del ordenamiento de productos');
  logger.info('📝 Problema: Los productos no están ordenados según Square');
  
  const results: ProductUpdateResult = { updated: 0, skipped: 0, errors: 0 };
  
  try {
    // PASO 1: Obtener productos de Square usando MCP
    logger.info('📡 PASO 1: Obteniendo productos de Square con MCPs...');
    
    // Simulación de llamada MCP Square (en realidad usarías el MCP)
    const squareProductsExample: SquareProduct[] = [
      {
        id: "BAHPTM7P3HVQ6N2V5PMZMDPM",
        name: "Alfajores de Lucuma (10 per packet)",
        ordinal: -2251731094208512,
        categoryId: "C6GLNU7ZTUEKFZSMMOUISX7B"
      },
      {
        id: "N6FQCAR5XZILI7BGUIN4NF4Q", 
        name: "Alfajores- Classic (1 dozen- packet)",
        ordinal: -2251524935778304,
        categoryId: "C6GLNU7ZTUEKFZSMMOUISX7B"
      },
      {
        id: "KZ4IKWU5JBYAFZK545ULVDFQ",
        name: "Alfajores- Chocolate (1 dozen- packet)", 
        ordinal: -2251593655255040,
        categoryId: "C6GLNU7ZTUEKFZSMMOUISX7B"
      },
      {
        id: "FK7CM63FVZUW7FA43AL3GV6K",
        name: "Alfajores- Gluten Free (1 dozen- packet)",
        ordinal: -2251387496824832,
        categoryId: "C6GLNU7ZTUEKFZSMMOUISX7B"
      }
    ];
    
    logger.info(`✅ Obtenidos ${squareProductsExample.length} productos de Square`);
    logger.info('📋 Productos encontrados:');
    
    // Mostrar el orden actual en Square
    const sortedByOrdinal = [...squareProductsExample].sort((a, b) => a.ordinal - b.ordinal);
    sortedByOrdinal.forEach((product, index) => {
      logger.info(`   ${index + 1}. ${product.name} (ordinal: ${product.ordinal})`);
    });
    
    // PASO 2: Verificar productos en la base de datos usando MCP Supabase
    logger.info('🗄️ PASO 2: Verificando productos en la base de datos...');
    
    // Simulación de consulta Supabase (en realidad usarías el MCP)
    const dbProductsExample = [
      { id: "uuid1", squareId: "BAHPTM7P3HVQ6N2V5PMZMDPM", name: "Alfajores de Lucuma", ordinal: null },
      { id: "uuid2", squareId: "N6FQCAR5XZILI7BGUIN4NF4Q", name: "Alfajores Classic", ordinal: null },
      { id: "uuid3", squareId: "KZ4IKWU5JBYAFZK545ULVDFQ", name: "Alfajores Chocolate", ordinal: null },
      { id: "uuid4", squareId: "FK7CM63FVZUW7FA43AL3GV6K", name: "Alfajores Gluten Free", ordinal: null }
    ];
    
    logger.info(`✅ Encontrados ${dbProductsExample.length} productos en la base de datos`);
    
    // PASO 3: Actualizar ordinales en la base de datos
    logger.info('🔄 PASO 3: Actualizando ordinales en la base de datos...');
    
    for (const dbProduct of dbProductsExample) {
      const squareProduct = squareProductsExample.find(sp => sp.id === dbProduct.squareId);
      
      if (squareProduct) {
        // Simulación de actualización Supabase
        logger.info(`   ✏️  Actualizando ${dbProduct.name}: ordinal = ${squareProduct.ordinal}`);
        results.updated++;
      } else {
        logger.warn(`   ⚠️  No se encontró en Square: ${dbProduct.name}`);
        results.skipped++;
      }
    }
    
    // PASO 4: Mostrar el orden correcto
    logger.info('📊 PASO 4: Orden correcto después de la sincronización:');
    const correctOrder = sortedByOrdinal.map((product, index) => 
      `${index + 1}. ${product.name}`
    );
    correctOrder.forEach(item => logger.info(`   ${item}`));
    
    // PASO 5: Explicar los cambios necesarios en el código
    logger.info('⚙️ PASO 5: Cambios implementados en el código:');
    logger.info('   ✅ Agregado campo "ordinal" al modelo Product');
    logger.info('   ✅ Actualizada función de sincronización para capturar ordinales');
    logger.info('   ✅ Modificadas consultas para ordenar por ordinal + nombre');
    logger.info('   ✅ Creada migración de base de datos');
    
    logger.info('🎯 RESUMEN: Problema del ordenamiento resuelto!');
    logger.info(`   📈 Productos actualizados: ${results.updated}`);
    logger.info(`   ⏭️  Productos omitidos: ${results.skipped}`);
    logger.info(`   ❌ Errores: ${results.errors}`);
    
    return results;
    
  } catch (error) {
    logger.error('❌ Error en la sincronización:', error);
    results.errors++;
    return results;
  }
}

/**
 * Función auxiliar para demostrar el uso del MCP Square
 */
export function demonstrateSquareMCPUsage() {
  logger.info('📚 Cómo usar el MCP Square para obtener productos ordenados:');
  logger.info('');
  logger.info('// Ejemplo de llamada MCP Square');
  logger.info('const squareProducts = await mcp_square_api_make_api_request({');
  logger.info('  service: "catalog",');
  logger.info('  method: "searchObjects",');
  logger.info('  request: {');
  logger.info('    object_types: ["ITEM"],');
  logger.info('    include_related_objects: true,');
  logger.info('    limit: 100');
  logger.info('  }');
  logger.info('});');
  logger.info('');
  logger.info('// Extraer ordinales de las categorías');
  logger.info('squareProducts.objects.forEach(item => {');
  logger.info('  if (item.item_data?.categories?.[0]?.ordinal) {');
  logger.info('    const ordinal = item.item_data.categories[0].ordinal;');
  logger.info('    // Usar este ordinal para el ordenamiento');
  logger.info('  }');
  logger.info('});');
}

/**
 * Función auxiliar para demostrar el uso del MCP Supabase
 */
export function demonstrateSupabaseMCPUsage() {
  logger.info('📚 Cómo usar el MCP Supabase para actualizar ordinales:');
  logger.info('');
  logger.info('// Ejemplo de actualización de ordinal');
  logger.info('await mcp_supabase_execute_sql({');
  logger.info('  project_id: "proyecto-id",');
  logger.info('  query: `');
  logger.info('    UPDATE "Product" ');
  logger.info('    SET "ordinal" = $1, "updatedAt" = NOW()');
  logger.info('    WHERE "squareId" = $2');
  logger.info('  `,');
  logger.info('  params: [ordinal, squareId]');
  logger.info('});');
  logger.info('');
  logger.info('// Consulta para verificar el orden');
  logger.info('await mcp_supabase_execute_sql({');
  logger.info('  project_id: "proyecto-id",');
  logger.info('  query: `');
  logger.info('    SELECT name, ordinal ');
  logger.info('    FROM "Product" ');
  logger.info('    WHERE active = true ');
  logger.info('    ORDER BY ordinal ASC, name ASC');
  logger.info('  `');
  logger.info('});');
}

// Para ejecutar el demo
if (require.main === module) {
  syncProductOrderingDemo()
    .then(results => {
      console.log('Demo completado:', results);
      demonstrateSquareMCPUsage();
      demonstrateSupabaseMCPUsage();
    })
    .catch(console.error);
} 