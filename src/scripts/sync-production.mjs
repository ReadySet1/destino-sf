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
  // Add cache control headers to prevent caching
  options.headers = options.headers || {};
  options.headers['Cache-Control'] = 'no-cache, no-store';
  options.headers['Pragma'] = 'no-cache';
  
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

// Process Square categories - now handles both regular and catering categories
async function processSquareCategories(categories) {
  const results = {
    regular: [],
    catering: []
  };
  
  logger.info(`Processing ${categories.length} categories from Square...`);
  
  for (const category of categories) {
    const categoryData = category.category_data;
    if (!categoryData || !categoryData.name) {
      logger.warn(`Category missing name: ${JSON.stringify(category)}`);
      continue;
    }
    
    const name = categoryData.name.trim();
    const categoryId = category.id;
    logger.info(`Processing category: ${name} (${categoryId})`);
    
    // Check if this is a catering category
    const isCateringCategory = isCateringCategoryName(name);
    logger.info(`Category ${name} isCatering=${isCateringCategory}`);
    
    if (isCateringCategory) {
      results.catering.push(category);
    } else {
      results.regular.push(category);
    }
  }
  
  logger.info(`Processed ${results.regular.length} regular categories and ${results.catering.length} catering categories`);
  return results;
}

// Improved function to check if a category name indicates a catering category
function isCateringCategoryName(categoryName) {
  // Normalize by trimming spaces and converting to uppercase
  const normalizedName = categoryName.trim().toUpperCase();
  // Check for both formats with and without space after hyphen
  return normalizedName === 'CATERING' || 
         normalizedName.startsWith('CATERING-') || 
         normalizedName.startsWith('CATERING- ');
}

// Extract all category IDs from a product
function extractCategoryIds(product) {
  const categoryIds = [];
  
  // Check all possible locations for category information
  if (product.item_data?.category_id) {
    categoryIds.push(product.item_data.category_id);
    logger.info(`Found category_id for product ${product.item_data?.name || product.id}: ${product.item_data.category_id}`);
  }
  
  // Check categories array
  if (product.item_data?.categories?.length) {
    product.item_data.categories.forEach(cat => {
      if (cat.id) {
        categoryIds.push(cat.id);
        logger.info(`Found category in categories array for product ${product.item_data?.name || product.id}: ${cat.id}`);
      }
    });
  }
  
  // Check reporting category
  if (product.item_data?.reporting_category?.id) {
    categoryIds.push(product.item_data.reporting_category.id);
    logger.info(`Found reporting_category for product ${product.item_data?.name || product.id}: ${product.item_data.reporting_category.id}`);
  }
  
  // Filter out duplicates
  const uniqueCategoryIds = [...new Set(categoryIds)];
  logger.info(`Product ${product.item_data?.name || product.id} has ${uniqueCategoryIds.length} unique categories: ${uniqueCategoryIds.join(', ')}`);
  
  return uniqueCategoryIds;
}

// Determine if a product is related to catering
function isCateringProduct(product, relatedObjects) {
  // Get all category IDs from the product
  const categoryIds = extractCategoryIds(product);
  
  if (categoryIds.length === 0) {
    logger.info(`No categories found for product ${product.item_data?.name || product.id}`);
    return false;
  }
  
  // Look up the category in relatedObjects
  for (const categoryId of categoryIds) {
    const categoryObject = relatedObjects.find(obj => obj.id === categoryId && obj.type === 'CATEGORY');
    if (categoryObject && categoryObject.category_data && categoryObject.category_data.name) {
      const categoryName = categoryObject.category_data.name;
      const isCatering = isCateringCategoryName(categoryName);
      
      if (isCatering) {
        logger.info(`Product ${product.item_data?.name || product.id} belongs to catering category: ${categoryName} (${categoryId})`);
        return true;
      }
    }
  }
  
  logger.info(`Product ${product.item_data?.name || product.id} is not a catering product`);
  return false;
}

