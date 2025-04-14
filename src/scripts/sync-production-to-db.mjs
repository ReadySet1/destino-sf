import https from 'https';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@sanity/client';

// Cargar variables de entorno
config();

// Inicializar Prisma
const prisma = new PrismaClient();

// Configuración de Square
const PRODUCTION_TOKEN = process.env.SQUARE_PRODUCTION_TOKEN;
const PRODUCTION_HOST = 'connect.squareup.com';

// Configurar cliente de Sanity
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

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

// Obtener categorías del entorno de producción
async function getSquareCategories() {
  logger.info('Obteniendo categorías de Square Producción...');
  
  const options = {
    hostname: PRODUCTION_HOST,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  const requestBody = {
    object_types: ['CATEGORY'],
    include_related_objects: true
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    const categories = response.objects || [];
    logger.info(`Se encontraron ${categories.length} categorías en Square Producción`);
    logger.info('Ejemplo de categoría:', JSON.stringify(categories[0], null, 2));
    return categories;
  } catch (error) {
    logger.error('Error al obtener categorías de Square Producción:', error);
    throw error;
  }
}

// Obtener productos del entorno de producción
async function getSquareProducts() {
  logger.info('Obteniendo productos de Square Producción...');
  
  const options = {
    hostname: PRODUCTION_HOST,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  const requestBody = {
    object_types: ['ITEM'],
    include_related_objects: true,
    include_category_path_to_root: true
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    const items = response.objects || [];
    logger.info(`Se encontraron ${items.length} productos en Square Producción`);
    if (items.length > 0) {
      logger.info('Ejemplo de producto:', JSON.stringify(items[0], null, 2));
    }
    return {
      objects: items,
      relatedObjects: response.related_objects || []
    };
  } catch (error) {
    logger.error('Error al obtener productos de Square Producción:', error);
    throw error;
  }
}

// Nueva función para obtener imágenes de un producto
async function getProductImages(product, relatedObjects) {
  logger.info(`Buscando imágenes para el producto: ${product.item_data?.name || 'Desconocido'}`);
  
  const imageUrls = [];
  const imageIds = product.item_data?.image_ids || [];
  
  if (imageIds.length === 0) {
    logger.info('No hay IDs de imágenes asociadas al producto');
    return imageUrls;
  }
  
  logger.info(`Encontrados ${imageIds.length} IDs de imágenes: ${imageIds.join(', ')}`);
  
  // Buscar objetos de imagen en relatedObjects
  for (const imageId of imageIds) {
    const imageObject = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');
    
    if (imageObject && imageObject.image_data && imageObject.image_data.url) {
      imageUrls.push(imageObject.image_data.url);
      logger.info(`Encontrada URL de imagen: ${imageObject.image_data.url}`);
    } else {
      // Si no está en relatedObjects, intentar obtenerla directamente
      try {
        const imageData = await fetchCatalogImageById(imageId);
        if (imageData && imageData.image_data && imageData.image_data.url) {
          imageUrls.push(imageData.image_data.url);
          logger.info(`Obtenida URL de imagen desde API: ${imageData.image_data.url}`);
        }
      } catch (error) {
        logger.error(`Error al obtener imagen ${imageId}:`, error);
      }
    }
  }
  
  return imageUrls;
}

// Función para obtener una imagen específica por ID
async function fetchCatalogImageById(imageId) {
  logger.info(`Obteniendo detalles de imagen con ID: ${imageId}`);
  
  const options = {
    hostname: PRODUCTION_HOST,
    path: `/v2/catalog/object/${imageId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpsRequest(options);
    return response.object;
  } catch (error) {
    logger.error(`Error al obtener imagen ${imageId}:`, error);
    return null;
  }
}

// Sincronizar categorías de Square con la base de datos
async function syncCategories(squareCategories) {
  logger.info('Sincronizando categorías...');
  logger.info(`Recibidas ${squareCategories.length} categorías de Square`);
  
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
  logger.info(`Categoría por defecto configurada con ID: ${defaultCategory.id}`);
  
  // Procesar cada categoría de Square
  for (const category of squareCategories) {
    if (category.type !== 'CATEGORY' || !category.category_data) {
      logger.warn(`Saltando objeto inválido de categoría: ${JSON.stringify(category)}`);
      continue;
    }
    
    const squareId = category.id;
    const name = category.category_data.name;
    const slug = name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    try {
      logger.info(`Procesando categoría: ${name} (Square ID: ${squareId})`);
      
      // Buscar primero si la categoría ya existe por squareId
      let existingCategory = await prisma.category.findFirst({
        where: { 
          OR: [
            { squareId },
            { name }
          ]
        }
      });
      
      if (existingCategory) {
        // Actualizar la categoría existente
        const updatedCategory = await prisma.category.update({
          where: { id: existingCategory.id },
          data: {
            name,
            squareId, // Asegurarnos de que el squareId esté actualizado
            updatedAt: new Date()
          }
        });
        
        categoryMap[squareId] = updatedCategory.id;
        logger.info(`Categoría actualizada: ${name} (${squareId} -> ${updatedCategory.id})`);
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
    } catch (error) {
      logger.error(`Error al sincronizar categoría ${name}:`, error);
    }
  }
  
  logger.info(`Mapa de categorías final: ${JSON.stringify(categoryMap, null, 2)}`);
  return categoryMap;
}

// Sincronizar un producto de Square con la base de datos
async function syncProduct(product, categoryMap, relatedObjects) {
  try {
    if (product.type !== 'ITEM' || !product.item_data) {
      return { success: false, error: 'Producto no válido' };
    }
    
    const itemData = product.item_data;
    const itemName = itemData.name || 'Producto sin nombre';
    const squareId = product.id;
    
    logger.info(`Sincronizando producto: ${itemName} (${squareId})`);
    logger.info(`Datos del producto de Square: ${JSON.stringify(itemData, null, 2)}`);
    
    // Obtener imágenes del producto
    const productImages = await getProductImages(product, relatedObjects);
    logger.info(`Obtenidas ${productImages.length} imágenes para el producto ${itemName}`);
    
    // Obtener la categoría correcta o usar la predeterminada
    let categoryId = categoryMap['default'];
    if (itemData.categories && itemData.categories.length > 0) {
      // Intentar usar la primera categoría que tenga un mapeo
      for (const cat of itemData.categories) {
        if (categoryMap[cat.id]) {
          categoryId = categoryMap[cat.id];
          logger.info(`Asignando producto "${itemName}" a categoría con ID: ${categoryId} (Square category ID: ${cat.id})`);
          break;
        }
      }
      
      if (categoryId === categoryMap['default']) {
        logger.warn(`No se encontró mapeo para ninguna de las categorías del producto "${itemName}". Usando categoría por defecto.`);
        logger.info(`Mapeo de categorías disponible: ${JSON.stringify(categoryMap, null, 2)}`);
      }
    } else {
      logger.warn(`Producto "${itemName}" no tiene categorías asignadas en Square. Usando categoría por defecto.`);
      logger.info(`Datos completos del producto: ${JSON.stringify(product, null, 2)}`);
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
        images: productImages,
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
        images: productImages,
        categoryId,
        featured: false,
        active: true,
        variants: {
          create: variants
        }
      }
    });
    
    logger.info(`Producto sincronizado en la base de datos: ${dbProduct.id}`);
    
    // Sincronizar con Sanity directamente
    try {
      // Crear un slug a partir del nombre
      const slug = dbProduct.name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
      
      // Obtener la categoría de la base de datos
      const dbCategory = await prisma.category.findUnique({
        where: { id: dbProduct.categoryId }
      });
      
      if (!dbCategory) {
        throw new Error(`No se encontró la categoría con ID: ${dbProduct.categoryId}`);
      }
      
      // Buscar o crear la categoría en Sanity
      const existingSanityCategory = await sanityClient.fetch(
        `*[_type == "productCategory" && name == $name][0]`,
        { name: dbCategory.name }
      );
      
      let categorySanityId;
      
      if (existingSanityCategory) {
        categorySanityId = existingSanityCategory._id;
      } else {
        // Crear la categoría en Sanity
        const newSanityCategory = await sanityClient.create({
          _type: 'productCategory',
          name: dbCategory.name,
          slug: {
            _type: 'slug',
            current: dbCategory.slug || dbCategory.name.toLowerCase().replace(/\s+/g, '-')
          },
          description: dbCategory.description || ''
        });
        
        categorySanityId = newSanityCategory._id;
        logger.info(`Categoría creada en Sanity: ${dbCategory.name}`);
      }
      
      // Buscar si el producto ya existe en Sanity
      const existingSanityProduct = await sanityClient.fetch(
        `*[_type == "product" && squareId == $squareId][0]`,
        { squareId: dbProduct.squareId }
      );
      
      // Preparar los datos del producto para Sanity
      const sanityProductData = {
        name: dbProduct.name,
        description: dbProduct.description || '',
        price: Number(dbProduct.price),
        featured: dbProduct.featured || false,
        squareId: dbProduct.squareId,
        slug: {
          _type: 'slug',
          current: slug
        },
        isAvailable: dbProduct.active || true,
        category: categorySanityId ? {
          _type: 'reference',
          _ref: categorySanityId
        } : undefined,
        // Agregar variantes si existen
        variants: variants.length > 0 ? variants.map(v => ({
          _key: v.squareVariantId,
          name: v.name,
          price: v.price,
          squareVariantId: v.squareVariantId
        })) : undefined
      };
      
      if (existingSanityProduct) {
        // Actualizar el producto existente
        await sanityClient
          .patch(existingSanityProduct._id)
          .set(sanityProductData)
          .commit();
        
        logger.info(`Producto actualizado en Sanity: ${dbProduct.name}`);
      } else {
        // Crear un nuevo producto en Sanity
        await sanityClient.create({
          _type: 'product',
          ...sanityProductData,
          images: dbProduct.images?.map(url => ({
            _type: 'image',
            url
          })) || []
        });
        
        logger.info(`Producto creado en Sanity: ${dbProduct.name}`);
      }
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
    logger.info('=== INICIANDO SINCRONIZACIÓN DIRECTA DESDE PRODUCCIÓN ===');
    logger.info('MODO: SÓLO LECTURA - No se realizarán cambios en el entorno de producción de Square');
    
    if (!PRODUCTION_TOKEN) {
      throw new Error('SQUARE_PRODUCTION_TOKEN no está definido en el archivo .env');
    }
    
    // PASO 1: Obtener categorías de Square Producción
    const squareCategories = await getSquareCategories();
    
    // PASO 2: Sincronizar categorías con la base de datos
    const categoryMap = await syncCategories(squareCategories);
    
    // PASO 3: Obtener productos de Square Producción
    const { objects: squareProducts, relatedObjects } = await getSquareProducts();
    
    if (squareProducts.length === 0) {
      logger.warn('No se encontraron productos en Square Producción.');
      await prisma.$disconnect();
      return;
    }
    
    // PASO 4: Sincronizar cada producto con la base de datos y Sanity
    logger.info('Sincronizando productos con la base de datos y Sanity...');
    const results = [];
    
    for (const product of squareProducts) {
      const result = await syncProduct(product, categoryMap, relatedObjects);
      results.push({
        name: product.item_data?.name || 'Desconocido',
        ...result
      });
      
      // Pequeña pausa para evitar sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Guardar resultados
    fs.writeFileSync(
      path.join(process.cwd(), 'sync-production-results.json'), 
      JSON.stringify(results, null, 2)
    );
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info(`
      === SINCRONIZACIÓN COMPLETADA ===
      * Productos procesados: ${squareProducts.length}
      * Sincronizados con éxito: ${successCount}
      * Fallidos: ${failureCount}
      * Resultados guardados en: sync-production-results.json
    `);
    
  } catch (error) {
    logger.error('Error en la sincronización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
main(); 