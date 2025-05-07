// src/scripts/full-production-sync.mjs
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import fs from 'fs';
import { createClient } from '@sanity/client';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma
const prisma = new PrismaClient();

// Square configuration
const PRODUCTION_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const PRODUCTION_HOST = 'connect.squareup.com';

// Initialize Sanity client
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

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

// Step 1: Remove all existing products and variants
async function removeAllProducts() {
  logger.info('Starting product removal...');
  try {
    // Delete all order items that reference products first
    logger.info('Deleting all order items referencing products...');
    await prisma.orderItem.deleteMany({});
    
    // Delete all variants 
    logger.info('Deleting all product variants...');
    await prisma.variant.deleteMany({});
    
    // Delete all products
    logger.info('Deleting all products...');
    const { count } = await prisma.product.deleteMany({});
    
    logger.info(`Successfully removed ${count} products`);
    return true;
  } catch (error) {
    logger.error('Error removing products:', error);
    return false;
  }
}

// Get Square categories from production
async function getSquareCategories() {
  logger.info('Getting categories from Square Production...');
  
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
    logger.info(`Found ${categories.length} categories in Square Production`);
    return categories;
  } catch (error) {
    logger.error('Error getting categories from Square Production:', error);
    throw error;
  }
}

// Get Square products from production
async function getSquareProducts() {
  logger.info('Getting products from Square Production...');
  
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
    logger.info(`Found ${items.length} products in Square Production`);
    return {
      objects: items,
      relatedObjects: response.related_objects || []
    };
  } catch (error) {
    logger.error('Error getting products from Square Production:', error);
    throw error;
  }
}

// Get product images
async function getProductImages(product, relatedObjects) {
  logger.info(`Looking for images for product: ${product.item_data?.name || 'Unknown'}`);
  
  const imageUrls = [];
  const imageIds = product.item_data?.image_ids || [];
  
  if (imageIds.length === 0) {
    logger.info('No image IDs associated with the product');
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

// Sync categories from Square to database
async function syncCategories(squareCategories) {
  logger.info('Syncing categories...');
  
  for (const category of squareCategories) {
    const categoryData = category.category_data;
    if (!categoryData) continue;
    
    const name = categoryData.name;
    const slug = createSlug(name);
    
    try {
      await prisma.category.upsert({
        where: { squareId: category.id },
        update: {
          name,
          slug
        },
        create: {
          squareId: category.id,
          name,
          slug
        }
      });
      logger.info(`Category synchronized: ${name}`);
    } catch (error) {
      logger.error(`Error syncing category ${name}:`, error);
    }
  }
  
  logger.info('Categories sync completed');
}

// Sync products from Square to database
async function syncProducts(squareProductsResponse) {
  const { objects: products, relatedObjects } = squareProductsResponse;
  logger.info(`Starting sync of ${products.length} products...`);
  
  // Get all categories for reference
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map(c => [c.squareId, c]));
  
  for (const product of products) {
    try {
      const productData = product.item_data;
      if (!productData) continue;
      
      // Get product category
      let categoryId = null;
      if (productData.category_id) {
        const category = categoryMap.get(productData.category_id);
        if (category) {
          categoryId = category.id;
        }
      }
      
      // Get product images
      const imageUrls = await getProductImages(product, relatedObjects);
      
      // Create slug
      const slug = createSlug(productData.name);
      
      // Create the product in database
      const dbProduct = await prisma.product.upsert({
        where: { squareId: product.id },
        update: {
          name: productData.name,
          slug,
          description: productData.description || '',
          imageUrls,
          categoryId,
          isArchived: false
        },
        create: {
          squareId: product.id,
          name: productData.name,
          slug,
          description: productData.description || '',
          imageUrls,
          categoryId,
          isArchived: false
        }
      });
      
      // Process variants
      const variations = productData.variations || [];
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
        await prisma.variant.upsert({
          where: { squareId: variation.id },
          update: {
            name: variationData.name,
            price,
            sku: variationData.sku || '',
            inventoryCount: variationData.inventory_count || 0,
            isArchived: false,
            productId: dbProduct.id
          },
          create: {
            squareId: variation.id,
            name: variationData.name,
            price,
            sku: variationData.sku || '',
            inventoryCount: variationData.inventory_count || 0,
            isArchived: false,
            productId: dbProduct.id
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
    logger.info('Starting full production sync process...');
    
    // Step 1: Remove all existing products
    const removalSuccess = await removeAllProducts();
    if (!removalSuccess) {
      logger.error('Product removal failed, aborting sync...');
      return;
    }
    
    // Step 2: Get categories from Square production
    const squareCategories = await getSquareCategories();
    
    // Step 3: Sync categories
    await syncCategories(squareCategories);
    
    // Step 4: Get products from Square production
    const squareProducts = await getSquareProducts();
    
    // Step 5: Sync products
    await syncProducts(squareProducts);
    
    logger.info('Full production sync completed successfully!');
  } catch (error) {
    logger.error('Error in sync process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 