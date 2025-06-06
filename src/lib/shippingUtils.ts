import { prisma } from '@/lib/prisma';

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
export async function getShippingWeightConfig(productType: string): Promise<ShippingWeightConfig | null> {
  try {
    // Try to get from database first
    const dbConfig = await prisma.shippingConfiguration.findFirst({
      where: {
        productName: productType,
        isActive: true,
      },
    });

    if (dbConfig) {
      return {
        productName: dbConfig.productName,
        baseWeightLb: Number(dbConfig.baseWeightLb),
        weightPerUnitLb: Number(dbConfig.weightPerUnitLb),
        isActive: dbConfig.isActive,
        applicableForNationwideOnly: dbConfig.applicableForNationwideOnly,
      };
    }

    // Fall back to default configurations
    return DEFAULT_WEIGHT_CONFIGS[productType] || null;
  } catch (error) {
    console.error('Error fetching shipping weight config:', error);
    // Fall back to default configurations
    return DEFAULT_WEIGHT_CONFIGS[productType] || null;
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
        totalWeight += totalQuantity * DEFAULT_PRODUCT_WEIGHT_LB;
        continue;
      }
      
      // Use configured weight calculation
      if (totalQuantity > 0) {
        // Base weight for first unit + additional weight for extra units
        const additionalUnits = Math.max(0, totalQuantity - 1);
        const productWeight = weightConfig.baseWeightLb + (additionalUnits * weightConfig.weightPerUnitLb);
        totalWeight += productWeight;
      }
    } else {
      // Use default weight for products without specific configuration
      totalWeight += totalQuantity * DEFAULT_PRODUCT_WEIGHT_LB;
    }
  }

  // Ensure minimum weight for shipping (most carriers require at least 0.5 lb for small packages)
  return Math.max(totalWeight, 0.5);
}

/**
 * Admin function to get all shipping weight configurations
 */
export async function getAllShippingConfigurations(): Promise<ShippingWeightConfig[]> {
  try {
    const dbConfigs = await prisma.shippingConfiguration.findMany({
      orderBy: { productName: 'asc' },
    });

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