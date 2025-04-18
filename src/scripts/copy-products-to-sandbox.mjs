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

// Obtener productos del catálogo de producción
async function getProductionCatalog() {
  logger.info('Obteniendo productos del catálogo de producción...');
  
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
    object_types: ['ITEM']
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    const objects = response.objects || [];
    logger.info(`Se encontraron ${objects.length} productos en el catálogo de producción`);
    return objects;
  } catch (error) {
    logger.error('Error al obtener productos de producción:', error);
    throw error;
  }
}

// Crear producto en el entorno de sandbox
async function createProductInSandbox(product) {
  logger.info(`Creando producto en sandbox: ${product.item_data?.name || 'Desconocido'}`);
  
  // Generar un ID único para la idempotencia
  const idempotencyKey = `copy-product-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const uniqueId = `#${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Crear un nuevo objeto para el sandbox con nuevos IDs temporales
  const newProduct = {
    type: product.type,
    id: uniqueId, // ID temporal con # como prefijo
    item_data: {
      ...product.item_data,
      name: `${product.item_data.name}`,
      variations: product.item_data.variations?.map((variation, index) => ({
        type: variation.type,
        id: `${uniqueId}-var-${index}`, // ID temporal para la variación
        item_variation_data: {
          ...variation.item_variation_data,
          name: variation.item_variation_data.name || 'Regular',
          pricing_type: variation.item_variation_data.pricing_type || 'FIXED_PRICING',
          price_money: variation.item_variation_data.price_money,
          item_id: uniqueId // Referencia al producto principal
        }
      }))
    }
  };
  
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
    return response;
  } catch (error) {
    logger.error(`Error al crear producto en sandbox: ${error.message}`);
    return { error: error.message };
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
    
    logger.info('Iniciando copia de productos de producción a sandbox');
    
    // Obtener productos de producción
    const productionProducts = await getProductionCatalog();
    
    if (productionProducts.length === 0) {
      logger.warn('No se encontraron productos en el catálogo de producción.');
      return;
    }
    
    // Crear archivo con los datos de producción para referencia
    fs.writeFileSync(
      path.join(process.cwd(), 'production-catalog.json'), 
      JSON.stringify(productionProducts, null, 2)
    );
    logger.info('Datos de catálogo de producción guardados en production-catalog.json');
    
    // Copiar productos a sandbox
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    for (const product of productionProducts) {
      try {
        const name = product.item_data?.name || 'Desconocido';
        logger.info(`Procesando producto: ${name} (${product.id})`);
        
        const result = await createProductInSandbox(product);
        
        if (result.error) {
          failureCount++;
          results.push({
            name,
            success: false,
            error: result.error
          });
        } else {
          successCount++;
          results.push({
            name,
            success: true,
            sandboxId: result?.catalog_object?.id
          });
        }
        
        // Añadir un pequeño retraso para evitar límites de velocidad de la API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`Error procesando producto ${product.id}:`, error);
        failureCount++;
        results.push({
          name: product.item_data?.name || 'Desconocido',
          success: false,
          error: error.message
        });
      }
    }
    
    // Guardar resultados
    fs.writeFileSync(
      path.join(process.cwd(), 'copy-products-results.json'), 
      JSON.stringify(results, null, 2)
    );
    
    logger.info(`
      Proceso completado!
      * Productos encontrados: ${productionProducts.length}
      * Copiados con éxito: ${successCount}
      * Fallidos: ${failureCount}
      * Resultados guardados en: copy-products-results.json
    `);
    
  } catch (error) {
    logger.error('Error en el proceso de copia:', error);
    process.exit(1);
  }
}

// Ejecutar script
main(); 