import { Product, Category } from '@prisma/client';

/**
 * Categories and products that are tax-exempt
 * According to business requirements:
 * - Empanadas: NON-taxable
 * - Alfajores: NON-taxable
 * - Sauces: NON-taxable
 * - Catering items: Taxable (only catering should be taxed)
 */

// Product types that are tax-exempt (non-catering items)
const TAX_EXEMPT_CATEGORIES = ['EMPANADAS', 'ALFAJORES', 'SAUCES'];

// Keywords in product names that indicate tax-exempt items
const TAX_EXEMPT_KEYWORDS = ['empanada', 'alfajor', 'sauce', 'salsa'];

/**
 * Determines if a product should be tax-exempt based on its category and name
 * Only catering items should be taxed - all other items are exempt
 */
export function isProductTaxExempt(product: {
  category?: { name?: string } | null;
  name?: string;
}): boolean {
  // If no product data, default to tax-exempt for safety
  if (!product) return true;

  const categoryName = product.category?.name?.toUpperCase() || '';
  const productName = product.name?.toLowerCase() || '';

  // Check if this is a catering item - catering items are the ONLY taxable items
  const isCateringItem = categoryName.includes('CATERING');

  // If it's a catering item, it should be taxed (not exempt)
  if (isCateringItem) {
    return false;
  }

  // Check if category is explicitly tax-exempt
  const isCategoryExempt = TAX_EXEMPT_CATEGORIES.some(exemptCategory =>
    categoryName.includes(exemptCategory)
  );

  if (isCategoryExempt) {
    return true;
  }

  // Check if product name contains tax-exempt keywords
  const isNameExempt = TAX_EXEMPT_KEYWORDS.some(keyword => productName.includes(keyword));

  if (isNameExempt) {
    return true;
  }

  // For all other non-catering items, they should be tax-exempt
  // Only catering items are taxable
  return true;
}

/**
 * Determines if a category should be tax-exempt
 */
export function isCategoryTaxExempt(categoryName: string): boolean {
  if (!categoryName) return true;

  const normalizedName = categoryName.toUpperCase();

  // Only catering categories are taxable
  if (normalizedName.includes('CATERING')) {
    return false;
  }

  // All other categories are tax-exempt
  return true;
}

/**
 * Calculates tax amount for a list of cart items
 * Only applies tax to catering items
 */
export function calculateTaxForItems(
  items: Array<{
    product?: {
      category?: { name?: string } | null;
      name?: string;
    };
    price: number;
    quantity: number;
  }>,
  taxRate: number
): {
  taxableSubtotal: number;
  exemptSubtotal: number;
  taxAmount: number;
  totalSubtotal: number;
} {
  let taxableSubtotal = 0;
  let exemptSubtotal = 0;

  items.forEach(item => {
    const itemTotal = item.price * item.quantity;

    if (item.product && isProductTaxExempt(item.product)) {
      exemptSubtotal += itemTotal;
    } else {
      taxableSubtotal += itemTotal;
    }
  });

  const totalSubtotal = taxableSubtotal + exemptSubtotal;
  const taxAmount = taxableSubtotal * taxRate;

  return {
    taxableSubtotal: Math.round(taxableSubtotal * 100) / 100,
    exemptSubtotal: Math.round(exemptSubtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalSubtotal: Math.round(totalSubtotal * 100) / 100,
  };
}