// Create or update regular product categories
async function syncProductCategories(categories) {
  logger.info(`Synchronizing ${categories.length} product categories...`);
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };
  
  // Load the category ID mapping if it exists
  let categoryMapping = {};
  const categoryMappingPath = path.resolve(__dirname, '../../category-id-mapping.json');
  
  if (fs.existsSync(categoryMappingPath)) {
    try {
      categoryMapping = JSON.parse(fs.readFileSync(categoryMappingPath, 'utf8'));
      logger.info(`Loaded existing category ID mapping with ${Object.keys(categoryMapping).length} entries`);
    } catch (error) {
      logger.warn('Error loading category ID mapping, will create a new one:', error);
    }
  }
  
  for (const category of categories) {
    try {
      const categoryData = category.category_data;
      if (!categoryData) {
        results.skipped++;
        continue;
      }
      
      const name = categoryData.name;
      const slug = createSlug(name);
      
      // Check if we have a mapping for this category
      const mappedId = categoryMapping[category.id];
      
      // Try to find an existing category
      let existingCategory = null;
      if (mappedId) {
        // First try by mapped squareId
        existingCategory = await prisma.category.findFirst({
          where: { squareId: mappedId }
        });
      }
      
      if (!existingCategory) {
        // Then try by name
        existingCategory = await prisma.category.findFirst({
          where: { name }
        });
      }
      
      if (existingCategory) {
        // Update existing category
        await prisma.category.update({
          where: { id: existingCategory.id },
          data: {
            squareId: category.id,
            name,
            slug,
            order: existingCategory.order // Preserve existing order
          }
        });
        
        // Update the mapping
        categoryMapping[category.id] = existingCategory.squareId || category.id;
        results.updated++;
        logger.info(`Updated category: ${name}`);
      } else {
        // Create new category
        const newCategory = await prisma.category.create({
          data: {
            squareId: category.id,
            name,
            slug,
            order: 0 // Default order
          }
        });
        
        // Add to the mapping
        categoryMapping[category.id] = newCategory.squareId || category.id;
        results.created++;
        logger.info(`Created new category: ${name}`);
      }
    } catch (error) {
      results.errors++;
      logger.error(`Error syncing category ${category.category_data?.name || 'Unknown'}:`, error);
    }
  }
  
  // Save the updated mapping
  fs.writeFileSync(
    categoryMappingPath,
    JSON.stringify(categoryMapping, null, 2)
  );
  
  logger.info(`Category sync completed. Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`);
  return categoryMapping;
}

// Map catering category names to our CateringItemCategory enum values
function mapCateringCategoryName(name) {
  const normalizedName = name.toUpperCase().replace('CATERING-', '').trim();
  
  const mappings = {
    'APPETIZERS': 'STARTER',
    'BUFFET, STARTERS': 'STARTER',
    'LUNCH, STARTERS': 'STARTER',
    'BUFFET, ENTREES': 'ENTREE',
    'LUNCH, ENTREES': 'ENTREE',
    'DESSERTS': 'DESSERT',
    'BUFFET, SIDES': 'SIDE',
    'LUNCH, SIDES': 'SIDE',
    'SHARE PLATTERS': 'SIDE',
    'SALAD': 'SALAD',
    'SALADS': 'SALAD',
    'BEVERAGES': 'BEVERAGE',
    'DRINKS': 'BEVERAGE'
  };
  
  return mappings[normalizedName] || 'SIDE'; // Default to SIDE if no match
}

// Create or update catering items based on Square categories
async function syncCateringCategories(cateringCategories) {
  logger.info(`Synchronizing ${cateringCategories.length} catering categories...`);
  
  const results = {
    processed: 0,
    errors: 0
  };
  
  try {
    // For each catering category, make sure we have the proper entries in our system
    for (const category of cateringCategories) {
      const categoryData = category.category_data;
      if (!categoryData || !categoryData.name) continue;
      
      const name = categoryData.name.trim();
      const mappedCategory = mapCateringCategoryName(name);
      
      logger.info(`Mapped catering category "${name}" to "${mappedCategory}"`);
      results.processed++;
    }
    
    // Store the catering categories mapping for reference
    const cateringCategoriesMapping = cateringCategories.reduce((acc, category) => {
      if (category.category_data && category.category_data.name) {
        acc[category.id] = {
          name: category.category_data.name,
          mappedCategory: mapCateringCategoryName(category.category_data.name)
        };
      }
      return acc;
    }, {});
    
    fs.writeFileSync(
      path.resolve(__dirname, '../../catering-categories-mapping.json'),
      JSON.stringify(cateringCategoriesMapping, null, 2)
    );
  } catch (error) {
    results.errors++;
    logger.error('Error syncing catering categories:', error);
  }
  
  logger.info(`Catering category sync completed. Processed: ${results.processed}, Errors: ${results.errors}`);
  return results;
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
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store'
    }
  };
  
  const requestBody = {
    object_types: ['ITEM'],
    include_related_objects: true,
    include_category_path_to_root: true,
    include_deleted_objects: false,
    limit: 1000 // Increase the limit to get all items
  };
  
  try {
    logger.info('Sending request to Square API for product data...');
    const response = await httpsRequest(options, requestBody);
    const items = response.objects || [];
    const relatedObjects = response.related_objects || [];
    
    logger.info(`Found ${items.length} products and ${relatedObjects.length} related objects in Square`);
    
    // Count related objects by type
    const relatedObjectTypes = {};
    for (const obj of relatedObjects) {
      if (obj.type) {
        relatedObjectTypes[obj.type] = (relatedObjectTypes[obj.type] || 0) + 1;
      }
    }
    logger.info(`Related object types: ${JSON.stringify(relatedObjectTypes)}`);
    
    // Check for image objects specifically
    const imageObjects = relatedObjects.filter(obj => obj.type === 'IMAGE');
    logger.info(`Found ${imageObjects.length} IMAGE objects in related_objects`);
    
    // Log a sample image object if available
    if (imageObjects.length > 0) {
      logger.info(`Sample image object: ${JSON.stringify(imageObjects[0])}`);
    }
    
    // Check if any products have image_ids
    const productsWithImages = items.filter(item => item.item_data?.image_ids && item.item_data.image_ids.length > 0);
    logger.info(`${productsWithImages.length} out of ${items.length} products have image_ids`);
    
    // Optionally save the catalog to a file for debugging
    fs.writeFileSync(
      path.resolve(__dirname, '../../production-catalog.json'), 
      JSON.stringify(response, null, 2)
    );
    
    return {
      objects: items,
      relatedObjects: relatedObjects
    };
  } catch (error) {
    logger.error('Error getting products from Square:', error);
    throw error;
  }
}

