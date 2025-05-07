import https from 'https';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
config();

// Configuración de producción y sandbox
const PRODUCTION_TOKEN = process.env.SQUARE_PRODUCTION_TOKEN; // Token de producción
const SANDBOX_TOKEN = process.env.SQUARE_ACCESS_TOKEN; // Token de sandbox

// Hosts de la API
const PRODUCTION_HOST = 'connect.squareup.com';
const SANDBOX_HOST = 'connect.squareupsandbox.com';

// Mapeo de IDs de categorías (producción -> sandbox)
const categoryIdMap = {};

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

// Obtener todos los objetos del catálogo de producción
async function getProductionCatalog() {
  logger.info('Obteniendo el catálogo completo de producción...');
  
  const options = {
    hostname: PRODUCTION_HOST,
    path: '/v2/catalog/list',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpsRequest(options);
    const objects = response.objects || [];
    logger.info(`Se encontraron ${objects.length} objetos en el catálogo de producción`);
    
    // Clasificar objetos por tipo
    const categories = objects.filter(obj => obj.type === 'CATEGORY');
    const items = objects.filter(obj => obj.type === 'ITEM');
    
    logger.info(`Categorías: ${categories.length}, Productos: ${items.length}`);
    
    return { categories, items, allObjects: objects };
  } catch (error) {
    logger.error('Error al obtener catálogo de producción:', error);
    throw error;
  }
}

// Crear categoría en el entorno de sandbox
async function createCategoryInSandbox(category) {
  logger.info(`Creando categoría en sandbox: ${category.category_data?.name || 'Desconocida'}`);
  
  // Generar un ID único para la idempotencia
  const idempotencyKey = `copy-category-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const uniqueId = `#${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Crear un nuevo objeto para el sandbox
  const newCategory = {
    type: category.type,
    id: uniqueId,
    category_data: {
      ...category.category_data,
      name: category.category_data.name
    }
  };
  
  // Preparar el cuerpo de la solicitud
  const requestBody = {
    idempotency_key: idempotencyKey,
    object: newCategory
  };
  
  const options = {
    hostname: SANDBOX_HOST,
    path: '/v2/catalog/object',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SANDBOX_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    const newId = response?.catalog_object?.id;
    logger.info(`Categoría creada con éxito en sandbox: ${newId}`);
    
    // Guardar mapeo de ID original a nuevo ID
    categoryIdMap[category.id] = newId;
    
    return {
      success: true,
      oldId: category.id,
      newId: newId
    };
  } catch (error) {
    logger.error(`Error al crear categoría en sandbox: ${error.message}`);
    return { 
      success: false,
      oldId: category.id,
      error: error.message 
    };
  }
}

// Crear producto en el entorno de sandbox
async function createProductInSandbox(product) {
  logger.info(`Creando producto en sandbox: ${product.item_data?.name || 'Desconocido'}`);
  
  // Generar un ID único para la idempotencia
  const idempotencyKey = `copy-product-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const uniqueId = `#${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Crear un nuevo objeto para el sandbox
  const newProduct = {
    type: product.type,
    id: uniqueId,
    item_data: {
      ...product.item_data,
      name: product.item_data.name
    }
  };
  
  // Reemplazar la categoría con la nueva ID correspondiente
  if (product.item_data.category_id && categoryIdMap[product.item_data.category_id]) {
    newProduct.item_data.category_id = categoryIdMap[product.item_data.category_id];
  } else {
    // Si no hay mapeo para esta categoría, eliminarla para evitar errores
    delete newProduct.item_data.category_id;
  }
  
  // Manejar las variaciones del producto
  if (product.item_data.variations && product.item_data.variations.length > 0) {
    newProduct.item_data.variations = product.item_data.variations.map((variation, index) => ({
      type: variation.type,
      id: `${uniqueId}-var-${index}`,
      item_variation_data: {
        name: variation.item_variation_data?.name || 'Regular',
        pricing_type: variation.item_variation_data?.pricing_type || 'FIXED_PRICING',
        price_money: variation.item_variation_data?.price_money,
        item_id: uniqueId
      }
    }));
  }
  
  // Eliminar campos que no se deben enviar
  delete newProduct.item_data.image_ids;
  delete newProduct.item_data.ecom_visibility;
  delete newProduct.item_data.item_options;
  
  // Preparar el cuerpo de la solicitud
  const requestBody = {
    idempotency_key: idempotencyKey,
    object: newProduct
  };
  
  const options = {
    hostname: SANDBOX_HOST,
    path: '/v2/catalog/object',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SANDBOX_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    logger.info(`Producto creado con éxito en sandbox: ${response?.catalog_object?.id || 'ID desconocido'}`);
    return {
      success: true,
      oldId: product.id,
      newId: response?.catalog_object?.id
    };
  } catch (error) {
    logger.error(`Error al crear producto en sandbox: ${error.message}`);
    return { 
      success: false,
      oldId: product.id,
      error: error.message 
    };
  }
}

