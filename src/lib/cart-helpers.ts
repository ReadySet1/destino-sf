import { CartItem } from '@/types/cart';
import { validateOrderMinimumsServer } from '@/app/actions/orders';

/**
 * Client-safe version of isCateringOrder
 * Note: This is now handled server-side when validating order minimums
 */
export async function isCateringOrder(items: CartItem[]): Promise<boolean> {
  // The actual check is now performed server-side in the validateOrderMinimumsServer action
  // This is just a stub for backwards compatibility
  console.warn('isCateringOrder called from client - this is now handled server-side');
  return false;
}

/**
 * Client-safe version that calls the server action for validation
 * Returns an object with validation result and error message if applicable
 */
export async function validateOrderMinimums(
  items: CartItem[]
): Promise<{ isValid: boolean; errorMessage: string | null }> {
  try {
    // Call the server action instead of using Prisma directly
    return await validateOrderMinimumsServer(items);
  } catch (error) {
    console.error('Error validating order minimums:', error);
    // Fallback to allowing the order if there's an error with validation
    return { isValid: true, errorMessage: null };
  }
} 