// Get product images with improved retry and validation
async function getProductImages(product, relatedObjects, token, host) {
  const imageUrls = [];
  const imageIds = product.item_data?.image_ids || [];
  
  logger.info(`Processing images for product "${product.item_data?.name || 'Unknown'}" - found ${imageIds.length} image IDs`);
  
  if (imageIds.length === 0) {
    logger.info(`No image IDs found for product ${product.item_data?.name || 'Unknown'}`);
    return imageUrls;
  }
  
  // Log all image IDs for debugging
  logger.info(`Image IDs for product "${product.item_data?.name}": ${JSON.stringify(imageIds)}`);
  
  // Find image objects in relatedObjects
  for (const imageId of imageIds) {
    logger.info(`Looking for image ID ${imageId} in relatedObjects...`);
    
    try {
      // Try up to 3 times to get the image
      let imageUrl = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!imageUrl && retryCount < maxRetries) {
        // First try to find in related objects
        const imageObject = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');
        
        if (imageObject && imageObject.image_data && imageObject.image_data.url) {
          imageUrl = imageObject.image_data.url;
          logger.info(`Found image URL in relatedObjects: ${imageUrl}`);
        } else {
          // If not in relatedObjects, try to get it directly
          logger.info(`Image ID ${imageId} not found in relatedObjects (attempt ${retryCount + 1}), fetching directly...`);
          try {
            const imageData = await fetchCatalogImageById(imageId, token, host);
            if (imageData && imageData.image_data && imageData.image_data.url) {
              imageUrl = imageData.image_data.url;
              logger.info(`Retrieved image URL directly: ${imageUrl}`);
            }
          } catch (error) {
            logger.error(`Error getting image ${imageId} (attempt ${retryCount + 1}):`, error);
          }
        }
        
        retryCount++;
        if (!imageUrl && retryCount < maxRetries) {
          // Wait a bit before retrying
          logger.info(`Retrying image fetch for ${imageId}, attempt ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (imageUrl) {
        // Validate image URL
        if (await isValidImageUrl(imageUrl)) {
          // Add cache-busting parameter to prevent browser caching
          // Important: use a long-lived timestamp that won't change with each page render
          // But will update when we sync products again
          const syncTimestamp = Date.now();
          const cacheBustedUrl = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}cache_bust=${syncTimestamp}`;
          imageUrls.push(cacheBustedUrl);
          logger.info(`Added valid image URL with cache busting: ${cacheBustedUrl}`);
        } else {
          logger.warn(`Image URL validation failed for ${imageUrl}, skipping`);
        }
      } else {
        logger.warn(`Could not retrieve valid URL for image ID ${imageId} after ${maxRetries} attempts`);
      }
    } catch (error) {
      logger.error(`Error processing image ${imageId}:`, error);
    }
  }
  
  logger.info(`Final image URLs for "${product.item_data?.name}": ${JSON.stringify(imageUrls)}`);
  return imageUrls;
}

// Validate if an image URL is accessible
async function isValidImageUrl(url) {
  try {
    // Extract host and path from URL
    const urlObj = new URL(url);
    const options = {
      method: 'HEAD',
      hostname: urlObj.hostname,
      path: `${urlObj.pathname}${urlObj.search}`,
      timeout: 3000 // 3 second timeout
    };
    
    logger.info(`Validating image URL: ${url}`);
    
    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        const statusCode = res.statusCode;
        logger.info(`Image URL validation status: ${statusCode} for ${url}`);
        
        if (statusCode >= 200 && statusCode < 300) {
          resolve(true);
        } else {
          logger.warn(`Image URL returned status ${statusCode}: ${url}`);
          resolve(false);
        }
      });
      
      req.on('error', (error) => {
        logger.warn(`Image URL validation error for ${url}: ${error.message}`);
        resolve(false);
      });
      
      req.on('timeout', () => {
        logger.warn(`Image URL validation timeout for ${url}`);
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    logger.error(`Error validating image URL ${url}:`, error);
    return false;
  }
}

