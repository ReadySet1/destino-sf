import { prisma, withPreparedStatementHandling } from '@/lib/db';

/**
 * Interface for cart items used in shipping calculations
 */
export interface CartItemForShipping {
  id: string;
  name: string;
  quantity: number;
  variantId?: string;
}

/**
 * Interface for shipping weight configuration
 */
export interface ShippingWeightConfig {
  productName: string;
  baseWeightLb: number;
  weightPerUnitLb: number;
  isActive: boolean;
  applicableForNationwideOnly: boolean;
}

/**
 * Default weight configurations for products
 * These will be used as fallbacks if no database configuration exists
 */
const DEFAULT_WEIGHT_CONFIGS: Record<string, ShippingWeightConfig> = {
  alfajores: {
    productName: 'alfajores',
    baseWeightLb: 0.5, // Base weight for first unit (packaging + 1 alfajor pack)
    weightPerUnitLb: 0.4, // Additional weight per extra pack
    isActive: true,
    applicableForNationwideOnly: true,
  },
  empanadas: {
    productName: 'empanadas',
    baseWeightLb: 1.0, // Base weight for first unit (packaging + 1 empanada pack)
    weightPerUnitLb: 0.8, // Additional weight per extra pack
    isActive: true,
    applicableForNationwideOnly: true,
  },
};

/**
 * Default weight for products that don't have specific configurations
 */
const DEFAULT_PRODUCT_WEIGHT_LB = 0.5;

/**
 * Determines the product type from product name for weight calculation
 */
function getProductType(productName: string): string {
  const name = productName.toLowerCase();

  if (name.includes('alfajor')) {
    return 'alfajores';
  }

  if (name.includes('empanada')) {
    return 'empanadas';
  }

  return 'default';
}

/**
 * Gets shipping weight configuration from database or defaults
 */
export async function getShippingWeightConfig(
  productType: string
): Promise<ShippingWeightConfig | null> {
  try {
    // Try to get from database first
    const dbConfig = await prisma.shippingConfiguration.findFirst({
      where: {
        productName: productType,
        isActive: true,
      },
    });

    if (dbConfig) {
      const config = {
        productName: dbConfig.productName,
        baseWeightLb: Number(dbConfig.baseWeightLb),
        weightPerUnitLb: Number(dbConfig.weightPerUnitLb),
        isActive: dbConfig.isActive,
        applicableForNationwideOnly: dbConfig.applicableForNationwideOnly,
      };
      console.log(`📊 Found DB config for ${productType}:`, config);
      return config;
    }

    // Fall back to default configurations
    const defaultConfig = DEFAULT_WEIGHT_CONFIGS[productType] || null;
    console.log(`📊 Using default config for ${productType}:`, defaultConfig);
    return defaultConfig;
  } catch (error) {
    console.error('Error fetching shipping weight config:', error);
    // Fall back to default configurations
    const fallbackConfig = DEFAULT_WEIGHT_CONFIGS[productType] || null;
    console.log(`📊 Using fallback config for ${productType}:`, fallbackConfig);
    return fallbackConfig;
  }
}

/**
 * Calculates total shipping weight for cart items
 */
