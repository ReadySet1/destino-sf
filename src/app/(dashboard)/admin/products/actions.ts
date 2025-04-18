'use server';

import { prisma } from '@/lib/prisma';
// import { createSanityProduct } from '@/lib/sanity/createProduct'; // Removed Sanity import
import { createSquareProduct } from '@/lib/square/catalog';
import { logger } from '@/utils/logger';
// import { client } from '@/sanity/lib/client'; // Removed Sanity client import
import { revalidatePath } from 'next/cache';

export async function createProductAction(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const categoryId = formData.get('categoryId') as string;
  const images = (formData.get('images') as string).split(',').map(img => img.trim());
  const featured = formData.has('featured');
  const active = formData.has('active');
  let squareId = formData.get('squareId') as string;

  // Simple validation
  if (!name || !price || isNaN(price)) {
    throw new Error('Invalid product data');
  }

  try {
    // Step 1: Create the product in Square (or get temporary ID in development)
    if (!squareId) {
      squareId = await createSquareProduct({
        name,
        description,
        price,
        categoryId,
        variations: [], // No variations for now, could be added later
      });
    }

    // Step 2: Create the product in the database
    await prisma.product.create({
      data: {
        name,
        description,
        price,
        categoryId,
        images,
        featured,
        active,
        squareId,
      },
    });

    // Step 3: Try to create the product in Sanity - REMOVED
    /*
    try {
      await createSanityProduct({
        name,
        description,
        price,
        categoryId,
        squareId,
        images,
        featured,
      });
      logger.info(`Product "${name}" created successfully in all systems`);
    } catch (sanityError) {
      // Log the error but continue - the product is already in our database
      logger.error('Error creating product in Sanity (continuing anyway):', sanityError);
      logger.info(`Product "${name}" created in database and Square, but not in Sanity`);
    }
    */
    logger.info(`Product "${name}" created successfully in database and Square`);

    // Revalidate the products path after creation
    revalidatePath('/admin/products');
    revalidatePath('/products'); // Revalidate public products path as well

    // Return success instead of redirecting
    return { success: true };
  } catch (error) {
    logger.error('Error creating product:', error);
    throw new Error('Failed to create product. Please try again.');
  }
}

export async function updateProductCategory(formData: FormData) {
  const productId = formData.get('productId') as string;
  const categoryId = formData.get('categoryId') as string;

  if (!productId || !categoryId) {
    throw new Error('Missing required fields');
  }

  try {
    // Update in PostgreSQL
    const product = await prisma.product.update({
      where: { id: productId },
      data: { categoryId },
      include: { category: true }
    });

    // Update in Sanity - REMOVED
    /*
    const sanityProduct = await client.fetch(
      `*[_type == "product" && squareId == $squareId][0]`,
      { squareId: product.squareId }
    );

    if (sanityProduct?._id) {
      await client.patch(sanityProduct._id)
        .set({
          category: {
            _type: 'reference',
            _ref: product.category.id
          }
        })
        .commit();
    }
    */
    logger.info(`Updated category for product "${product.name}" (ID: ${productId}) to "${product.category.name}" in database.`);

    revalidatePath('/admin/products');
  } catch (error) {
    console.error('Error updating product category:', error);
    throw error;
  }
}
