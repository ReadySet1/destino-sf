'use server';

import { prisma } from '@/lib/prisma';
import { JsonValue } from '@prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';

interface CategoryCount {
  products: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  order: number;
  _count: CategoryCount;
  metadata?: JsonValue;
  isActive?: boolean;
  parentId?: string | null;
  slug: string | null;
  imageUrl?: string | null;
}

export async function getCategories(): Promise<Category[]> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        order: 'asc',
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// Define and export a return type for the action
export interface ActionResult {
  success: boolean;
  message?: string;
  redirectPath?: string;
}

// Update signature for useActionState
export async function createCategoryAction(
  prevState: ActionResult, // Add prevState argument
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get('name');
  const description = formData.get('description');
  const orderRaw = formData.get('order');
  const isActiveRaw = formData.get('isActive');
  const image = formData.get('image') as File | null;

  // Validate inputs with type guards
  if (typeof name !== 'string' || name.trim() === '') {
    // Return error object instead of calling toast
    return { success: false, message: 'Invalid category name' };
  }

  const order = typeof orderRaw === 'string' ? parseInt(orderRaw, 10) || 0 : 0;
  const descriptionStr = typeof description === 'string' ? description : '';
  const isActive = isActiveRaw === 'true';

  try {
    // Handle image upload if present
    let imageUrl = null;
    if (image && image.size > 0) {
      // Here you would typically upload the image to your storage service
      // For now, we'll just store the filename
      imageUrl = image.name;
    }

    // Generate a clean slug
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');

    // Create category in PostgreSQL
    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        description: descriptionStr,
        order,
        isActive,
        slug,
        imageUrl,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    // Revalidate the categories page cache
    revalidatePath('/admin/categories');

    // Return success object with redirect path instead of calling toast and redirect
    return { 
      success: true, 
      message: `Category "${newCategory.name}" created successfully`, 
      redirectPath: '/admin/categories' 
    };
  } catch (error) {
    // Remove redirect handling from here
    // if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
    //   // This should not happen anymore as we removed redirect
    //   return { success: false, message: 'Redirect error occurred unexpectedly.' }; 
    // }

    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while creating category';
    
    console.error('Failed to create category:', error);
    // Return error object instead of calling toast
    return { success: false, message: `Failed to create category: ${errorMessage}` };
  }
}

// Update signature for useActionState: accepts previous state (unused) and payload (FormData)
export async function deleteCategoryAction(
  prevState: ActionResult, // First arg: previous state (required by useActionState)
  formData: FormData // Second arg: form payload
): Promise<ActionResult> {
  const rawId = formData.get('id');

  // Validate ID input
  if (typeof rawId !== 'string' || !rawId) {
    // Return error object
    return { success: false, message: 'No category ID provided' };
  }

  try {
    // Find the category with product count
    const category = await prisma.category.findUnique({
      where: { id: rawId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    // Check if category exists
    if (!category) {
      // Return error object
      return { success: false, message: 'Category not found.' };
    }

    // Prevent deletion if category has products
    if (category._count.products > 0) {
      // Return error object
      return { 
        success: false, 
        message: `Cannot delete category '${category.name}' because it has ${category._count.products} products.` 
      };
    }

    // Delete from PostgreSQL
    await prisma.category.delete({
      where: { id: rawId },
    });

    // Revalidate the categories page cache
    revalidatePath('/admin/categories');

    // Return success object with redirect path
    return { 
      success: true, 
      message: `Category "${category.name}" deleted successfully`,
      redirectPath: '/admin/categories' 
    };
  } catch (error) {
    // Remove redirect handling
    // if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
    //   // This should not happen anymore
    //   return { success: false, message: 'Redirect error occurred unexpectedly.' };
    // }

    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to delete category. An unexpected error occurred.';
    
    console.error('Error deleting category:', error);
    // Return error object
    return { success: false, message: errorMessage };
  }
} 