export async function calculateShippingWeight(
  items: CartItemForShipping[],
  fulfillmentMethod: 'pickup' | 'local_delivery' | 'nationwide_shipping'
): Promise<number> {
  let totalWeight = 0;

  // Group items by product type for more efficient weight calculation
  const itemsByType = new Map<string, { items: CartItemForShipping[]; totalQuantity: number }>();

  for (const item of items) {
    const productType = getProductType(item.name);

    if (!itemsByType.has(productType)) {
      itemsByType.set(productType, { items: [], totalQuantity: 0 });
    }

    const typeGroup = itemsByType.get(productType)!;
    typeGroup.items.push(item);
    typeGroup.totalQuantity += item.quantity;
  }

  // Calculate weight for each product type
  for (const [productType, { totalQuantity }] of itemsByType) {
    const weightConfig = await getShippingWeightConfig(productType);

    if (weightConfig && weightConfig.isActive) {
      // Check if this configuration applies to the fulfillment method
      if (weightConfig.applicableForNationwideOnly && fulfillmentMethod !== 'nationwide_shipping') {
        // Use default weight for non-nationwide shipping
        const defaultWeight = totalQuantity * DEFAULT_PRODUCT_WEIGHT_LB;
        console.log(
          `⚖️ ${productType}: Using default weight for ${fulfillmentMethod} (${totalQuantity} × ${DEFAULT_PRODUCT_WEIGHT_LB} = ${defaultWeight}lb)`
        );
        totalWeight += defaultWeight;
        continue;
      }

      // Use configured weight calculation
      if (totalQuantity > 0) {
        // Base weight for first unit + additional weight for extra units
        const additionalUnits = Math.max(0, totalQuantity - 1);
        const productWeight =
          weightConfig.baseWeightLb + additionalUnits * weightConfig.weightPerUnitLb;
        console.log(
          `⚖️ ${productType}: Configured weight calculation (${weightConfig.baseWeightLb} + ${additionalUnits} × ${weightConfig.weightPerUnitLb} = ${productWeight}lb)`
        );
        totalWeight += productWeight;
      }
    } else {
      // Use default weight for products without specific configuration
      const defaultWeight = totalQuantity * DEFAULT_PRODUCT_WEIGHT_LB;
      console.log(
        `⚖️ ${productType}: No active config, using default (${totalQuantity} × ${DEFAULT_PRODUCT_WEIGHT_LB} = ${defaultWeight}lb)`
      );
      totalWeight += defaultWeight;
    }
  }

  // Ensure minimum weight for shipping (most carriers require at least 0.5 lb for small packages)
  const finalWeight = Math.max(totalWeight, 0.5);

  // Round to 2 decimal places to avoid floating point precision issues
  const roundedWeight = Math.round(finalWeight * 100) / 100;

  console.log(
    `📏 Final shipping weight: ${totalWeight}lb → ${finalWeight}lb → ${roundedWeight}lb (rounded for API)`
  );
  return roundedWeight;
}



/**
 * Admin function to get all shipping weight configurations
 */
export async function getAllShippingConfigurations(): Promise<ShippingWeightConfig[]> {
  try {
    // Use centralized Prisma client with error handling
    const dbConfigs = await withPreparedStatementHandling(
      () => prisma.shippingConfiguration.findMany({
        orderBy: { productName: 'asc' },
      }),
      'shipping configurations query'
    );

    const configs: ShippingWeightConfig[] = dbConfigs.map(config => ({
      productName: config.productName,
      baseWeightLb: Number(config.baseWeightLb),
      weightPerUnitLb: Number(config.weightPerUnitLb),
      isActive: config.isActive,
      applicableForNationwideOnly: config.applicableForNationwideOnly,
    }));

    // Add default configurations that aren't in the database
    const dbProductNames = new Set(configs.map(c => c.productName));
    for (const [productName, defaultConfig] of Object.entries(DEFAULT_WEIGHT_CONFIGS)) {
      if (!dbProductNames.has(productName)) {
        configs.push(defaultConfig);
      }
    }

    return configs;
  } catch (error) {
    console.error('Error fetching shipping configurations:', error);
    return Object.values(DEFAULT_WEIGHT_CONFIGS);
  }
}

/**
 * Admin function to update or create shipping weight configuration
 */
export async function updateShippingConfiguration(
  productName: string,
  config: Omit<ShippingWeightConfig, 'productName'>
): Promise<ShippingWeightConfig> {
  const updatedConfig = await prisma.shippingConfiguration.upsert({
    where: { productName },
    create: {
      productName,
      baseWeightLb: config.baseWeightLb,
      weightPerUnitLb: config.weightPerUnitLb,
      isActive: config.isActive,
      applicableForNationwideOnly: config.applicableForNationwideOnly,
    },
    update: {
      baseWeightLb: config.baseWeightLb,
      weightPerUnitLb: config.weightPerUnitLb,
      isActive: config.isActive,
      applicableForNationwideOnly: config.applicableForNationwideOnly,
    },
  });

  return {
    productName: updatedConfig.productName,
    baseWeightLb: Number(updatedConfig.baseWeightLb),
    weightPerUnitLb: Number(updatedConfig.weightPerUnitLb),
    isActive: updatedConfig.isActive,
    applicableForNationwideOnly: updatedConfig.applicableForNationwideOnly,
  };
}
