import https from 'https';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';

// Cargar variables de entorno
config();

// Inicializar Prisma
const prisma = new PrismaClient();

// Configuración de Square
const SANDBOX_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SANDBOX_HOST = 'connect.squareupsandbox.com';

// Logger básico
const logger = {
  info: (...args) => console.log(new Date().toISOString(), 'INFO:', ...args),
  error: (...args) => console.error(new Date().toISOString(), 'ERROR:', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), 'WARN:', ...args)
};

// Función para hacer peticiones HTTPS
function httpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk.toString());
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (error) {
            reject(new Error(`Error al analizar respuesta: ${error}`));
          }
        } else {
          reject(new Error(`Error HTTP: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Ejecutar un script como un proceso
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    logger.info(`Ejecutando script: ${scriptPath}`);
    
    const process = spawn('node', [scriptPath], { stdio: 'inherit' });
    
    process.on('close', (code) => {
      if (code === 0) {
        logger.info(`Script ${scriptPath} completado con éxito`);
        resolve();
      } else {
        logger.error(`Script ${scriptPath} falló con código: ${code}`);
        reject(new Error(`Script falló con código: ${code}`));
      }
    });
    
    process.on('error', (err) => {
      logger.error(`Error al ejecutar script ${scriptPath}:`, err);
      reject(err);
    });
  });
}

// Obtener productos del sandbox de Square
async function getSquareProducts() {
  logger.info('Obteniendo productos de Square Sandbox...');
  
  const options = {
    hostname: SANDBOX_HOST,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SANDBOX_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  const requestBody = {
    object_types: ['ITEM']
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    const items = response.objects || [];
    logger.info(`Se encontraron ${items.length} productos en Square Sandbox`);
    return items;
  } catch (error) {
    logger.error('Error al obtener productos de Square Sandbox:', error);
    throw error;
  }
}

// Verificar/crear categoría por defecto
async function ensureDefaultCategory() {
  logger.info('Verificando categoría por defecto...');
  
  try {
    // Buscar la categoría por defecto
    let defaultCategory = await prisma.category.findFirst({
      where: { name: 'Default' }
    });
    
    // Si no existe, crearla
    if (!defaultCategory) {
      logger.info('Creando categoría por defecto...');
      defaultCategory = await prisma.category.create({
        data: {
          name: 'Default',
          description: 'Categoría por defecto para productos importados',
          slug: 'default'
        }
      });
    }
    
    logger.info(`Usando categoría por defecto con ID: ${defaultCategory.id}`);
    return defaultCategory.id;
  } catch (error) {
    logger.error('Error al verificar/crear categoría por defecto:', error);
    throw error;
  }
}

// Sincronizar un producto de Square con la base de datos y Sanity
async function syncProduct(squareProduct, defaultCategoryId) {
  try {
    const itemData = squareProduct.item_data;
    const itemName = itemData?.name || 'Producto sin nombre';
    const squareId = squareProduct.id;
    
    logger.info(`Sincronizando producto: ${itemName} (${squareId})`);
    
    // Procesar variaciones para obtener precio base y variantes
    const variations = itemData?.variations || [];
    const variants = [];
    let basePrice = 0;
    
    if (variations.length > 0) {
      // Usar el precio de la primera variación como base
      const firstVariation = variations[0];
      const priceAmount = firstVariation.item_variation_data?.price_money?.amount || 0;
      basePrice = priceAmount / 100; // Convertir centavos a unidades
      
      // Procesar todas las variaciones
      for (const variation of variations) {
        const variationData = variation.item_variation_data;
        const variationPrice = (variationData?.price_money?.amount || 0) / 100;
        
        variants.push({
          name: variationData?.name || 'Estándar',
          price: variationPrice,
          squareVariantId: variation.id
        });
      }
    }
    
    // Crear o actualizar el producto en la base de datos
    const description = itemData?.description || '';
    
    const product = await prisma.product.upsert({
      where: { squareId },
      update: {
        name: itemName,
        description,
        price: basePrice,
        variants: {
          deleteMany: {},
          create: variants
        },
        updatedAt: new Date()
      },
      create: {
        squareId,
        name: itemName,
        description,
        price: basePrice,
        images: [],
        categoryId: defaultCategoryId,
        featured: false,
        active: true,
        variants: {
          create: variants
        }
      }
    });
    
    logger.info(`Producto sincronizado en la base de datos: ${product.id}`);
    
    // Llamar a la API para sincronizar con Sanity
    const sanityData = {
      name: product.name,
      description: product.description || undefined,
      price: Number(product.price),
      categoryId: product.categoryId,
      squareId: product.squareId,
      images: product.images,
      featured: product.featured
    };
    
    // Llamar al endpoint interno de sincronización con Sanity
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path: '/api/sanity/create-product',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    await httpsRequest(options, sanityData);
    logger.info(`Producto sincronizado con Sanity: ${product.name}`);
    
    return {
      success: true,
      product
    };
  } catch (error) {
    logger.error(`Error al sincronizar producto:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Safety configuration
const REQUIRE_CONFIRMATION_FLAG = '--confirm-sync';
const MIN_SQUARE_PRODUCTS_REQUIRED = 1; // Refuse to sync if Square returns fewer products

// Función principal
async function main() {
  try {
    logger.info('=== INICIANDO SINCRONIZACIÓN COMPLETA ===');

    // SAFETY CHECK 1: Require explicit confirmation flag
    const args = process.argv.slice(2);
    if (!args.includes(REQUIRE_CONFIRMATION_FLAG)) {
      logger.error('');
      logger.error('=== SAFETY CHECK FAILED ===');
      logger.error('This script will DELETE ALL products from the database before syncing.');
      logger.error('To proceed, you must run with the confirmation flag:');
      logger.error('');
      logger.error(`  node sync-all-platforms.mjs ${REQUIRE_CONFIRMATION_FLAG}`);
      logger.error('');
      logger.error('WARNING: If Square Sandbox is empty, ALL products will be PERMANENTLY DELETED!');
      logger.error('');
      await prisma.$disconnect();
      process.exit(1);
    }

    // SAFETY CHECK 2: Warn about environment
    const databaseUrl = process.env.DATABASE_URL || '';
    if (databaseUrl.includes('production') || databaseUrl.includes('prod')) {
      logger.error('');
      logger.error('=== PRODUCTION ENVIRONMENT DETECTED ===');
      logger.error('This script should NOT be run against a production database!');
      logger.error('Aborting to prevent data loss.');
      logger.error('');
      await prisma.$disconnect();
      process.exit(1);
    }

    // PASO 1: Copiar productos de producción a sandbox (si es necesario)
    if (process.env.SQUARE_PRODUCTION_TOKEN) {
      logger.info('Copiando productos de producción a sandbox...');
      try {
        await runScript(path.join(process.cwd(), 'src/scripts/copy-all-to-sandbox.mjs'));
      } catch (error) {
        logger.warn('La copia de producción a sandbox falló, continuando con los productos existentes en sandbox...');
      }
    } else {
      logger.warn('SQUARE_PRODUCTION_TOKEN no definido. Omitiendo la copia de producción a sandbox.');
    }

    // SAFETY CHECK 3: Pre-fetch Square products BEFORE deleting
    logger.info('Verificando productos en Square Sandbox ANTES de eliminar...');
    const squareProductsPreCheck = await getSquareProducts();

    if (squareProductsPreCheck.length < MIN_SQUARE_PRODUCTS_REQUIRED) {
      logger.error('');
      logger.error('=== SAFETY CHECK FAILED ===');
      logger.error(`Square Sandbox returned only ${squareProductsPreCheck.length} products.`);
      logger.error(`Minimum required: ${MIN_SQUARE_PRODUCTS_REQUIRED}`);
      logger.error('');
      logger.error('This likely indicates:');
      logger.error('  - Square Sandbox is empty');
      logger.error('  - Square API token is invalid');
      logger.error('  - Network/API error');
      logger.error('');
      logger.error('Refusing to delete existing products. Aborting.');
      logger.error('');
      await prisma.$disconnect();
      process.exit(1);
    }

    // Get current product count for logging
    const currentProductCount = await prisma.product.count();
    logger.warn(`About to delete ${currentProductCount} existing products and replace with ${squareProductsPreCheck.length} from Square Sandbox.`);

    // PASO 2: Limpiar productos existentes en la base de datos
    logger.info('Limpiando productos existentes en la base de datos...');
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    logger.info('Base de datos limpiada correctamente');
    
    // PASO 3: Asegurar categoría por defecto
    const defaultCategoryId = await ensureDefaultCategory();
    
    // PASO 4: Use pre-fetched Square products (already validated above)
    const squareProducts = squareProductsPreCheck;
    logger.info(`Usando ${squareProducts.length} productos previamente verificados de Square Sandbox`);
    
    // PASO 5: Sincronizar cada producto con la base de datos y Sanity
    logger.info('Sincronizando productos con la base de datos y Sanity...');
    const results = [];
    
    for (const product of squareProducts) {
      const result = await syncProduct(product, defaultCategoryId);
      results.push({
        name: product.item_data?.name || 'Desconocido',
        ...result
      });
    }
    
    // Guardar resultados
    fs.writeFileSync(
      path.join(process.cwd(), 'sync-results.json'), 
      JSON.stringify(results, null, 2)
    );
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info(`
      === SINCRONIZACIÓN COMPLETADA ===
      * Productos procesados: ${squareProducts.length}
      * Sincronizados con éxito: ${successCount}
      * Fallidos: ${failureCount}
      * Resultados guardados en: sync-results.json
    `);
    
  } catch (error) {
    logger.error('Error en la sincronización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
main(); 