'use server';

import { prisma } from '@/lib/prisma';
import { createSquareProduct } from '@/lib/square/catalog';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/slug';
import { redirect } from 'next/navigation';
import { syncSquareProducts } from '@/lib/square/sync';

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

/**
 * Updates a product's category
 */
export async function updateProductCategory(formData: FormData) {
  const productId = formData.get('productId') as string;
  const categoryId = formData.get('categoryId') as string;

  if (!productId || !categoryId) {
    return { success: false, message: 'Missing required fields' };
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { categoryId }
    });

    revalidatePath('/admin/products');
    revalidatePath('/products');
    revalidatePath('/products/category/[slug]');

    return { success: true, message: 'Category updated successfully' };
  } catch (error) {
    console.error('Error updating product category:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to update category'
    };
  }
}

/**
 * Manually triggers a product sync from Square
 * Useful for debugging and fixing issues
 */
export async function manualSyncFromSquare() {
  try {
    logger.info('Manual sync from Square initiated');
    
    // Log existing categories BEFORE sync for debugging
    const beforeCategories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true }
    });
    logger.info(`Categories BEFORE sync (${beforeCategories.length}): ${JSON.stringify(beforeCategories.map(c => `${c.name} (${c.slug})` ))}`);
    
    const result = await syncSquareProducts();
    
    // Count categories in database after sync
    const categoriesCount = await prisma.category.count();
    
    // Get detailed info about catering categories
    const cateringCategories = await prisma.category.findMany({
      where: {
        name: {
          contains: 'CATERING',
          mode: 'insensitive'
        },
      },
      select: { id: true, name: true, slug: true }
    });
    
    const cateringCategoriesCount = cateringCategories.length;
    logger.info(`Found ${cateringCategoriesCount} catering categories after sync: ${JSON.stringify(cateringCategories.map(c => `${c.name} (${c.slug})` ))}`);
    
    // Log all categories AFTER sync for comparison
    const afterCategories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true }
    });
    logger.info(`Categories AFTER sync (${afterCategories.length}): ${JSON.stringify(afterCategories.map(c => `${c.name} (${c.slug})` ))}`);
    
    // Find newly created categories
    const newCategoryIds = afterCategories
      .filter(cat => !beforeCategories.some(before => before.id === cat.id))
      .map(cat => cat.id);
    
    const newCategories = afterCategories.filter(cat => newCategoryIds.includes(cat.id));
    logger.info(`Newly created categories (${newCategories.length}): ${JSON.stringify(newCategories.map(c => `${c.name} (${c.slug})` ))}`);
    
    logger.info('Manual sync complete:', result);
    
    revalidatePath('/admin/products');
    revalidatePath('/products');
    revalidatePath('/products/category/[slug]', 'page');
    
    return {
      success: result.success,
      message: result.message || (result.success ? 'Sync completed successfully' : 'Sync failed'),
      syncedProducts: result.syncedProducts,
      syncedCategories: categoriesCount,
      newCategories: newCategories.length,
      cateringCategories: cateringCategoriesCount,
      cateringCategoryNames: cateringCategories.map(c => `${c.name} (${c.slug})`),
      errors: result.errors || [],
    };
  } catch (error) {
    logger.error('Error in manual sync:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred during sync',
      syncedProducts: 0,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}
