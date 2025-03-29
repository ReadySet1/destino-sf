import { client } from '@/sanity/lib/client';
import { fetchCatalogItems } from './catalog';

// This function syncs Square catalog items to Sanity CMS
export async function syncSquareToSanity() {
  try {
    // Fetch all items from Square
    const squareItems = await fetchCatalogItems();
    
    // Process categories first
    const categoryMap = new Map();
    
    for (const item of squareItems) {
      if (item.type === 'CATEGORY') {
        // Check if category exists in Sanity
        const existingSanityCategory = await client.fetch(
          `*[_type == "productCategory" && name == $name][0]`,
          { name: item.categoryData.name }
        );
        
        if (existingSanityCategory) {
          // Update it with any new information
          await client
            .patch(existingSanityCategory._id)
            .set({
              description: item.categoryData.description || existingSanityCategory.description,
            })
            .commit();
            
          categoryMap.set(item.id, existingSanityCategory._id);
        } else {
          // Create new category
          const newCategory = await client.create({
            _type: 'productCategory',
            name: item.categoryData.name,
            slug: {
              current: item.categoryData.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '')
            },
            description: item.categoryData.description,
          });
          
          categoryMap.set(item.id, newCategory._id);
        }
      }
    }
    
    // Create default category if needed
    let defaultCategoryId;
    const defaultCategory = await client.fetch(`*[_type == "productCategory" && name == "Other"][0]`);
    
    if (defaultCategory) {
      defaultCategoryId = defaultCategory._id;
    } else {
      const newDefaultCategory = await client.create({
        _type: 'productCategory',
        name: 'Other',
        slug: { current: 'other' },
        description: 'Uncategorized products',
      });
      
      defaultCategoryId = newDefaultCategory._id;
    }
    
    // Now process product items
    for (const item of squareItems) {
      if (item.type === 'ITEM' && item.itemData) {
        // Check if the product already exists in Sanity
        const existingSanityProduct = await client.fetch(
          `*[_type == "product" && squareId == $squareId][0]`,
          { squareId: item.id }
        );
        
        // Determine the category
        let categoryId = defaultCategoryId;
        if (item.itemData.categoryId && categoryMap.has(item.itemData.categoryId)) {
          categoryId = categoryMap.get(item.itemData.categoryId);
        }
        
        // Prepare variants data
        const variants = [];
        let basePrice = 0;
        
        if (item.itemData.variations && item.itemData.variations.length > 0) {
          // Get base price from first variation
          const firstVariation = item.itemData.variations[0];
          if (firstVariation.itemVariationData?.priceMoney?.amount) {
            basePrice = parseInt(firstVariation.itemVariationData.priceMoney.amount) / 100;
          }
          
          // Process all variations
          for (const variation of item.itemData.variations) {
            if (variation.type === 'ITEM_VARIATION' && variation.itemVariationData) {
              const variantPrice = variation.itemVariationData.priceMoney?.amount
                ? parseInt(variation.itemVariationData.priceMoney.amount) / 100
                : basePrice;
                
              variants.push({
                name: variation.itemVariationData.name || 'Default',
                price: variantPrice,
                squareVariantId: variation.id,
              });
            }
          }
        }
        
        if (existingSanityProduct) {
          // Update existing product
          await client
            .patch(existingSanityProduct._id)
            .set({
              name: item.itemData.name,
              description: item.itemData.description || existingSanityProduct.description,
              price: basePrice,
              category: {
                _type: 'reference',
                _ref: categoryId,
              },
              variants: variants,
            })
            .commit();
        } else {
          // Create new product
          await client.create({
            _type: 'product',
            name: item.itemData.name,
            slug: {
              current: item.itemData.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '')
            },
            squareId: item.id,
            description: item.itemData.description || '',
            price: basePrice,
            category: {
              _type: 'reference',
              _ref: categoryId,
            },
            variants: variants,
            images: [], // Start with no images, these will be added manually
          });
        }
      }
    }
    
    console.log('Successfully synced Square catalog to Sanity');
    return { success: true };
  } catch (error) {
    console.error('Error syncing Square catalog to Sanity:', error);
    throw error;
  }
}
