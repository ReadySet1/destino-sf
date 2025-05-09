import { prisma } from '@/lib/prisma';
import { CartItem } from '@/types/cart';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Checks if a cart contains any items from the catering category
 */
export async function isCateringOrder(items: CartItem[]): Promise<boolean> {
  if (!items || items.length === 0) return false;
  
  // Get all product IDs from the cart
  const productIds = items.map(item => item.id);
  
  // Find all products in the cart that belong to a catering category
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      category: {
        name: { contains: 'catering', mode: 'insensitive' } // Case-insensitive search for 'catering'
      }
    }
  });
  
  // If any products are found, this is a catering order
  return products.length > 0;
}

/**
 * Validates if the cart meets minimum order requirements
 * Returns an object with validation result and error message if applicable
 */
export async function validateOrderMinimums(
  items: CartItem[]
): Promise<{ isValid: boolean; errorMessage: string | null }> {
  if (!items || items.length === 0) {
    return { isValid: false, errorMessage: 'Your cart is empty' };
  }
  
  // Calculate cart total
  const cartTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity, 
    0
  );
  
  // Get store settings
  const storeSettings = await prisma.storeSettings.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  
  if (!storeSettings) {
    // Fall back to basic validation if store settings not found
    return { isValid: true, errorMessage: null };
  }
  
  // Check if this is a catering order
  const hasCateringItems = await isCateringOrder(items);
  
  // Convert store settings to numbers for comparison
  const minOrderAmount = Number(storeSettings.minOrderAmount);
  const cateringMinimumAmount = Number(storeSettings.cateringMinimumAmount);
  
  // Apply validation based on order type
  if (hasCateringItems && cartTotal < cateringMinimumAmount && cateringMinimumAmount > 0) {
    return {
      isValid: false,
      errorMessage: `Catering orders require a minimum purchase of $${cateringMinimumAmount.toFixed(2)}`
    };
  } else if (cartTotal < minOrderAmount && minOrderAmount > 0) {
    return {
      isValid: false,
      errorMessage: `Orders require a minimum purchase of $${minOrderAmount.toFixed(2)}`
    };
  }
  
  return { isValid: true, errorMessage: null };
} 