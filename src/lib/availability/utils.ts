/**
 * Availability State Utilities
 * Helper functions for determining and displaying product availability states
 */

import { Product } from '@/types/product';
import { AvailabilityState } from '@/types/availability';

// Enable debug logging in development
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Normalize state string to match AvailabilityState enum
 */
function normalizeState(state: string): string {
  // Convert to lowercase and replace spaces/hyphens with underscores
  const normalized = state.toLowerCase().replace(/[\s-]/g, '_');

  if (DEBUG && state !== normalized) {
    console.log(`[Availability] Normalized state: "${state}" → "${normalized}"`);
  }

  return normalized;
}

/**
 * Determine the effective availability state for a product
 * Priority order:
 * 1. Evaluated availability from rules (if present)
 * 2. Database fields (isAvailable, isPreorder, itemState)
 * 3. Default to AVAILABLE
 */
export function getEffectiveAvailabilityState(product: Product): string {
  // Priority 1: Use evaluated availability from rules if available
  if (product.evaluatedAvailability?.currentState) {
    const state = normalizeState(product.evaluatedAvailability.currentState);

    if (DEBUG) {
      console.log(
        `[Availability] ${product.name}: Using evaluated state: ${state} (${product.evaluatedAvailability.appliedRulesCount} rules applied)`
      );
    }

    return state;
  }

  // Priority 2: Fall back to database fields
  if (!product.isAvailable && !product.isPreorder) {
    if (DEBUG) console.log(`[Availability] ${product.name}: HIDDEN (not available, not preorder)`);
    return AvailabilityState.HIDDEN;
  }

  if (product.isPreorder) {
    if (DEBUG) console.log(`[Availability] ${product.name}: PRE_ORDER (database flag)`);
    return AvailabilityState.PRE_ORDER;
  }

  if (product.itemState === 'SEASONAL') {
    if (DEBUG) console.log(`[Availability] ${product.name}: COMING_SOON (seasonal)`);
    return AvailabilityState.COMING_SOON;
  }

  if (product.itemState === 'INACTIVE' || product.itemState === 'ARCHIVED') {
    if (DEBUG) console.log(`[Availability] ${product.name}: HIDDEN (inactive/archived)`);
    return AvailabilityState.HIDDEN;
  }

  // Default to available
  if (DEBUG) console.log(`[Availability] ${product.name}: AVAILABLE (default)`);
  return AvailabilityState.AVAILABLE;
}

/**
 * Check if a product should be rendered on the frontend
 * Products with HIDDEN state should not be displayed
 */
export function shouldRenderProduct(product: Product): boolean {
  const state = normalizeState(getEffectiveAvailabilityState(product));
  return state !== AvailabilityState.HIDDEN;
}

/**
 * Check if a product can be added to cart
 */
export function canAddToCart(product: Product): boolean {
  const state = normalizeState(getEffectiveAvailabilityState(product));
  return [AvailabilityState.AVAILABLE, AvailabilityState.PRE_ORDER].includes(
    state as AvailabilityState
  );
}

/**
 * Check if a product is in view-only mode
 */
export function isViewOnly(product: Product): boolean {
  const state = normalizeState(getEffectiveAvailabilityState(product));
  return state === AvailabilityState.VIEW_ONLY;
}

/**
 * Check if a product is pre-order
 */
export function isPreOrder(product: Product): boolean {
  const state = normalizeState(getEffectiveAvailabilityState(product));
  return state === AvailabilityState.PRE_ORDER;
}

/**
 * Check if a product is coming soon
 */
export function isComingSoon(product: Product): boolean {
  const state = normalizeState(getEffectiveAvailabilityState(product));
  return state === AvailabilityState.COMING_SOON;
}

/**
 * Get button configuration based on availability state
 */
