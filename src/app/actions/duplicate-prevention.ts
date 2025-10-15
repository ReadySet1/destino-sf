'use server';

import { handleDuplicateOrderPrevention } from '@/lib/duplicate-order-prevention';
import { CartItem } from '@/types/cart';
import { createClient } from '@/utils/supabase/server';

export interface DuplicateCheckResult {
  success: boolean;
  hasDuplicate: boolean;
  existingOrder?: {
    id: string;
    total: number;
    createdAt: Date;
    paymentUrl?: string;
    paymentUrlExpiresAt?: Date;
    retryCount: number;
  };
  error?: string;
}

/**
 * Server action to check for duplicate orders before checkout
 * @param cartItems - Items in the current cart
 * @param email - Customer email (for logged out users)
 */
export async function checkForDuplicateOrders(
  cartItems: CartItem[],
  email?: string
): Promise<DuplicateCheckResult> {
  try {
    // Get current user if logged in
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !email) {
      return {
        success: true,
        hasDuplicate: false,
      };
    }

    // Check for duplicate orders
    const duplicateCheck = await handleDuplicateOrderPrevention(
      user?.id || null,
      cartItems,
      email || user?.email
    );

    return {
      success: true,
      hasDuplicate: duplicateCheck.hasPendingOrder,
      existingOrder: duplicateCheck.existingOrder,
    };
  } catch (error) {
    console.error('Error checking for duplicate orders:', error);
    return {
      success: false,
      hasDuplicate: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
