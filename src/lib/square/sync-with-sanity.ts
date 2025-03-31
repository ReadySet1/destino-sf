// src/lib/square/sync-with-sanity.ts

import { client } from '@/sanity/lib/client'; // Adjust path if needed
import { fetchCatalogItems } from './catalog'; // Adjust path if needed

// --- Interfaces reflecting expected data from Square ---
// Note: These are simplified. Using types from the 'square' SDK might be more robust if available/desired.
interface CatalogCategoryData {
  name: string;
  description?: string;
}

interface CatalogItemVariationData {
  name?: string;
  priceMoney?: {
    amount: bigint; // Use bigint for Square money amounts
    currency?: string; // Optional: Store currency if needed
  };
  // Add other variation fields if needed (sku, etc.)
}

interface CatalogItemVariation {
  id: string;
  type: 'ITEM_VARIATION'; // Explicitly type variations
  itemVariationData?: CatalogItemVariationData;
  // Add version, updatedAt etc. if needed
}

interface CatalogItemData {
  name: string;
  description?: string;
  categoryId?: string; // ID of the Square category
  variations?: CatalogItemVariation[]; // Use specific variation type
  // Add other item fields if needed (e.g., image IDs, tax IDs)
}

interface _CatalogObject {
  id: string;
  type: 'CATEGORY' | 'ITEM'; // Only process these types
  categoryData?: CatalogCategoryData;
  itemData?: CatalogItemData;
  // Add version, updatedAt etc. if needed for sync logic
}
// --- End Interfaces ---

/**
 * Syncs Square catalog categories and items (with variations) to Sanity CMS.
 * Assumes fetchCatalogItems fetches BOTH 'ITEM' and 'CATEGORY' types.
 * Assumes Sanity schemas 'productCategory' (with 'squareCategoryId') and 'product' (with 'squareId', 'variants') exist.
 */