export function getAddToCartButtonConfig(product: Product): {
  text: string;
  disabled: boolean;
  className: string;
  icon?: string;
  ariaLabel: string;
} {
  const state = normalizeState(getEffectiveAvailabilityState(product));

  switch (state) {
    case AvailabilityState.AVAILABLE:
      return {
        text: 'Add to Cart',
        disabled: false,
        className: 'bg-yellow-400 hover:bg-yellow-500 text-gray-900',
        icon: 'cart',
        ariaLabel: 'Add to cart',
      };

    case AvailabilityState.PRE_ORDER:
      return {
        text: 'Pre-order Now',
        disabled: false,
        className: 'bg-blue-500 hover:bg-blue-600 text-white',
        icon: 'preorder',
        ariaLabel: 'Pre-order this product',
      };

    case AvailabilityState.VIEW_ONLY:
      return {
        text: 'View Only',
        disabled: true,
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed',
        icon: 'eye',
        ariaLabel: 'This product is currently view-only and cannot be purchased',
      };

    case AvailabilityState.COMING_SOON:
      return {
        text: 'Coming Soon',
        disabled: true,
        className: 'bg-purple-300 text-purple-700 cursor-not-allowed',
        icon: 'calendar',
        ariaLabel: 'This product is coming soon',
      };

    case AvailabilityState.SOLD_OUT:
      return {
        text: 'Sold Out',
        disabled: true,
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed',
        ariaLabel: 'This product is sold out',
      };

    case AvailabilityState.RESTRICTED:
      return {
        text: 'Restricted',
        disabled: true,
        className: 'bg-red-300 text-red-700 cursor-not-allowed',
        ariaLabel: 'This product has purchase restrictions',
      };

    default:
      return {
        text: 'Unavailable',
        disabled: true,
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed',
        ariaLabel: 'This product is currently unavailable',
      };
  }
}

/**
 * Get badge configuration based on availability state
 */
export function getAvailabilityBadge(product: Product): {
  show: boolean;
  text: string;
  className: string;
  icon?: string;
} | null {
  const state = normalizeState(getEffectiveAvailabilityState(product));

  // Featured badge takes precedence
  if (product.featured) {
    return {
      show: true,
      text: 'Featured',
      className: 'bg-orange-500 text-white',
    };
  }

  switch (state) {
    case AvailabilityState.PRE_ORDER:
      return {
        show: true,
        text: 'Pre-order',
        className: 'bg-blue-500 text-white',
      };

    case AvailabilityState.COMING_SOON:
      return {
        show: true,
        text: 'Coming Soon',
        className: 'bg-purple-500 text-white',
        icon: 'calendar',
      };

    case AvailabilityState.VIEW_ONLY:
      return {
        show: true,
        text: 'View Only',
        className: 'bg-gray-500 text-white',
        icon: 'eye',
      };

    case AvailabilityState.SOLD_OUT:
      return {
        show: true,
        text: 'Sold Out',
        className: 'bg-red-500 text-white',
      };

    default:
      return null;
  }
}

/**
 * Get the view-only message if applicable
 */
export function getViewOnlyMessage(product: Product): string | null {
  const state = normalizeState(getEffectiveAvailabilityState(product));

  if (state !== AvailabilityState.VIEW_ONLY) {
    return null;
  }

  // Check if there's a custom message from the rule
  if (product.evaluatedAvailability) {
    // In a complete implementation, you would fetch the applied rule details
    // For now, return a default message
    return 'This item is currently available for viewing only and cannot be purchased at this time.';
  }

  return 'This item is currently available for viewing only.';
}

/**
 * Format pre-order message with dates if available
 */
export function formatPreorderMessage(product: Product): string {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  let message = `This item is available for pre-order only.\n\n`;

  if (product.preorderStartDate && product.preorderEndDate) {
    message += `Expected availability: ${formatDate(product.preorderStartDate)} - ${formatDate(product.preorderEndDate)}\n\n`;
  } else if (product.preorderEndDate) {
    message += `Expected availability by: ${formatDate(product.preorderEndDate)}\n\n`;
  }

  message += `Would you like to place a pre-order for this item?`;
  return message;
}
