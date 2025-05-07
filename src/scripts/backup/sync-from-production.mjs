// src/scripts/sync-from-production.mjs
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import fs from 'fs';

const execAsync = promisify(exec);

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (at project root)
config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Prisma
const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask a question and get user input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

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
    const { stdout, stderr } = await execAsync('node src/scripts/remove-all-products.js');
    
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
async function syncProducts(squareProductsResponse, categoryMapping, token, host) {
  const { objects: products, relatedObjects } = squareProductsResponse;
  const { squareToCategoryMap, defaultCategory } = categoryMapping;
  
  logger.info(`Starting sync of ${products.length} products...`);
  
  for (const product of products) {
    try {
      const productData = product.item_data;
      if (!productData) continue;
      
      // Get product category from mapping
      let category = defaultCategory;
      if (productData.category_id && squareToCategoryMap.has(productData.category_id)) {
        category = squareToCategoryMap.get(productData.category_id);
      }
      
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
            connect: { id: category.id }
          }
        }
      });
      
      // Process variants
      logger.info(`Processing ${variations.length} variants for ${productData.name} (Category: ${category.name})`);
      
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
      
      logger.info(`Product synchronized: ${productData.name}`);
    } catch (error) {
      logger.error(`Error syncing product ${product.item_data?.name || 'Unknown'}:`, error);
    }
  }
  
  logger.info('Products sync completed');
}

// Store production token in env file
async function storeProductionToken(token) {
  const envPath = path.resolve(__dirname, '../../.env.local');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if SQUARE_PRODUCTION_TOKEN already exists
    if (envContent.includes('SQUARE_PRODUCTION_TOKEN=')) {
      // Replace existing token
      envContent = envContent.replace(
        /SQUARE_PRODUCTION_TOKEN=["']?[^"'\n]*["']?/,
        `SQUARE_PRODUCTION_TOKEN="${token}"`
      );
    } else {
      // Add new token
      envContent += `\nSQUARE_PRODUCTION_TOKEN="${token}"\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    logger.info('Production token saved to .env.local file');
    return true;
  } catch (error) {
    logger.error('Error saving production token:', error);
    return false;
  }
}

// Get and map Square categories to local categories
async function syncCategories(token, host) {
  logger.info('Getting categories from Square and mapping to local categories...');
  
  // Get Square categories
  const squareCategories = await getSquareCategories(token, host);
  
  // Get all local categories
  const localCategories = await prisma.category.findMany();
  logger.info(`Found ${localCategories.length} local categories`);
  
  // Create a map of normalized category names to local categories
  const categoryMap = new Map();
  
  // Populate the map with normalized names (lowercase, trimmed)
  localCategories.forEach(category => {
    const normalizedName = category.name.trim().toLowerCase();
    categoryMap.set(normalizedName, category);
  });
  
  // Ensure we have the Default category
  let defaultCategory = localCategories.find(cat => cat.name === 'Default');
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Default',
        slug: 'default'
      }
    });
    logger.info('Created Default category');
    categoryMap.set('default', defaultCategory);
  }
  
  // Create a mapping from Square category IDs to local category IDs
  const squareToCategoryMap = new Map();
  
  // For each Square category, find a matching local category
  for (const squareCategory of squareCategories) {
    const categoryData = squareCategory.category_data;
    if (!categoryData || !categoryData.name) continue;
    
    const squareCategoryName = categoryData.name.trim();
    const normalizedSquareName = squareCategoryName.toLowerCase();
    
    // Find a matching local category
    if (categoryMap.has(normalizedSquareName)) {
      // We found a direct match
      const matchedCategory = categoryMap.get(normalizedSquareName);
      squareToCategoryMap.set(squareCategory.id, matchedCategory);
      logger.info(`Mapped Square category "${squareCategoryName}" to local category "${matchedCategory.name}"`);
    } else {
      // No direct match found, use default
      squareToCategoryMap.set(squareCategory.id, defaultCategory);
      logger.info(`No match for Square category "${squareCategoryName}", using Default`);
    }
  }
  
  return {
    squareToCategoryMap,
    defaultCategory
  };
}

// Main function
async function main() {
  try {
    logger.info('Starting production sync process...');
    
    // Check if production token exists
    let productionToken = process.env.SQUARE_PRODUCTION_TOKEN;
    
    if (!productionToken) {
      console.log('\nNo production token found in your environment.');
      const shouldContinue = await question('Would you like to enter a production token now? (y/n): ');
      
      if (shouldContinue.toLowerCase() === 'y') {
        productionToken = await question('Enter your Square production access token: ');
        
        if (!productionToken) {
          logger.error('No token provided, exiting...');
          rl.close();
          return;
        }
        
        const shouldSave = await question('Save this token for future use? (y/n): ');
        if (shouldSave.toLowerCase() === 'y') {
          await storeProductionToken(productionToken);
        }
      } else {
        logger.info('Using sandbox environment instead...');
        productionToken = process.env.SQUARE_ACCESS_TOKEN;
        
        if (!productionToken) {
          logger.error('No sandbox token found either, exiting...');
          rl.close();
          return;
        }
      }
    }
    
    // Set host based on token type
    const host = productionToken === process.env.SQUARE_ACCESS_TOKEN 
      ? 'connect.squareupsandbox.com'
      : 'connect.squareup.com';
    
    logger.info(`Using Square ${host === 'connect.squareup.com' ? 'PRODUCTION' : 'SANDBOX'} environment.`);
    
    // Step 1: Remove all existing products
    const removalSuccess = await removeAllProducts();
    if (!removalSuccess) {
      const shouldContinue = await question('Product removal failed. Continue anyway? (y/n): ');
      if (shouldContinue.toLowerCase() !== 'y') {
        logger.info('Sync process aborted.');
        rl.close();
        return;
      }
    }
    
    // Step 2: Get products from Square
    const squareProducts = await getSquareProducts(productionToken, host);
    
    // Step 3: Sync products
    const categoryMapping = await syncCategories(productionToken, host);
    await syncProducts(squareProducts, categoryMapping, productionToken, host);
    
    logger.info('Product sync from production completed successfully!');
  } catch (error) {
    logger.error('Error in sync process:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main(); 