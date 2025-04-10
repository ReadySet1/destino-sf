'use server';

import { prisma } from '@/lib/prisma';
import { client } from '@/sanity/lib/client';
import { redirect } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { JsonValue } from '@prisma/client/runtime/library';

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

export async function createCategoryAction(formData: FormData): Promise<void> {
  const name = formData.get('name');
  const description = formData.get('description');
  const orderRaw = formData.get('order');
  const isActiveRaw = formData.get('isActive');
  const image = formData.get('image') as File | null;

  // Validate inputs with type guards
  if (typeof name !== 'string' || name.trim() === '') {
    toast.error('Invalid category name');
    return;
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

    // Create category in Sanity
    await client.create({
      _type: 'productCategory',
      name: newCategory.name,
      slug: {
        _type: 'slug',
        current: slug || `category-${Date.now()}`,
      },
      description: newCategory.description || '',
      order: newCategory.order,
      isActive: newCategory.isActive,
      imageUrl: newCategory.imageUrl,
    });

    toast.success(`Category "${newCategory.name}" created successfully`);
    redirect('/admin/categories');
  } catch (error) {
    // Handle Next.js redirect and other errors specifically
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      redirect('/admin/categories');
      return;
    }

    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while creating category';
    
    console.error('Failed to create category:', error);
    toast.error(`Failed to create category: ${errorMessage}`);
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const rawId = formData.get('id');

  // Validate ID input
  if (typeof rawId !== 'string' || !rawId) {
    toast.error('No category ID provided');
    return;
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
      toast.error('Category not found.');
      return;
    }

    // Prevent deletion if category has products
    if (category._count.products > 0) {
      toast.error(`Cannot delete category '${category.name}' because it has ${category._count.products} products.`);
      return;
    }

    // Delete from PostgreSQL
    await prisma.category.delete({
      where: { id: rawId },
    });

    // Find and delete from Sanity
    const sanityCategoryId = await client.fetch<string | null>(
      `*[_type == "productCategory" && name == $name][0]._id`,
      { name: category.name }
    );

    if (sanityCategoryId) {
      await client.delete(sanityCategoryId);
    }

    toast.success(`Category "${category.name}" deleted successfully`);
    redirect('/admin/categories');
  } catch (error) {
    // Handle Next.js redirect specifically
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      redirect('/admin/categories');
      return;
    }

    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to delete category. An unexpected error occurred.';
    
    console.error('Error deleting category:', error);
    toast.error(errorMessage);
  }
} 