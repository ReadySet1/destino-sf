// src/scripts/simple-sync.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma
const prisma = new PrismaClient();

// Square configuration - use sandbox environment (working with current token)
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_HOST = 'connect.squareupsandbox.com'; // Using sandbox

// Basic logger
const logger = {
  info: (...args) => console.log(new Date().toISOString(), 'INFO:', ...args),
  error: (...args) => console.error(new Date().toISOString(), 'ERROR:', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), 'WARN:', ...args)
};

// Function to make HTTPS requests
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
            reject(new Error(`Error parsing response: ${error}`));
          }
        } else {
          reject(new Error(`HTTP Error: ${res.statusCode} - ${body}`));
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

// Use remove-all-products.js to clean the database
async function removeAllProducts() {
  logger.info('Running remove-all-products.js...');
  try {
    const { stdout, stderr } = await execAsync('node remove-all-products.js');
    
    if (stderr) {
      logger.error('Error running remove-all-products.js:', stderr);
      return false;
    }
    
    logger.info('Output from remove-all-products.js:', stdout);
    return true;
  } catch (error) {
    logger.error('Error executing remove-all-products.js:', error);
    return false;
  }
}

// Get Square categories
async function getSquareCategories() {
  logger.info('Getting categories from Square...');
  
  const options = {
    hostname: SQUARE_HOST,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
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
    logger.info(`Found ${categories.length} categories in Square`);
    return categories;
  } catch (error) {
    logger.error('Error getting categories from Square:', error);
    throw error;
  }
}

// Get Square products
async function getSquareProducts() {
  logger.info('Getting products from Square...');
  
  const options = {
    hostname: SQUARE_HOST,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
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
    logger.info(`Found ${items.length} products in Square`);
    return {
      objects: items,
      relatedObjects: response.related_objects || []
    };
  } catch (error) {
    logger.error('Error getting products from Square:', error);
    throw error;
  }
}

// Get product images
async function getProductImages(product, relatedObjects) {
  const imageUrls = [];
  const imageIds = product.item_data?.image_ids || [];
  
  if (imageIds.length === 0) {
    return imageUrls;
  }
  
  // Find image objects in relatedObjects
  for (const imageId of imageIds) {
    const imageObject = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');
    
    if (imageObject && imageObject.image_data && imageObject.image_data.url) {
      imageUrls.push(imageObject.image_data.url);
    } else {
      // If not in relatedObjects, try to get it directly
      try {
        const imageData = await fetchCatalogImageById(imageId);
        if (imageData && imageData.image_data && imageData.image_data.url) {
          imageUrls.push(imageData.image_data.url);
        }
      } catch (error) {
        logger.error(`Error getting image ${imageId}:`, error);
      }
    }
  }
  
  return imageUrls;
}

// Get a specific image by ID
async function fetchCatalogImageById(imageId) {
  logger.info(`Getting image details with ID: ${imageId}`);
  
  const options = {
    hostname: SQUARE_HOST,
    path: `/v2/catalog/object/${imageId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpsRequest(options);
    return response.object;
  } catch (error) {
    logger.error(`Error getting image ${imageId}:`, error);
    return null;
  }
}

// Function to create a slug from a string
function createSlug(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Create or find a default category
async function ensureDefaultCategory() {
  logger.info('Ensuring default category exists...');
  
  const defaultCategory = await prisma.category.findFirst({
    where: { name: 'Default' }
  });
  
  if (defaultCategory) {
    logger.info(`Found existing default category with ID: ${defaultCategory.id}`);
    return defaultCategory;
  }
  
  const newCategory = await prisma.category.create({
    data: {
      name: 'Default',
      slug: 'default'
    }
  });
  
  logger.info(`Created new default category with ID: ${newCategory.id}`);
  return newCategory;
}

// Sync products from Square to database
async function syncProducts(squareProductsResponse) {
  const { objects: products, relatedObjects } = squareProductsResponse;
  logger.info(`Starting sync of ${products.length} products...`);
  
  // Get default category
  const defaultCategory = await ensureDefaultCategory();
  
  for (const product of products) {
    try {
      const productData = product.item_data;
      if (!productData) continue;
      
      // Get product images
      const imageUrls = await getProductImages(product, relatedObjects);
      
      // Create slug
      const slug = createSlug(productData.name);
      
      // Calculate base price from first variation
      let basePrice = 0;
      const variations = productData.variations || [];
      if (variations.length > 0) {
        const firstVariation = variations[0];
        const priceAmount = firstVariation.item_variation_data?.price_money?.amount || 0;
        basePrice = priceAmount / 100; // Convert cents to dollars
      }
      
      // Create the product in database with category relation
      const dbProduct = await prisma.product.create({
        data: {
          squareId: product.id,
          name: productData.name,
          slug,
          description: productData.description || '',
          images: imageUrls,
          price: basePrice,
          isArchived: false,
          active: true,
          category: {
            connect: { id: defaultCategory.id }
          }
        }
      });
      
      // Process variants
      logger.info(`Processing ${variations.length} variants for ${productData.name}`);
      
      for (const variation of variations) {
        const variationData = variation.item_variation_data;
        if (!variationData) continue;
        
        // Get pricing info
        let price = 0;
        if (variationData.price_money) {
          price = variationData.price_money.amount / 100; // Convert from cents
        }
        
        // Create variant in database
        await prisma.variant.create({
          data: {
            squareId: variation.id,
            name: variationData.name,
            price,
            sku: variationData.sku || '',
            inventoryCount: variationData.inventory_count || 0,
            isArchived: false,
            product: {
              connect: { id: dbProduct.id }
            }
          }
        });
      }
      
      logger.info(`Product synchronized: ${productData.name}`);
    } catch (error) {
      logger.error(`Error syncing product ${product.item_data?.name || 'Unknown'}:`, error);
    }
  }
  
  logger.info('Products sync completed');
}

// Main function
async function main() {
  try {
    logger.info('Starting simple sync process...');
    
    // Step 1: Remove all existing products
    const removalSuccess = await removeAllProducts();
    if (!removalSuccess) {
      logger.error('Product removal failed, but continuing with sync...');
    }
    
    // Step 2: Get products from Square
    const squareProducts = await getSquareProducts();
    
    // Step 3: Sync products
    await syncProducts(squareProducts);
    
    logger.info('Simple sync completed successfully!');
  } catch (error) {
    logger.error('Error in sync process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 