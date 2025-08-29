// Utility functions for managing product display order

import { prisma } from '@/lib/db';
import type { 
  ProductDisplayOrder, 
  ReorderUpdateItem, 
  ReorderStrategy 
} from '@/types/product-admin';

/**
 * Get products by category, ordered by ordinal
 */
export async function getProductsByCategory(
  categoryId: string,
  includeInactive = false
): Promise<ProductDisplayOrder[]> {
  const products = await prisma.product.findMany({
    where: {
      categoryId,
      ...(includeInactive ? {} : { active: true })
    },
    orderBy: [
      { ordinal: 'asc' },
      { createdAt: 'asc' } // Fallback
    ],
    select: {
      id: true,
      name: true,
      ordinal: true,
      price: true,
      images: true,
      active: true,
      categoryId: true,
      // Additional fields for badge display
      isAvailable: true,
      isPreorder: true,
      visibility: true,
      itemState: true,
    }
  });

  return products.map(product => ({
    id: product.id,
    name: product.name,
    ordinal: Number(product.ordinal || 0),
    categoryId: product.categoryId,
    imageUrl: product.images?.[0] || undefined,
    price: Number(product.price),
    active: product.active,
    // Additional fields for badge display
    isAvailable: product.isAvailable,
    isPreorder: product.isPreorder,
    visibility: product.visibility,
    itemState: product.itemState,
  }));
}

/**
 * Reorder products using atomic transaction
 */
export async function reorderProducts(
  updates: ReorderUpdateItem[]
): Promise<{ success: boolean; updatedCount: number }> {
  try {
    // Use transaction for atomic updates
    const updateResults = await prisma.$transaction(
      updates.map(({ id, ordinal }) =>
        prisma.product.update({
          where: { id },
          data: { 
            ordinal: BigInt(ordinal),
            updatedAt: new Date()
          }
        })
      )
    );
    
    return {
      success: true,
      updatedCount: updateResults.length
    };
  } catch (error) {
    console.error('Error reordering products:', error);
    return {
      success: false,
      updatedCount: 0
    };
  }
}

/**
 * Auto-assign ordinals based on a strategy
 */
export async function applyReorderStrategy(
  categoryId: string, 
  strategy: ReorderStrategy
): Promise<ReorderUpdateItem[]> {
  const products = await prisma.product.findMany({
    where: { categoryId },
    select: {
      id: true,
      name: true,
      price: true,
      createdAt: true,
      ordinal: true
    }
  });
  
  let sortedProducts;
  
  switch (strategy) {
    case 'ALPHABETICAL':
      sortedProducts = [...products].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      break;
      
    case 'PRICE_ASC':
      sortedProducts = [...products].sort((a, b) => 
        Number(a.price) - Number(b.price)
      );
      break;
      
    case 'PRICE_DESC':
      sortedProducts = [...products].sort((a, b) => 
        Number(b.price) - Number(a.price)
      );
      break;
      
    case 'NEWEST_FIRST':
      sortedProducts = [...products].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
      break;
      
    default:
      // CUSTOM or unknown - return current order
      sortedProducts = [...products].sort((a, b) => 
        Number(a.ordinal || 0) - Number(b.ordinal || 0)
      );
  }
  
  // Generate new ordinals with gaps for manual insertion
  return sortedProducts.map((product, index) => ({
    id: product.id,
    ordinal: (index + 1) * 100
  }));
}

/**
 * Insert product at specific position, shifting others
 */
export async function insertProductAtPosition(
  productId: string,
  targetPosition: number,
  categoryId: string
): Promise<{ success: boolean; updatedCount: number }> {
  try {
    // Get products at and after the target position
    const productsToShift = await prisma.product.findMany({
      where: {
        categoryId,
        ordinal: { gte: BigInt(targetPosition) },
        id: { not: productId } // Exclude the product being moved
      },
      orderBy: { ordinal: 'asc' },
      select: { id: true, ordinal: true }
    });
    
    // Prepare updates: shift existing products and place target product
    const updates: ReorderUpdateItem[] = [
      // Insert the product at target position
      { id: productId, ordinal: targetPosition },
      // Shift other products
      ...productsToShift.map(p => ({
        id: p.id,
        ordinal: Number(p.ordinal || 0) + 100
      }))
    ];
    
    return await reorderProducts(updates);
  } catch (error) {
    console.error('Error inserting product at position:', error);
    return { success: false, updatedCount: 0 };
  }
}

/**
 * Get next available ordinal for a category
 */
export async function getNextOrdinal(categoryId: string): Promise<number> {
  const maxOrdinal = await prisma.product.aggregate({
    where: { categoryId },
    _max: { ordinal: true }
  });
  
  return Number(maxOrdinal._max.ordinal || 0) + 100;
}

/**
 * Get all categories with product counts for admin interface
 */
export async function getCategoriesWithProductCounts() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          products: {
            where: { active: true }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  return categories.map(category => ({
    id: category.id,
    name: category.name,
    productCount: category._count.products
  }));
}

/**
 * Validate that all product IDs belong to the specified category
 */
export async function validateProductsInCategory(
  productIds: string[],
  categoryId: string
): Promise<boolean> {
  const count = await prisma.product.count({
    where: {
      id: { in: productIds },
      categoryId
    }
  });
  
  return count === productIds.length;
}

/**
 * Recalculate ordinals to fix gaps and ensure sequential order
 */
export async function normalizeOrdinals(categoryId: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: { categoryId },
    orderBy: [
      { ordinal: 'asc' },
      { createdAt: 'asc' }
    ],
    select: { id: true }
  });
  
  const updates = products.map((product, index) => ({
    id: product.id,
    ordinal: (index + 1) * 100
  }));
  
  const result = await reorderProducts(updates);
  return result.updatedCount;
}
