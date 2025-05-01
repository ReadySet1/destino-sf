'use server';

import { prisma } from '@/lib/prisma';
import { createSquareProduct } from '@/lib/square/catalog';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/slug';

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
    return { success: false, error: 'Invalid product data: Name and valid Price are required.' };
  }

  // Slug Generation and Uniqueness Check
  const potentialSlug = slugify(name);
  if (!potentialSlug) {
    return { success: false, error: 'Invalid product name: Cannot generate a valid URL slug.' };
  }

  const existingProductWithSlug = await prisma.product.findUnique({
    where: { slug: potentialSlug },
    select: { id: true },
  });

  if (existingProductWithSlug) {
    return {
      success: false,
      error: `Slug "${potentialSlug}" already exists. Please choose a slightly different product name.`
    };
  }

  try {
    // Step 1: Create the product in Square (or get temporary ID in development)
    if (!squareId) {
      try {
        squareId = await createSquareProduct({
          name,
          description,
          price,
          categoryId,
          variations: [],
        });
      } catch (squareError) {
        logger.error('Failed to create product in Square:', squareError);
        return { success: false, error: 'Failed to create product in payment system. Please try again.' };
      }
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
        slug: potentialSlug,
      },
    });

    logger.info(`Product "${name}" created successfully in database and Square with slug "${potentialSlug}"`);

    // Revalidate the products path after creation
    revalidatePath('/admin/products');
    revalidatePath('/products'); // Revalidate public products path
    if (categoryId) {
      revalidatePath(`/products/category/${categoryId}`);
    }

    // Return success instead of redirecting
    return { success: true, message: `Product "${name}" created successfully.` };
  } catch (error) {
    logger.error('Error creating product:', error);
    return { success: false, error: 'Database Error: Failed to create product.' };
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