// Get a specific image by ID
async function fetchCatalogImageById(imageId, token, host) {
  logger.info(`Getting image details with ID: ${imageId}`);
  
  // Add a random query parameter to bypass any caching
  const timestamp = Date.now();
  const randomParam = Math.floor(Math.random() * 1000000);
  
  const options = {
    hostname: host,
    path: `/v2/catalog/object/${imageId}?_t=${timestamp}&_r=${randomParam}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  };
  
  try {
    const response = await httpsRequest(options);
    
    // Full logging to diagnose the response
    logger.info(`Square catalog object response keys: ${Object.keys(response).join(', ')}`);
    
    if (response && response.object) {
      logger.info(`Successfully retrieved image data for ID: ${imageId}`);
      
      // Log detailed object properties to debug
      const objectType = response.object.type;
      logger.info(`Retrieved object type: ${objectType}`);
      
      if (objectType === 'IMAGE' && response.object.image_data) {
        logger.info(`Image data keys: ${Object.keys(response.object.image_data).join(', ')}`);
        
        if (response.object.image_data.url) {
          logger.info(`Found image URL: ${response.object.image_data.url}`);
          return response.object;
        } else {
          logger.warn(`No URL in image_data for ${imageId}`);
        }
      } else {
        logger.warn(`Retrieved object is not an IMAGE or missing image_data: ${objectType}`);
      }
    } else {
      logger.warn(`No object found in response for ID: ${imageId}`);
      
      // Try alternative method: catalog search
      logger.info(`Trying alternative method (catalog search) for image ${imageId}...`);
      const altImageData = await searchCatalogForImage(imageId, token, host);
      if (altImageData) {
        return altImageData;
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Error getting image ${imageId}:`, error);
    
    // Try alternative method if the direct method failed
    try {
      logger.info(`Trying alternative method (catalog search) for image ${imageId} after error...`);
      const altImageData = await searchCatalogForImage(imageId, token, host);
      if (altImageData) {
        return altImageData;
      }
    } catch (altError) {
      logger.error(`Alternative method also failed for image ${imageId}:`, altError);
    }
    
    return null;
  }
}

// Alternative method to get image data using catalog search
async function searchCatalogForImage(imageId, token, host) {
  logger.info(`Searching catalog for image with ID: ${imageId}`);
  
  const options = {
    hostname: host,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store'
    }
  };
  
  const requestBody = {
    object_types: ['IMAGE'],
    query: {
      exact_query: {
        attribute_name: 'id',
        attribute_value: imageId
      }
    }
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    
    if (response && response.objects && response.objects.length > 0) {
      const imageObject = response.objects[0];
      logger.info(`Found image via search: ${imageId}`);
      return imageObject;
    }
    
    logger.warn(`Image not found via catalog search: ${imageId}`);
    return null;
  } catch (error) {
    logger.error(`Error searching catalog for image ${imageId}:`, error);
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

// Create or update catering items from Square data
async function syncCateringItems(squareProductsResponse, cateringCategoriesMapping) {
  const { objects: products, relatedObjects } = squareProductsResponse;
  
  logger.info('Identifying and syncing catering items...');
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    syncResults: [] // Detailed results for reporting
  };
  
  // Load existing catering items for update checks
  const existingItems = await prisma.cateringItem.findMany();
  const existingItemsByName = existingItems.reduce((acc, item) => {
    acc[item.name.toLowerCase()] = item;
    return acc;
  }, {});
  
  // Process only products marked as catering
  for (const product of products) {
    const syncResult = {
      productId: product.id,
      name: product.item_data?.name || 'Unknown',
      categoryIds: [],
      mappedCategory: null,
      success: false,
      action: 'skipped',
      error: null
    };
    
    try {
      if (!isCateringProduct(product, relatedObjects)) {
        results.skipped++;
        syncResult.action = 'skipped';
        syncResult.success = true;
        results.syncResults.push(syncResult);
        continue; // Skip non-catering products
      }
      
      const productData = product.item_data;
      if (!productData) {
        results.skipped++;
        syncResult.action = 'skipped';
        syncResult.success = true;
        syncResult.error = 'No item_data available';
        results.syncResults.push(syncResult);
        continue;
      }
      
      // Get category information
      const categoryIds = extractCategoryIds(product);
      syncResult.categoryIds = categoryIds;
      
      let category = 'SIDE'; // Default category
      if (categoryIds.length > 0) {
        // Try each category ID to find a mapping
        for (const categoryId of categoryIds) {
          const categoryMapping = cateringCategoriesMapping[categoryId];
          if (categoryMapping) {
            category = categoryMapping.mappedCategory;
            logger.info(`Category mapping found for ${productData.name}: ${categoryId} -> ${category}`);
            break;
          }
        }
      }
      
      syncResult.mappedCategory = category;
      
      // Get pricing from the first variation
      let price = 0;
      const variations = productData.variations || [];
      if (variations.length > 0) {
        const firstVariation = variations[0];
        const priceAmount = firstVariation.item_variation_data?.price_money?.amount || 0;
        price = priceAmount / 100; // Convert cents to dollars
      }
      
      // Check if item exists by name
      const existingItem = existingItemsByName[productData.name.toLowerCase()];
      
      if (existingItem) {
        // Update existing item
        await prisma.cateringItem.update({
          where: { id: existingItem.id },
          data: {
            name: productData.name,
            description: productData.description || '',
            price,
            category,
            isActive: true,
            // Don't update dietary info as that may be manually set
          }
        });
        
        results.updated++;
        syncResult.action = 'updated';
        syncResult.success = true;
        logger.info(`Updated catering item: ${productData.name}`);
      } else {
        // Create new item
        const createdItem = await prisma.cateringItem.create({
          data: {
            name: productData.name,
            description: productData.description || '',
            price,
            category,
            isActive: true,
            isVegetarian: false,
            isVegan: false, 
            isGlutenFree: false,
            // These flags would typically be set manually after import
          }
        });
        
        results.created++;
        syncResult.action = 'created';
        syncResult.success = true;
        syncResult.newItemId = createdItem.id;
        logger.info(`Created new catering item: ${productData.name}`);
      }
    } catch (error) {
      results.errors++;
      syncResult.success = false;
      syncResult.error = error.message;
      logger.error(`Error syncing catering item ${product.item_data?.name || 'Unknown'}:`, error);
    }
    
    results.syncResults.push(syncResult);
  }
  
  // Generate a detailed report
  const successfulItems = results.syncResults.filter(r => r.success && r.action !== 'skipped');
  const failedItems = results.syncResults.filter(r => !r.success);
  const noCategories = results.syncResults.filter(r => r.success && r.action !== 'skipped' && (!r.categoryIds || r.categoryIds.length === 0));
  
  logger.info(`=== Catering Items Sync Report ===`);
  logger.info(`Total processed: ${results.syncResults.length}`);
  logger.info(`Successfully processed: ${successfulItems.length}`);
  logger.info(`- Created: ${results.created}`);
  logger.info(`- Updated: ${results.updated}`);
  logger.info(`- Skipped: ${results.skipped}`);
  logger.info(`Failed: ${failedItems.length}`);
  
  if (noCategories.length > 0) {
    logger.warn(`${noCategories.length} items have no categories:`);
    noCategories.forEach(item => {
      logger.warn(`- ${item.name} (${item.productId})`);
    });
  }
  
  if (failedItems.length > 0) {
    logger.error(`Failed items:`);
    failedItems.forEach(item => {
      logger.error(`- ${item.name} (${item.productId}): ${item.error}`);
    });
  }
  
  // Save detailed results to a file
  fs.writeFileSync(
    path.resolve(__dirname, '../../catering-sync-results.json'), 
    JSON.stringify(results, null, 2)
  );
  
  logger.info(`Catering items sync completed. Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors}`);
  return results;
}

