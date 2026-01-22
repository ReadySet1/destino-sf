/**
 * USPS Flat Rate Box Selection Logic
 *
 * This module handles the selection of appropriate USPS flat rate boxes
 * based on order weight and item count. Uses Shippo parcel templates
 * for accurate flat rate pricing.
 */

import { prisma } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { isBuildTime } from '@/lib/build-time-utils';

/**
 * USPS Flat Rate Box configuration
 */
export interface BoxConfig {
  boxSize: string;
  template: string;
  maxWeightLb: number;
  maxItemCount: number;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Result of box selection including the selected box and metadata
 */
export interface BoxSelectionResult {
  template: string;
  boxSize: string;
  maxWeight: number;
  maxItems: number;
  reason: string;
}

/**
 * Default USPS flat rate box configurations
 * These are used as fallbacks if no database configuration exists
 */
const DEFAULT_BOX_CONFIGS: BoxConfig[] = [
  {
    boxSize: 'small',
    template: 'USPS_SmallFlatRateBox',
    maxWeightLb: 3.0,
    maxItemCount: 2,
    isActive: true,
    sortOrder: 1,
  },
  {
    boxSize: 'medium',
    template: 'USPS_MediumFlatRateBox1',
    maxWeightLb: 10.0,
    maxItemCount: 6,
    isActive: true,
    sortOrder: 2,
  },
  {
    boxSize: 'large',
    template: 'USPS_LargeFlatRateBox',
    maxWeightLb: 20.0,
    maxItemCount: 12,
    isActive: true,
    sortOrder: 3,
  },
];

/**
 * USPS flat rate box weight limit (applies to all boxes)
 * USPS flat rate boxes have a 70lb max weight limit
 */
const USPS_MAX_WEIGHT_LB = 70;

/**
 * Gets box configurations from database or returns defaults
 */
export async function getBoxConfigs(): Promise<BoxConfig[]> {
  // During build time, return default configurations
  if (isBuildTime()) {
    return DEFAULT_BOX_CONFIGS;
  }

  try {
    const dbConfigs = await prisma.shippingBoxConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (dbConfigs.length > 0) {
      const configs: BoxConfig[] = dbConfigs.map(config => ({
        boxSize: config.boxSize,
        template: config.template,
        maxWeightLb: Number(config.maxWeightLb),
        maxItemCount: config.maxItemCount,
        isActive: config.isActive,
        sortOrder: config.sortOrder,
      }));

      logger.info(`[BoxSelection] ✓ Loaded ${configs.length} box configs from database`);
      return configs;
    }

    logger.warn('[BoxSelection] ⚠️ No box configs in database, using defaults');
    return DEFAULT_BOX_CONFIGS;
  } catch (error) {
    // If table doesn't exist yet, return defaults
    if (
      error instanceof Error &&
      (error.message.includes('does not exist') || error.message.includes('relation'))
    ) {
      logger.info('[BoxSelection] Box configs table not yet created, using defaults');
      return DEFAULT_BOX_CONFIGS;
    }

    logger.error('[BoxSelection] ❌ Error fetching box configs:', error);
    return DEFAULT_BOX_CONFIGS;
  }
}

/**
 * Selects the appropriate USPS flat rate box based on weight and item count
 *
 * @param totalWeight - Total weight of the shipment in pounds
 * @param itemCount - Total number of items in the shipment
 * @param configs - Optional box configurations (fetched from DB if not provided)
 * @returns BoxSelectionResult with the selected box template and metadata
 */
export async function selectBoxTemplate(
  totalWeight: number,
  itemCount: number,
  configs?: BoxConfig[]
): Promise<BoxSelectionResult> {
  const boxConfigs = configs ?? (await getBoxConfigs());

  // Sort by sortOrder to ensure we check smallest boxes first
  const sortedConfigs = [...boxConfigs].sort((a, b) => a.sortOrder - b.sortOrder);

  logger.debug(
    `[BoxSelection] Selecting box for weight=${totalWeight}lb, items=${itemCount}`,
    sortedConfigs.map(c => c.boxSize)
  );

  // Find the smallest box that fits both weight and item count
  for (const config of sortedConfigs) {
    if (!config.isActive) continue;

    const weightFits = totalWeight <= config.maxWeightLb;
    const itemsFit = itemCount <= config.maxItemCount;

    if (weightFits && itemsFit) {
      logger.info(
        `[BoxSelection] ✓ Selected ${config.boxSize} box (${config.template}) for ${totalWeight}lb, ${itemCount} items`
      );
      return {
        template: config.template,
        boxSize: config.boxSize,
        maxWeight: config.maxWeightLb,
        maxItems: config.maxItemCount,
        reason: `Fits within ${config.boxSize} box limits (${config.maxWeightLb}lb, ${config.maxItemCount} items)`,
      };
    }
  }

  // If no box fits, use the largest available box
  const largestBox = sortedConfigs[sortedConfigs.length - 1] || DEFAULT_BOX_CONFIGS[2];

  logger.warn(
    `[BoxSelection] ⚠️ No ideal box found for ${totalWeight}lb, ${itemCount} items. Using largest: ${largestBox.boxSize}`
  );

  return {
    template: largestBox.template,
    boxSize: largestBox.boxSize,
    maxWeight: largestBox.maxWeightLb,
    maxItems: largestBox.maxItemCount,
    reason: `Order exceeds standard limits, using largest available box (${largestBox.boxSize})`,
  };
}

/**
 * Synchronous version using default configs only (for quick lookups)
 * Use this when you don't need database configs
 */
export function selectBoxTemplateSync(totalWeight: number, itemCount: number): BoxSelectionResult {
  const sortedConfigs = [...DEFAULT_BOX_CONFIGS].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const config of sortedConfigs) {
    if (!config.isActive) continue;

    if (totalWeight <= config.maxWeightLb && itemCount <= config.maxItemCount) {
      return {
        template: config.template,
        boxSize: config.boxSize,
        maxWeight: config.maxWeightLb,
        maxItems: config.maxItemCount,
        reason: `Fits within ${config.boxSize} box limits`,
      };
    }
  }

