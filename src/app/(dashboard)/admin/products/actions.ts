'use server';

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/lib/slug';
import { redirect } from 'next/navigation';
import { syncSquareProducts } from '@/lib/square/sync';
import { enqueueSquareWrite, isWritebackEnabled } from '@/lib/square/write-queue';

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
      error: `Slug "${potentialSlug}" already exists. Please choose a slightly different product name.`,
    };
  }

  try {
    // Step 1: Reserve a placeholder squareId for the local row. When writeback is
    // enabled, the write-queue worker replaces this with the real Square ID on
    // first successful CREATE; until then the product exists only locally.
    if (!squareId) {
      squareId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // Step 2: Create the product in the database
    const created = await prisma.product.create({
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
        syncStatus: isWritebackEnabled() ? 'PENDING' : 'SYNCED',
        syncSource: 'LOCAL',
      },
      select: { id: true },
    });

    // Step 3: Queue Square create (only if writeback enabled + no external squareId supplied)
    if (isWritebackEnabled() && squareId.startsWith('pending-')) {
      const category = categoryId
        ? await prisma.category.findUnique({
            where: { id: categoryId },
            select: { squareId: true },
          })
        : null;
      await enqueueSquareWrite({
        productId: created.id,
        operation: 'CREATE',
        payload: {
          name,
          description,
          priceDollars: price,
          squareCategoryId: category?.squareId ?? null,
          imageIds: [],
        },
      });
    }

    logger.info(
      `Product "${name}" created locally with slug "${potentialSlug}" (writeback=${isWritebackEnabled()})`
    );

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
      data: { categoryId },
    });

    revalidatePath('/admin/products');
    revalidatePath('/products');
    revalidatePath('/products/category/[slug]');

    return { success: true, message: 'Category updated successfully' };
  } catch (error) {
    console.error('Error updating product category:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update category',
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
      select: { id: true, name: true, slug: true },
    });
    logger.info(
      `Categories BEFORE sync (${beforeCategories.length}): ${JSON.stringify(beforeCategories.map(c => `${c.name} (${c.slug})`))}`
    );

    const result = await syncSquareProducts();

    // Count categories in database after sync
    const categoriesCount = await prisma.category.count();

    // Get detailed info about catering categories
    const cateringCategories = await prisma.category.findMany({
      where: {
        name: {
          contains: 'CATERING',
          mode: 'insensitive',
        },
      },
      select: { id: true, name: true, slug: true },
    });

    const cateringCategoriesCount = cateringCategories.length;
    logger.info(
      `Found ${cateringCategoriesCount} catering categories after sync: ${JSON.stringify(cateringCategories.map(c => `${c.name} (${c.slug})`))}`
    );

    // Log all categories AFTER sync for comparison
    const afterCategories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
    });
    logger.info(
      `Categories AFTER sync (${afterCategories.length}): ${JSON.stringify(afterCategories.map(c => `${c.name} (${c.slug})`))}`
    );

    // Find newly created categories
    const newCategoryIds = afterCategories
      .filter(cat => !beforeCategories.some(before => before.id === cat.id))
      .map(cat => cat.id);

    const newCategories = afterCategories.filter(cat => newCategoryIds.includes(cat.id));
    logger.info(
      `Newly created categories (${newCategories.length}): ${JSON.stringify(newCategories.map(c => `${c.name} (${c.slug})`))}`
    );

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
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
