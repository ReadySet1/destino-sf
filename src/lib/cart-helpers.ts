import { CartItem } from '@/types/cart';

/**
 * Order validation result interface
 */
export interface OrderValidationResult {
  isValid: boolean;
  errorMessage?: string;
  deliveryZone?: string;
  minimumRequired?: number;
  currentAmount?: number;
}

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
 * Always returns a proper response structure
 * 
 * Note: In tests, this function is mocked to avoid circular dependencies
 */
export async function validateOrderMinimums(
  items: CartItem[]
): Promise<OrderValidationResult> {
  try {
    // Validate input parameters
    if (!items || !Array.isArray(items)) {
      return {
        isValid: false,
        errorMessage: 'Invalid cart items provided'
      };
    }

    if (items.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Your cart is empty'
      };
    }

    // Import server action dynamically to avoid circular dependency
    const { validateOrderMinimumsServer } = await import('@/app/actions/orders');
    
    // Call the server action and extract the validation result
    const result = await validateOrderMinimumsServer(items);
    
    // Ensure we always return the expected format with proper fallbacks
    if (!result) {
      return {
        isValid: false,
        errorMessage: 'Order does not meet minimum requirements'
      };
    }

    return {
      isValid: result.isValid ?? false,
      errorMessage: result.isValid === false ? 
        (result.errorMessage || 'Order does not meet minimum requirements') : 
        undefined,
      deliveryZone: result.deliveryZone,
      minimumRequired: result.minimumRequired,
      currentAmount: result.currentAmount
    };
  } catch (error) {
    console.error('Error validating order minimums:', error);
    
    // Return a structured error response instead of throwing
    return { 
      isValid: false, 
      errorMessage: 'Unable to validate order requirements. Please try again.' 
    };
  }
} 