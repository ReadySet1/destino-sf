// Re-export types and server actions for client components
import type { DeliveryFeeResult } from '../actions/delivery-actions';
export type { DeliveryFeeResult } from '../actions/delivery-actions';
export { calculateDeliveryFeeAction } from '../actions/delivery-actions';

/**
 * Gets the delivery fee message to display to the user
 *
 * @param feeResult The delivery fee calculation result
 * @returns A human-readable message about the delivery fee
 */
export function getDeliveryFeeMessage(feeResult: DeliveryFeeResult | null): string {
  if (!feeResult) {
    return 'This address is outside our delivery area.';
  }

  if (feeResult.isFreeDelivery) {
    return `Free delivery! (Orders over $${feeResult.minOrderForFreeDelivery} qualify)`;
  }

  if (feeResult.minOrderForFreeDelivery && feeResult.minOrderForFreeDelivery > 0) {
    return `$${feeResult.fee} delivery fee. Orders over $${feeResult.minOrderForFreeDelivery} qualify for free delivery!`;
  }

  return `$${feeResult.fee} delivery fee for this area.`;
}

// Re-export cache clearing action for client components
export { clearDeliveryZonesCacheAction } from '../actions/delivery-actions';
