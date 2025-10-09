import type { SquareTipSettings } from '../../types/square';

/**
 * Default custom tip percentages: 5%, 10%, 15%
 * Replaces Square's default of 15%, 20%, 25%
 */
export const DEFAULT_TIP_PERCENTAGES = [5, 10, 15] as const;

/**
 * Creates Square tip settings configuration with custom percentages
 * @param percentages - Array of tip percentages (0-100, max 3 values)
 * @param options - Additional tip settings options
 * @returns SquareTipSettings object
 */
export function createTipSettings(
  percentages: number[] = [...DEFAULT_TIP_PERCENTAGES],
  options: Partial<SquareTipSettings> = {}
): SquareTipSettings {
  // Validate percentages
  if (percentages.length > 3) {
    throw new Error('Square allows maximum 3 tip percentages');
  }

  if (percentages.some(p => p < 0 || p > 100)) {
    throw new Error('Tip percentages must be between 0 and 100');
  }

  return {
    allow_tipping: true,
    separate_tip_screen: false,
    custom_tip_field: true,
    tip_percentages: percentages,
    smart_tip_amounts: false, // Must be false to use custom percentages
    ...options,
  };
}

/**
 * Creates tip settings for regular orders (5%, 10%, 15%)
 */
export function createRegularOrderTipSettings(): SquareTipSettings {
  return createTipSettings();
}

/**
 * Creates tip settings for catering orders (5%, 10%, 15%)
 */
export function createCateringOrderTipSettings(): SquareTipSettings {
  return createTipSettings();
}

/**
 * Creates tip settings for delivery orders with 0% default
 * Shows 0%, 10%, 15% as options with 0% as default (no pre-selection)
 */
export function createDeliveryOrderTipSettings(): SquareTipSettings {
  return createTipSettings([0, 10, 15], {
    // Allow custom tip field so customers can enter their own amount
    custom_tip_field: true,
  });
}

/**
 * Creates settings that disable tipping entirely
 * Used for pickup and shipping orders
 */
export function createNoTipSettings(): SquareTipSettings {
  return {
    allow_tipping: false,
    separate_tip_screen: false,
    custom_tip_field: false,
    tip_percentages: [],
    smart_tip_amounts: false,
  };
}

/**
 * Validates tip settings configuration
 * @param tipSettings - The tip settings to validate
 * @throws Error if configuration is invalid
 */
export function validateTipSettings(tipSettings: SquareTipSettings): void {
  if (tipSettings.smart_tip_amounts && tipSettings.tip_percentages.length > 0) {
    console.warn(
      'Warning: smart_tip_amounts is enabled, which will override custom tip_percentages'
    );
  }

  if (tipSettings.tip_percentages.length > 3) {
    throw new Error('Square allows maximum 3 tip percentages');
  }

  if (tipSettings.tip_percentages.some(p => p < 0 || p > 100)) {
    throw new Error('All tip percentages must be between 0 and 100');
  }
}
