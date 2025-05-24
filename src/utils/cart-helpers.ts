import { Product } from '@prisma/client';

/**
 * Determines if a product is a catering item based on its category name
 * This is a client-side helper function
 */
export function isCateringProduct(product: { category?: { name?: string } }): boolean {
  if (!product?.category?.name) return false;
  
  const categoryName = product.category.name.toLowerCase();
  return categoryName.includes('catering');
}

/**
 * Checks if a category name indicates a catering category
 * This is a client-side helper function
 */
export function isCateringCategory(categoryName: string): boolean {
  if (!categoryName) return false;
  
  const normalizedName = categoryName.toLowerCase();
  return normalizedName.includes('catering');
} 