// Función principal
async function main() {
  try {
    // Verificar tokens
    if (!PRODUCTION_TOKEN) {
      throw new Error("Falta el token de producción. Agrega SQUARE_PRODUCTION_TOKEN a tu archivo .env");
    }
    if (!SANDBOX_TOKEN) {
      throw new Error("Falta el token de sandbox. Agrega SQUARE_ACCESS_TOKEN a tu archivo .env");
    }
    
    logger.info('Iniciando copia de catálogo de producción a sandbox');
    
    // Obtener catálogo de producción
    const { categories, items, allObjects } = await getProductionCatalog();
    
    // Guardar datos completos para referencia
    fs.writeFileSync(
      path.join(process.cwd(), 'production-catalog-full.json'), 
      JSON.stringify(allObjects, null, 2)
    );
    logger.info('Datos completos del catálogo guardados en production-catalog-full.json');
    
    // PASO 1: Copiar categorías primero
    logger.info('=== COPIANDO CATEGORÍAS ===');
    const categoryResults = [];
    
    for (const category of categories) {
      try {
        const result = await createCategoryInSandbox(category);
        categoryResults.push(result);
        
        // Añadir un pequeño retraso para evitar límites de velocidad de la API
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`Error procesando categoría ${category.id}:`, error);
        categoryResults.push({
          success: false,
          oldId: category.id,
          error: error.message
        });
      }
    }
    
    // Guardar mapeo de categorías
    fs.writeFileSync(
      path.join(process.cwd(), 'category-id-mapping.json'), 
      JSON.stringify(categoryIdMap, null, 2)
    );
    logger.info('Mapeo de IDs de categorías guardado en category-id-mapping.json');
    
    // PASO 2: Copiar productos usando las nuevas IDs de categorías
    logger.info('=== COPIANDO PRODUCTOS ===');
    const productResults = [];
    
    for (const product of items) {
      try {
        const result = await createProductInSandbox(product);
        productResults.push(result);
        
        // Añadir un pequeño retraso para evitar límites de velocidad de la API
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`Error procesando producto ${product.id}:`, error);
        productResults.push({
          success: false,
          oldId: product.id,
          error: error.message
        });
      }
    }
    
    // Guardar resultados finales
    const fullResults = {
      categories: {
        total: categories.length,
        successful: categoryResults.filter(r => r.success).length,
        failed: categoryResults.filter(r => !r.success).length,
        results: categoryResults
      },
      products: {
        total: items.length,
        successful: productResults.filter(r => r.success).length,
        failed: productResults.filter(r => !r.success).length,
        results: productResults
      }
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'copy-to-sandbox-results.json'), 
      JSON.stringify(fullResults, null, 2)
    );
    
    logger.info(`
      Proceso completado!
      
      === CATEGORÍAS ===
      * Total: ${categories.length}
      * Copiadas con éxito: ${categoryResults.filter(r => r.success).length}
      * Fallidas: ${categoryResults.filter(r => !r.success).length}
      
      === PRODUCTOS ===
      * Total: ${items.length}
      * Copiados con éxito: ${productResults.filter(r => r.success).length}
      * Fallidos: ${productResults.filter(r => !r.success).length}
      
      * Resultados guardados en: copy-to-sandbox-results.json
    `);
    
  } catch (error) {
    logger.error('Error en el proceso de copia:', error);
    process.exit(1);
  }
}

// Ejecutar script
main(); 