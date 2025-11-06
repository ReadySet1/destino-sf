/**
 * SEO and Product Categorization Helpers
 * Determines product types for proper search engine indexing
 */

import { Product, Category } from '@prisma/client';

/**
 * Determines if a product is a catering product based on its category
 * Catering categories all start with "CATERING-" prefix
 */
export function isCateringProduct(product: Product & { category?: Category | null }): boolean {
  if (!product.category) {
    return false;
  }

  // Check if category name starts with "CATERING-"
  return (
    product.category.name.toUpperCase().startsWith('CATERING-') ||
    product.category.slug?.startsWith('catering-') === true
  );
}

/**
 * Determines if a product should be indexed by search engines
 * Regular products (Alfajores, Empanadas): index = true
 * Catering products: index = false (only appear in catering searches)
 */
export function shouldIndexProduct(product: Product & { category?: Category | null }): boolean {
  // Don't index inactive products
  if (!product.active) {
    return false;
  }

  // Don't index catering products in general search
  if (isCateringProduct(product)) {
    return false;
  }

  // Index all other active products
  return true;
}

/**
 * Gets the product type for schema.org markup
 */
export function getProductSchemaType(
  product: Product & { category?: Category | null }
): 'Product' | 'MenuItem' {
  // Catering products are MenuItems
  if (isCateringProduct(product)) {
    return 'MenuItem';
  }

  // Regular products
  return 'Product';
}

/**
 * Gets appropriate category breadcrumb for a product
 */
export function getProductCategoryPath(
  product: Product & { category?: Category | null }
): { name: string; slug: string }[] {
  if (!product.category) {
    return [];
  }

  if (isCateringProduct(product)) {
    return [
      { name: 'Catering', slug: 'catering' },
      { name: product.category.name, slug: product.category.slug || '' },
    ];
  }

  return [
    { name: 'Products', slug: 'products' },
    { name: product.category.name, slug: product.category.slug || '' },
  ];
}

/**
 * Regular product categories (should be indexed)
 */
export const REGULAR_PRODUCT_CATEGORIES = ['alfajores', 'empanadas'];

/**
 * Checks if a category is a regular product category
 */
export function isRegularProductCategory(categorySlug: string): boolean {
  return REGULAR_PRODUCT_CATEGORIES.includes(categorySlug.toLowerCase());
}