// Sync products from Square to database
async function syncProducts(squareProductsResponse, defaultCategory, categoryMapping, token, host) {
  const { objects: products, relatedObjects } = squareProductsResponse;
  
  logger.info(`Starting sync of ${products.length} products...`);
  
  const results = {
    success: 0,
    error: 0,
    details: [],
    syncResults: [] // Detailed results for reporting
  };
  
  for (const product of products) {
    const syncResult = {
      productId: '',
      squareId: product.id,
      name: product.item_data?.name || 'Unknown',
      categoryIds: extractCategoryIds(product),
      mappedCategoryId: null,
      success: false,
      action: 'skipped',
      error: null,
      hasImages: false,
      imageCount: 0
    };
    
    try {
      const productData = product.item_data;
      if (!productData) {
        syncResult.action = 'skipped';
        syncResult.error = 'No item_data available';
        results.syncResults.push(syncResult);
        continue;
      }
      
      // Skip catering products - they're handled separately
      if (isCateringProduct(product, relatedObjects)) {
        logger.info(`Skipping catering product: ${productData.name}`);
        syncResult.action = 'skipped';
        syncResult.success = true;
        results.syncResults.push(syncResult);
        continue;
      }
      
      // First, we'll create the product without images to ensure basic product data is saved
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
      
      // Find the appropriate category
      let categoryId = defaultCategory.id;
      syncResult.mappedCategoryId = defaultCategory.id; // Default
      
      const categoryIds = extractCategoryIds(product);
      if (categoryIds.length > 0) {
        // Try to find each category in our database
        for (const sqCategoryId of categoryIds) {
          // Try to find this category in our database
          const category = await prisma.category.findFirst({
            where: { 
              OR: [
                { squareId: sqCategoryId },
                { squareId: categoryMapping[sqCategoryId] }
              ]
            }
          });
          
          if (category) {
            categoryId = category.id;
            syncResult.mappedCategoryId = category.id;
            logger.info(`Found matching category for product ${productData.name}: ${category.name} (${category.id})`);
            break;
          } else {
            logger.warn(`No matching category found for Square category ID: ${sqCategoryId}`);
          }
        }
      } else {
        logger.warn(`No category IDs found for product: ${productData.name}`);
      }
      
      // Create the product in database with category relation, but without images initially
      const dbProduct = await prisma.product.create({
        data: {
          squareId: product.id,
          name: productData.name,
          slug,
          description: productData.description || '',
          images: [], // Start with empty images array
          price: basePrice,
          active: true,
          featured: false,
          category: {
            connect: { id: categoryId }
          }
        }
      });
      
      syncResult.productId = dbProduct.id;
      syncResult.action = 'created';
      
      logger.info(`Created base product: ${productData.name} (DB ID: ${dbProduct.id})`);
      
      // Now that we have the basic product saved, try to get and update the images
      // This way, even if image fetching fails, we still have the product data
      try {
        logger.info(`Fetching images for product: ${productData.name}`);
        const imageUrls = await getProductImages(product, relatedObjects, token, host);
        syncResult.imageCount = imageUrls.length;
        syncResult.hasImages = imageUrls.length > 0;
        
        // Update the product with images if we found any
        if (imageUrls.length > 0) {
          logger.info(`Updating product ${productData.name} with ${imageUrls.length} images`);
          await prisma.product.update({
            where: { id: dbProduct.id },
            data: { images: imageUrls }
          });
          logger.info(`Successfully updated images for product: ${productData.name}`);
        } else {
          logger.info(`No images found for product: ${productData.name}`);
        }
      } catch (imageError) {
        logger.error(`Error updating images for product ${productData.name}:`, imageError);
        // We don't fail the whole product sync if just the images fail
      }
      
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
      syncResult.success = true;
      results.details.push({
        product: productData.name,
        status: 'success',
        variants: variations.length,
        imageCount: syncResult.imageCount
      });
      
      logger.info(`Product synchronized: ${productData.name}`);
    } catch (error) {
      results.error++;
      syncResult.success = false;
      syncResult.error = error.message;
      results.details.push({
        product: product.item_data?.name || 'Unknown',
        status: 'error',
        error: error.message
      });
      
      logger.error(`Error syncing product ${product.item_data?.name || 'Unknown'}:`, error);
    }
    
    results.syncResults.push(syncResult);
  }
  
  // Generate a detailed report
  const successfulProducts = results.syncResults.filter(r => r.success && r.action !== 'skipped');
  const failedProducts = results.syncResults.filter(r => !r.success);
  const noCategories = results.syncResults.filter(r => r.success && r.action !== 'skipped' && (!r.categoryIds || r.categoryIds.length === 0));
  const unmappedCategories = results.syncResults.filter(r => r.success && r.action !== 'skipped' && r.categoryIds.length > 0 && r.mappedCategoryId === defaultCategory.id);
  const productsWithImages = results.syncResults.filter(r => r.success && r.hasImages);
  const productsWithoutImages = results.syncResults.filter(r => r.success && !r.hasImages && r.action !== 'skipped');
  
  logger.info(`=== Products Sync Report ===`);
  logger.info(`Total processed: ${results.syncResults.length}`);
  logger.info(`Successfully processed: ${successfulProducts.length}`);
  logger.info(`Products with images: ${productsWithImages.length}`);
  logger.info(`Products without images: ${productsWithoutImages.length}`);
  logger.info(`Failed: ${failedProducts.length}`);
  
  if (noCategories.length > 0) {
    logger.warn(`${noCategories.length} products have no categories and were assigned to the default category:`);
    noCategories.forEach(product => {
      logger.warn(`- ${product.name} (${product.squareId})`);
    });
  }
  
  if (unmappedCategories.length > 0) {
    logger.warn(`${unmappedCategories.length} products have categories that couldn't be mapped and were assigned to the default category:`);
    unmappedCategories.forEach(product => {
      logger.warn(`- ${product.name} (${product.squareId}), Categories: ${product.categoryIds.join(', ')}`);
    });
  }
  
  if (productsWithoutImages.length > 0 && productsWithoutImages.length <= 10) {
    logger.warn(`${productsWithoutImages.length} products have no images:`);
    productsWithoutImages.forEach(product => {
      logger.warn(`- ${product.name} (${product.squareId})`);
    });
  }
  
  if (failedProducts.length > 0) {
    logger.error(`Failed products:`);
    failedProducts.forEach(product => {
      logger.error(`- ${product.name} (${product.squareId}): ${product.error}`);
    });
  }
  
  // Save results to a file
  fs.writeFileSync(
    path.resolve(__dirname, '../../sync-production-results.json'), 
    JSON.stringify(results, null, 2)
  );
  
  // Also save detailed sync results
  fs.writeFileSync(
    path.resolve(__dirname, '../../product-sync-details.json'), 
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: results.syncResults.length,
        successful: successfulProducts.length,
        withImages: productsWithImages.length,
        withoutImages: productsWithoutImages.length,
        failed: failedProducts.length,
        noCategories: noCategories.length,
        unmappedCategories: unmappedCategories.length
      },
      results: results.syncResults
    }, null, 2)
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
    
    // Create a sync report object to track the entire process
    const syncReport = {
      startTime: new Date().toISOString(),
      endTime: null,
      success: false,
      steps: {},
      categoryMappings: {},
      summary: {},
      imageAnalysis: {}
    };
    
    try {
      // Step 1: Remove all existing products
      logger.info('Step 1: Removing existing products');
      await removeAllProducts();
      syncReport.steps.removeProducts = { completed: true };
      
      // Step 2: Ensure default category exists
      logger.info('Step 2: Ensuring default category exists');
      const defaultCategory = await ensureDefaultCategory();
      syncReport.steps.defaultCategory = { 
        completed: true,
        categoryId: defaultCategory.id
      };
      
      // Step 3: Get categories from Square
      logger.info('Step 3: Getting categories from Square');
      const squareCategories = await getSquareCategories(productionToken, host);
      syncReport.steps.getCategories = { 
        completed: true,
        count: squareCategories.length
      };
      
      // Save raw category data for debugging
      fs.writeFileSync(
        path.resolve(__dirname, '../../square-categories-raw.json'),
        JSON.stringify(squareCategories, null, 2)
      );
      
      // Step 4: Process categories by type (regular vs catering)
      logger.info('Step 4: Processing categories by type');
      const processedCategories = await processSquareCategories(squareCategories);
      syncReport.steps.processCategories = { 
        completed: true,
        regularCount: processedCategories.regular.length,
        cateringCount: processedCategories.catering.length
      };
      
      // Step 5: Sync regular product categories
      logger.info('Step 5: Syncing regular product categories');
      const categoryMapping = await syncProductCategories(processedCategories.regular);
      syncReport.steps.syncProductCategories = { 
        completed: true,
        categoryMappingCount: Object.keys(categoryMapping).length
      };
      syncReport.categoryMappings.regular = categoryMapping;
      
      // Step 6: Sync catering categories
      logger.info('Step 6: Syncing catering categories');
      const cateringCategoriesMapping = await syncCateringCategories(processedCategories.catering);
      syncReport.steps.syncCateringCategories = { 
        completed: true,
        processedCount: cateringCategoriesMapping.processed || 0
      };
      
      // Step 7: Get products from Square
      logger.info('Step 7: Getting products from Square');
      const squareProducts = await getSquareProducts(productionToken, host);
      syncReport.steps.getProducts = { 
        completed: true,
        productCount: squareProducts.objects.length,
        relatedObjectsCount: squareProducts.relatedObjects.length
      };
      
      // Step 8: Sync regular products
      logger.info('Step 8: Syncing regular products');
      const productSyncResults = await syncProducts(
        squareProducts, 
        defaultCategory, 
        categoryMapping, 
        productionToken, 
        host
      );
      syncReport.steps.syncProducts = { 
        completed: true,
        successCount: productSyncResults.success,
        errorCount: productSyncResults.error
      };
      
      // Step 9: Sync catering items
      logger.info('Step 9: Syncing catering items');
      const cateringItemsResults = await syncCateringItems(squareProducts, cateringCategoriesMapping);
      syncReport.steps.syncCateringItems = { 
        completed: true,
        createdCount: cateringItemsResults.created,
        updatedCount: cateringItemsResults.updated,
        skippedCount: cateringItemsResults.skipped,
        errorCount: cateringItemsResults.errors
      };
      
      // Create a comprehensive category analysis for debugging
      logger.info('Step 10: Creating category analysis');
      const categoryAnalysis = await analyzeCategoryMapping(
        squareCategories, 
        squareProducts, 
        categoryMapping, 
        cateringCategoriesMapping
      );
      
      syncReport.categoryAnalysis = categoryAnalysis;
      syncReport.steps.categoryAnalysis = { completed: true };
      
      // Step 11: Verify image sync
      logger.info('Step 11: Verifying image sync');
      const imageAnalysis = await analyzeImageSync(squareProducts, productionToken, host);
      syncReport.imageAnalysis = imageAnalysis;
      syncReport.steps.imageAnalysis = { completed: true };
      
      if (imageAnalysis.productsWithMissingImages.length > 0) {
        logger.warn(`⚠️ Warning: ${imageAnalysis.productsWithMissingImages.length} products have images in Square but no images in the database.`);
        logger.warn('You may need to run the sync again or investigate these specific products:');
        for (const product of imageAnalysis.productsWithMissingImages.slice(0, 10)) {
          logger.warn(`  - ${product.name} (Square ID: ${product.squareId})`);
        }
        if (imageAnalysis.productsWithMissingImages.length > 10) {
          logger.warn(`  ... and ${imageAnalysis.productsWithMissingImages.length - 10} more`);
        }
      }
      
      // Final step: Save the complete catalog for backup
      logger.info('Saving complete Square catalog for reference');
      fs.writeFileSync(
        path.resolve(__dirname, '../../production-catalog-full.json'), 
        JSON.stringify({
          categories: squareCategories,
          products: squareProducts,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
      
      syncReport.success = true;
      logger.info('Complete sync from production completed successfully!');
    } catch (error) {
      syncReport.error = {
        message: error.message,
        stack: error.stack
      };
      logger.error('Error in sync process:', error);
    } finally {
      // Save the complete sync report
      syncReport.endTime = new Date().toISOString();
      fs.writeFileSync(
        path.resolve(__dirname, '../../sync-complete-report.json'), 
        JSON.stringify(syncReport, null, 2)
      );
    }
  } catch (error) {
    logger.error('Error in sync process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Analyze category mapping to identify problems
async function analyzeCategoryMapping(
  squareCategories,
  squareProductsResponse,
  regularCategoryMapping,
  cateringCategoriesMapping
) {
  try {
    const { objects: products, relatedObjects } = squareProductsResponse;
    
    // Collect all unique category IDs from products
    const productCategoryIds = new Set();
    for (const product of products) {
      const categoryIds = extractCategoryIds(product);
      for (const id of categoryIds) {
        productCategoryIds.add(id);
      }
    }
    
    // Collect all category IDs from Square categories
    const squareCategoryIds = new Set();
    const categoryNames = {};
    for (const category of squareCategories) {
      if (category.id) {
        squareCategoryIds.add(category.id);
        if (category.category_data?.name) {
          categoryNames[category.id] = category.category_data.name;
        }
      }
    }
    
    // Compare the two sets
    const unmappedCategoryIds = [...productCategoryIds].filter(id => !squareCategoryIds.has(id));
    
    // Category IDs that have no regular mapping
    const unmappedRegularCategoryIds = [...productCategoryIds].filter(id => 
      !Object.prototype.hasOwnProperty.call(regularCategoryMapping, id) && 
      !isCateringCategoryName(categoryNames[id] || '')
    );
    
    // Category IDs that have no catering mapping (but should)
    const unmappedCateringCategoryIds = [...productCategoryIds].filter(id => 
      isCateringCategoryName(categoryNames[id] || '') && 
      !Object.prototype.hasOwnProperty.call(cateringCategoriesMapping, id)
    );
    
    return {
      uniqueCategoryIdsInProducts: [...productCategoryIds],
      uniqueCategoryIdsInSquare: [...squareCategoryIds],
      unmappedCategoryIds,
      unmappedRegularCategoryIds,
      unmappedCateringCategoryIds,
      categoryNames
    };
  } catch (error) {
    logger.error('Error analyzing category mapping:', error);
    return {
      error: error.message
    };
  }
}

// Analyze image sync to identify problems
async function analyzeImageSync(squareProductsResponse, token, host) {
  try {
    const { objects: products } = squareProductsResponse;
    logger.info('Analyzing image sync status...');
    
    // Get all products from the database
    const dbProducts = await prisma.product.findMany();
    logger.info(`Found ${dbProducts.length} products in the database`);
    
    // Create lookup maps
    const dbProductsBySquareId = dbProducts.reduce((acc, product) => {
      acc[product.squareId] = product;
      return acc;
    }, {});
    
    // Analyze image status
    const productsWithImagesInSquare = [];
    const productsWithImagesInDB = [];
    const productsWithMissingImages = [];
    
    for (const squareProduct of products) {
      // Skip products that don't have item_data (rare case)
      if (!squareProduct.item_data) continue;
      
      const squareId = squareProduct.id;
      const name = squareProduct.item_data.name;
      const hasSquareImages = squareProduct.item_data.image_ids && squareProduct.item_data.image_ids.length > 0;
      
      if (hasSquareImages) {
        productsWithImagesInSquare.push({ 
          squareId, 
          name, 
          imageCount: squareProduct.item_data.image_ids.length 
        });
        
        // Check if this product exists in our database
        const dbProduct = dbProductsBySquareId[squareId];
        if (dbProduct) {
          const hasDbImages = dbProduct.images && dbProduct.images.length > 0;
          
          if (hasDbImages) {
            productsWithImagesInDB.push({ 
              squareId, 
              name, 
              dbId: dbProduct.id,
              squareImageCount: squareProduct.item_data.image_ids.length,
              dbImageCount: dbProduct.images.length
            });
          } else {
            // Has images in Square but not in DB
            productsWithMissingImages.push({ 
              squareId, 
              name, 
              dbId: dbProduct.id,
              squareImageCount: squareProduct.item_data.image_ids.length
            });
          }
        }
      }
    }
    
    logger.info(`Products with images in Square: ${productsWithImagesInSquare.length}`);
    logger.info(`Products with images in DB: ${productsWithImagesInDB.length}`);
    logger.info(`Products missing images in DB: ${productsWithMissingImages.length}`);
    
    return {
      productsWithImagesInSquare,
      productsWithImagesInDB,
      productsWithMissingImages,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error analyzing image sync:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

main(); 