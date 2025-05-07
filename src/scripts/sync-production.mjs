// src/scripts/sync-production.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import https from 'https';
import fs from 'fs';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma
const prisma = new PrismaClient();

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

// Create or get default category
async function ensureDefaultCategory() {
  logger.info('Ensuring default category exists...');
  
  try {
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
        slug: 'default',
        description: 'Default product category'
      }
    });
    
    logger.info(`Created new default category with ID: ${newCategory.id}`);
    return newCategory;
  } catch (error) {
    logger.error('Error ensuring default category exists:', error);
    throw error;
  }
}

// Get Square categories
async function getSquareCategories(token, host) {
  logger.info('Getting categories from Square...');
  
  const options = {
    hostname: host,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
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
async function getSquareProducts(token, host) {
  logger.info('Getting products from Square...');
  
  const options = {
    hostname: host,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
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
    
    // Optionally save the catalog to a file for debugging
    fs.writeFileSync(
      path.resolve(__dirname, '../../production-catalog.json'), 
      JSON.stringify(response, null, 2)
    );
    
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
async function getProductImages(product, relatedObjects, token, host) {
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
        const imageData = await fetchCatalogImageById(imageId, token, host);
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
async function fetchCatalogImageById(imageId, token, host) {
  logger.info(`Getting image details with ID: ${imageId}`);
  
  const options = {
    hostname: host,
    path: `/v2/catalog/object/${imageId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
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

// Create a unique slug to avoid conflicts
async function createUniqueSlug(name, prisma) {
  let baseSlug = createSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  // Check if slug exists, if so add a counter
  let existingProduct = await prisma.product.findUnique({
    where: { slug }
  });
  
  // While there's a product with this slug, increment counter and try again
  while (existingProduct) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    existingProduct = await prisma.product.findUnique({
      where: { slug }
    });
  }
  
  return slug;
}

// Delete all existing products
async function removeAllProducts() {
  try {
    logger.info('Removing all existing products and variants...');
    
    // Delete all variants first (they have a foreign key constraint)
    const deletedVariants = await prisma.variant.deleteMany();
    logger.info(`Deleted ${deletedVariants.count} variants`);
    
    // Delete all products
    const deletedProducts = await prisma.product.deleteMany();
    logger.info(`Deleted ${deletedProducts.count} products`);
    
    return true;
  } catch (error) {
    logger.error('Error removing products:', error);
    return false;
  }
}

// Sync products from Square to database
async function syncProducts(squareProductsResponse, defaultCategory, token, host) {
  const { objects: products, relatedObjects } = squareProductsResponse;
  
  logger.info(`Starting sync of ${products.length} products...`);
  
  const results = {
    success: 0,
    error: 0,
    details: []
  };
  
  for (const product of products) {
    try {
      const productData = product.item_data;
      if (!productData) continue;
      
      // Get product images
      const imageUrls = await getProductImages(product, relatedObjects, token, host);
      
      // Create slug
      const slug = await createUniqueSlug(productData.name, prisma);
      
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
          active: true,
          featured: false,
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
            squareVariantId: variation.id,
            name: variationData.name,
            price,
            product: {
              connect: { id: dbProduct.id }
            }
          }
        });
      }
      
      results.success++;
      results.details.push({
        product: productData.name,
        status: 'success',
        variants: variations.length
      });
      
      logger.info(`Product synchronized: ${productData.name}`);
    } catch (error) {
      results.error++;
      results.details.push({
        product: product.item_data?.name || 'Unknown',
        status: 'error',
        error: error.message
      });
      
      logger.error(`Error syncing product ${product.item_data?.name || 'Unknown'}:`, error);
    }
  }
  
  // Save results to a file
  fs.writeFileSync(
    path.resolve(__dirname, '../../sync-production-results.json'), 
    JSON.stringify(results, null, 2)
  );
  
  logger.info(`Products sync completed. Success: ${results.success}, Error: ${results.error}`);
  return results;
}

// Main function
async function main() {
  try {
    logger.info('Starting production sync process...');
    
    // Check if production token exists
    const productionToken = process.env.SQUARE_PRODUCTION_TOKEN;
    
    if (!productionToken) {
      logger.error('SQUARE_PRODUCTION_TOKEN is not set in your environment. Please add it to your .env.local file.');
      logger.error('Example: SQUARE_PRODUCTION_TOKEN="your_production_token_here"');
      return;
    }
    
    const host = 'connect.squareup.com'; // Production environment
    logger.info('Using Square PRODUCTION environment.');
    
    // Step 1: Remove all existing products
    await removeAllProducts();
    
    // Step 2: Ensure default category exists
    const defaultCategory = await ensureDefaultCategory();
    
    // Step 3: Get products from Square
    const squareProducts = await getSquareProducts(productionToken, host);
    
    // Step 4: Sync products
    await syncProducts(squareProducts, defaultCategory, productionToken, host);
    
    logger.info('Product sync from production completed successfully!');
  } catch (error) {
    logger.error('Error in sync process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 