export async function syncSquareToSanity() {
  console.log('Starting Square catalog sync to Sanity...');
  try {
    // 1. Fetch all relevant catalog objects from Square
    // IMPORTANT: Assumes fetchCatalogItems now fetches ['ITEM', 'CATEGORY']
    const squareCatalogObjects = await fetchCatalogItems(); // Use the updated fetchCatalogItems
    console.log(`Workspaceed ${squareCatalogObjects.length} objects from Square.`);

    // 2. Process Categories First - Build a map of Square Category ID -> Sanity Document ID
    const categoryMap = new Map<string, string>(); // <squareCategoryId, sanityCategoryId>

    console.log('Processing categories...');
    for (const squareObject of squareCatalogObjects) {
      if (squareObject.type === 'CATEGORY' && squareObject.categoryData) {
        const { id: squareId, categoryData } = squareObject;

        // Check if category exists in Sanity using the Square ID
        // REQUIRES 'squareCategoryId' field in Sanity 'productCategory' schema
        const existingSanityCategory = await client.fetch(
          `*[_type == "productCategory" && squareCategoryId == $squareId][0]{_id, name, description}`,
          { squareId: squareId }
        );

        if (existingSanityCategory) {
          // Category exists - Update if necessary
          console.log(`Updating existing category: ${categoryData.name} (Sanity ID: ${existingSanityCategory._id})`);
          await client
            .patch(existingSanityCategory._id)
            .set({
              name: categoryData.name, // Update name in case it changed in Square
              description: categoryData.description || existingSanityCategory.description, // Update description
              // Consider updating slug if name changed (requires more complex logic or Sanity features)
            })
            .commit({ autoGenerateArrayKeys: true });

          categoryMap.set(squareId, existingSanityCategory._id);
        } else {
          // Category doesn't exist - Create it
          console.log(`Creating new category: ${categoryData.name}`);
          const newCategory = await client.create({
            _type: 'productCategory',
            name: categoryData.name,
            squareCategoryId: squareId, // <<< Store the Square ID in Sanity
            slug: {
              _type: 'slug',
              current: categoryData.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '') || `category-${squareId}` // Basic slug generation + fallback
            },
            description: categoryData.description || '',
          });
          console.log(`Created new category with Sanity ID: ${newCategory._id}`);
          categoryMap.set(squareId, newCategory._id);
        }
      }
    }
    console.log(`Processed categories. Mapped ${categoryMap.size} categories.`);

    // 3. Ensure Default/Fallback Category Exists in Sanity
    let defaultSanityCategoryId: string;
    const defaultCategoryName = "Other";
    const defaultCategorySlug = "other";
    const existingDefaultCategory = await client.fetch(
      `*[_type == "productCategory" && slug.current == $slug][0]{_id}`,
      { slug: defaultCategorySlug }
    );

    if (existingDefaultCategory) {
      defaultSanityCategoryId = existingDefaultCategory._id;
      console.log(`Found default category: ${defaultCategoryName} (Sanity ID: ${defaultSanityCategoryId})`);
    } else {
      console.log(`Creating default category: ${defaultCategoryName}`);
      const newDefaultCategory = await client.create({
        _type: 'productCategory',
        name: defaultCategoryName,
        slug: { _type: 'slug', current: defaultCategorySlug },
        description: 'Uncategorized products',
        // No squareCategoryId needed for the manually created default
      });
      defaultSanityCategoryId = newDefaultCategory._id;
      console.log(`Created default category with Sanity ID: ${defaultSanityCategoryId}`);
    }

    // 4. Process Product Items
    console.log('Processing product items...');
    for (const squareObject of squareCatalogObjects) {
      if (squareObject.type === 'ITEM' && squareObject.itemData) {
        const { id: squareId, itemData } = squareObject;

        // Check if product exists in Sanity using Square ID
        // REQUIRES 'squareId' field in Sanity 'product' schema
        const existingSanityProduct = await client.fetch(
          `*[_type == "product" && squareId == $squareId][0]{_id, description, variants}`,
          { squareId: squareId }
        );

        // Determine the Sanity Category Reference
        let sanityCategoryRef = { _type: 'reference', _ref: defaultSanityCategoryId };
        if (itemData.categoryId && categoryMap.has(itemData.categoryId)) {
          sanityCategoryRef._ref = categoryMap.get(itemData.categoryId)!; // Use mapped category if available
        }

        // Prepare Variants data for Sanity & determine Base Price
        interface SanityVariant {
          _type: 'productVariant';
          _key: string;
          name: string;
          price: number;
          squareId: string;
        }
        const sanityVariants: SanityVariant[] = []; // Define type more strictly if needed based on your Sanity 'productVariant' type
        let basePrice = 0;

        if (itemData.variations && itemData.variations.length > 0) {
          // Set base price from the first variation - review if this logic suits your needs
          const firstVariation = itemData.variations[0];
          if (firstVariation.itemVariationData?.priceMoney?.amount) {
            basePrice = Number(firstVariation.itemVariationData.priceMoney.amount) / 100; // Convert cents to dollars/euros etc.
          }

          // Process all variations
          for (const variation of itemData.variations) {
            if (variation.type === 'ITEM_VARIATION' && variation.itemVariationData) {
              const variantPrice = variation.itemVariationData.priceMoney?.amount
                ? Number(variation.itemVariationData.priceMoney.amount) / 100
                : basePrice; // Fallback to basePrice

              sanityVariants.push({
                _key: variation.id, // Use Square variant ID as the Sanity array key for stability
                _type: 'productVariant', // <<< ENSURE this matches your Sanity variant type name
                name: variation.itemVariationData.name || 'Standard', // Default name
                price: variantPrice,
                squareId: variation.id, // Store Square variant ID if needed
              });
            }
          }
        } else {
             console.warn(`Product item ${itemData.name} (Square ID: ${squareId}) has no variations. Base price set to 0.`);
        }


        if (existingSanityProduct) {
          // Product exists - Update it
           console.log(`Updating existing product: ${itemData.name} (Sanity ID: ${existingSanityProduct._id})`);
           await client
            .patch(existingSanityProduct._id)
            .set({
              name: itemData.name,
              description: itemData.description || existingSanityProduct.description || '',
              price: basePrice, // Update base price
              category: sanityCategoryRef, // Update category reference
              variants: sanityVariants, // Overwrite variants array
            })
            .commit({ autoGenerateArrayKeys: true });

        } else {
          // Product doesn't exist - Create it
           console.log(`Creating new product: ${itemData.name}`);
           await client.create({
            _type: 'product',
            name: itemData.name,
            squareId: squareId, // Store Square ID
            slug: {
              _type: 'slug',
              current: itemData.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '') || `product-${squareId}` // Basic slug + fallback
            },
            description: itemData.description || '',
            price: basePrice,
            category: sanityCategoryRef,
            variants: sanityVariants,
            images: [], // Default to empty images array
          });
        }
      }
    }
    console.log('Finished processing product items.');

    console.log('Successfully synced Square catalog to Sanity');
    return { success: true, message: 'Sync completed successfully.' };

  } catch (error) {
    console.error('Error during Square catalog sync to Sanity:', error);
    if (error instanceof Error) {
         return { success: false, message: `Sync failed: ${error.message}` };
    } else {
         return { success: false, message: 'Sync failed due to an unknown error.'};
    }
    // Or re-throw if the caller should handle it: throw error;
  }
}