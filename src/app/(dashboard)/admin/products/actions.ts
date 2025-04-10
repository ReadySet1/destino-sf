'use server';

import { prisma } from '@/lib/prisma';
import { createSanityProduct } from '@/lib/sanity/createProduct';
import { createSquareProduct } from '@/lib/square/catalog';
import { logger } from '@/utils/logger';

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

    // Step 3: Try to create the product in Sanity, but don't fail if it doesn't work
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

    // Return success instead of redirecting
    return { success: true };
  } catch (error) {
    logger.error('Error creating product:', error);
    throw new Error('Failed to create product. Please try again.');
  }
}