  const largestBox = DEFAULT_BOX_CONFIGS[2];
  return {
    template: largestBox.template,
    boxSize: largestBox.boxSize,
    maxWeight: largestBox.maxWeightLb,
    maxItems: largestBox.maxItemCount,
    reason: 'Using largest available box',
  };
}

/**
 * Gets human-readable box size name
 */
export function getBoxDisplayName(template: string): string {
  const displayNames: Record<string, string> = {
    USPS_SmallFlatRateBox: 'USPS Small Flat Rate Box',
    USPS_MediumFlatRateBox1: 'USPS Medium Flat Rate Box',
    USPS_MediumFlatRateBox2: 'USPS Medium Flat Rate Box (Side-Loading)',
    USPS_LargeFlatRateBox: 'USPS Large Flat Rate Box',
    USPS_LargeFlatRateBoardGameBox: 'USPS Large Flat Rate Board Game Box',
  };

  return displayNames[template] || template;
}

/**
 * Validates if a shipment can be sent via flat rate
 */
export function validateFlatRateEligibility(
  totalWeight: number,
  itemCount: number
): { eligible: boolean; reason: string } {
  // Check USPS max weight limit
  if (totalWeight > USPS_MAX_WEIGHT_LB) {
    return {
      eligible: false,
      reason: `Weight (${totalWeight}lb) exceeds USPS flat rate limit of ${USPS_MAX_WEIGHT_LB}lb`,
    };
  }

  // Get largest box limits
  const largestBox = DEFAULT_BOX_CONFIGS[DEFAULT_BOX_CONFIGS.length - 1];

  // Check if order might not fit in largest box
  if (totalWeight > largestBox.maxWeightLb * 1.5) {
    return {
      eligible: false,
      reason: `Weight significantly exceeds practical flat rate limits. Consider splitting into multiple shipments.`,
    };
  }

  return {
    eligible: true,
    reason: 'Order is eligible for USPS flat rate shipping',
  };
}

/**
 * Admin function to update box configuration
 */
export async function updateBoxConfig(
  boxSize: string,
  updates: Partial<Omit<BoxConfig, 'boxSize'>>
): Promise<BoxConfig> {
  const updated = await prisma.shippingBoxConfig.upsert({
    where: { boxSize },
    create: {
      boxSize,
      template: updates.template ?? DEFAULT_BOX_CONFIGS.find(c => c.boxSize === boxSize)?.template ?? '',
      maxWeightLb: updates.maxWeightLb ?? 10,
      maxItemCount: updates.maxItemCount ?? 6,
      isActive: updates.isActive ?? true,
      sortOrder: updates.sortOrder ?? 0,
    },
    update: updates,
  });

  return {
    boxSize: updated.boxSize,
    template: updated.template,
    maxWeightLb: Number(updated.maxWeightLb),
    maxItemCount: updated.maxItemCount,
    isActive: updated.isActive,
    sortOrder: updated.sortOrder,
  };
}

/**
 * Admin function to get all box configurations (including inactive)
 */
export async function getAllBoxConfigs(): Promise<BoxConfig[]> {
  if (isBuildTime()) {
    return DEFAULT_BOX_CONFIGS;
  }

  try {
    const dbConfigs = await prisma.shippingBoxConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    if (dbConfigs.length > 0) {
      return dbConfigs.map(config => ({
        boxSize: config.boxSize,
        template: config.template,
        maxWeightLb: Number(config.maxWeightLb),
        maxItemCount: config.maxItemCount,
        isActive: config.isActive,
        sortOrder: config.sortOrder,
      }));
    }

    return DEFAULT_BOX_CONFIGS;
  } catch (error) {
    // If table doesn't exist yet, return defaults
    if (
      error instanceof Error &&
      (error.message.includes('does not exist') || error.message.includes('relation'))
    ) {
      return DEFAULT_BOX_CONFIGS;
    }
    logger.error('[BoxSelection] ❌ Error fetching all box configs:', error);
    return DEFAULT_BOX_CONFIGS;
  }
}
