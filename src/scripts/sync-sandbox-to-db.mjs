import https from 'https';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

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

// Obtener categorías del sandbox
async function getSquareCategories() {
  logger.info('Obteniendo categorías de Square Sandbox...');
  
  const options = {
    hostname: SANDBOX_HOST,
    path: '/v2/catalog/list?types=CATEGORY',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SANDBOX_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpsRequest(options);
    const categories = response.objects || [];
    logger.info(`Se encontraron ${categories.length} categorías en Square Sandbox`);
    return categories;
  } catch (error) {
    logger.error('Error al obtener categorías de Square Sandbox:', error);
    throw error;
  }
}

// Obtener productos del sandbox
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

// Sincronizar categorías de Square con la base de datos
async function syncCategories(squareCategories) {
  logger.info('Sincronizando categorías...');
  
  const categoryMap = {}; // Para mapear IDs de Square a IDs de la base de datos
  
  // Asegurar que existe una categoría por defecto
  let defaultCategory = await prisma.category.findFirst({
    where: { name: 'Default' }
  });
  
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Default',
        description: 'Categoría por defecto para productos importados',
        slug: 'default'
      }
    });
  }
  
  categoryMap['default'] = defaultCategory.id;
  
  // Procesar cada categoría de Square
  for (const category of squareCategories) {
    if (category.type !== 'CATEGORY' || !category.category_data) {
      continue;
    }
    
    const squareId = category.id;
    const name = category.category_data.name;
    const slug = name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    try {
      // Buscar primero si la categoría ya existe por squareId
      const existingCategory = await prisma.category.findUnique({
        where: { squareId }
      });
      
      if (existingCategory) {
        // Actualizar la categoría existente
        const updatedCategory = await prisma.category.update({
          where: { id: existingCategory.id },
          data: {
            name,
            updatedAt: new Date()
          }
        });
        
        categoryMap[squareId] = updatedCategory.id;
        logger.info(`Categoría actualizada: ${name} (${squareId} -> ${updatedCategory.id})`);
      } else {
        // Verificar si existe una categoría con el mismo nombre
        const nameExists = await prisma.category.findUnique({
          where: { name }
        });
        
        if (nameExists) {
          // Si ya existe con el mismo nombre, asociarla con el squareId
          const updatedCategory = await prisma.category.update({
            where: { id: nameExists.id },
            data: {
              squareId,
              updatedAt: new Date()
            }
          });
          
          categoryMap[squareId] = updatedCategory.id;
          logger.info(`Categoría asociada: ${name} (${squareId} -> ${updatedCategory.id})`);
        } else {
          // Crear una nueva categoría
          const newCategory = await prisma.category.create({
            data: {
              squareId,
              name,
              description: category.category_data.description || '',
              slug
            }
          });
          
          categoryMap[squareId] = newCategory.id;
          logger.info(`Categoría creada: ${name} (${squareId} -> ${newCategory.id})`);
        }
      }
    } catch (error) {
      logger.error(`Error al sincronizar categoría ${name}:`, error);
    }
  }
  
  return categoryMap;
}

// Sincronizar un producto de Square con la base de datos
async function syncProduct(product, categoryMap) {
  try {
    if (product.type !== 'ITEM' || !product.item_data) {
      return { success: false, error: 'Producto no válido' };
    }
    
    const itemData = product.item_data;
    const itemName = itemData.name || 'Producto sin nombre';
    const squareId = product.id;
    
    logger.info(`Sincronizando producto: ${itemName} (${squareId})`);
    
    // Obtener la categoría correcta o usar la predeterminada
    let categoryId = categoryMap['default'];
    if (itemData.category_id && categoryMap[itemData.category_id]) {
      categoryId = categoryMap[itemData.category_id];
    }
    
    // Procesar variaciones para obtener precio base y variantes
    const variations = itemData.variations || [];
    const variants = [];
    let basePrice = 0;
    
    if (variations.length > 0) {
      // Usar el precio de la primera variación como base
      const firstVariation = variations[0];
      const priceAmount = firstVariation.item_variation_data?.price_money?.amount || 0;
      basePrice = priceAmount / 100; // Convertir centavos a unidades
      
      // Procesar todas las variaciones
      for (const variation of variations) {
        if (!variation.item_variation_data) continue;
        
        const variationData = variation.item_variation_data;
        const variationPrice = (variationData.price_money?.amount || 0) / 100;
        
        variants.push({
          name: variationData.name || 'Estándar',
          price: variationPrice,
          squareVariantId: variation.id
        });
      }
    }
    
    // Crear o actualizar el producto en la base de datos
    const description = itemData.description || '';
    
    const dbProduct = await prisma.product.upsert({
      where: { squareId },
      update: {
        name: itemName,
        description,
        price: basePrice,
        categoryId,
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
        categoryId,
        featured: false,
        active: true,
        variants: {
          create: variants
        }
      }
    });
    
    logger.info(`Producto sincronizado en la base de datos: ${dbProduct.id}`);
    
    // Sincronizar con Sanity (usamos la API REST en lugar de importar directamente)
    try {
      const sanityData = {
        name: dbProduct.name,
        description: dbProduct.description || undefined,
        price: Number(dbProduct.price),
        categoryId: dbProduct.categoryId,
        squareId: dbProduct.squareId,
        images: dbProduct.images,
        featured: dbProduct.featured
      };
      
      // Usar HTTP para llamar a nuestro endpoint local
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
      logger.info(`Producto sincronizado con Sanity: ${dbProduct.name}`);
    } catch (sanityError) {
      logger.error(`Error al sincronizar con Sanity: ${sanityError.message}`);
      // Continuar a pesar del error de Sanity
    }
    
    return {
      success: true,
      productId: dbProduct.id
    };
  } catch (error) {
    logger.error(`Error al sincronizar producto:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Función principal
async function main() {
  try {
    logger.info('=== INICIANDO SINCRONIZACIÓN CON SANDBOX ===');
    
    // PASO 1: Obtener categorías de Square Sandbox
    const squareCategories = await getSquareCategories();
    
    // PASO 2: Sincronizar categorías con la base de datos
    const categoryMap = await syncCategories(squareCategories);
    
    // PASO 3: Obtener productos de Square Sandbox
    const squareProducts = await getSquareProducts();
    
    if (squareProducts.length === 0) {
      logger.warn('No se encontraron productos en Square Sandbox. Por favor, crea algunos productos en el sandbox de Square Dashboard.');
      await prisma.$disconnect();
      return;
    }
    
    // PASO 4: Sincronizar cada producto con la base de datos y Sanity
    logger.info('Sincronizando productos con la base de datos y Sanity...');
    const results = [];
    
    for (const product of squareProducts) {
      const result = await syncProduct(product, categoryMap);
      results.push({
        name: product.item_data?.name || 'Desconocido',
        ...result
      });
      
      // Pequeña pausa para evitar sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Guardar resultados
    fs.writeFileSync(
      path.join(process.cwd(), 'sync-sandbox-results.json'), 
      JSON.stringify(results, null, 2)
    );
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info(`
      === SINCRONIZACIÓN COMPLETADA ===
      * Productos procesados: ${squareProducts.length}
      * Sincronizados con éxito: ${successCount}
      * Fallidos: ${failureCount}
      * Resultados guardados en: sync-sandbox-results.json
    `);
    
  } catch (error) {
    logger.error('Error en la sincronización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
main(); 