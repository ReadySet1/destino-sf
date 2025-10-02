import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';
import { getShippingWeightConfig } from '@/lib/shippingUtils';

/**
 * Admin verification endpoint for shipping weight configurations
 * GET /api/admin/shipping/verify
 *
 * Returns:
 * - All database shipping configurations
 * - Hardcoded default configurations
 * - Product matching analysis
 * - Warnings for products using default weights
 */
export async function GET() {
  try {
    // Fetch all database configurations
    const databaseConfigs = await prisma.shippingConfiguration.findMany({
      where: { isActive: true },
      orderBy: { productName: 'asc' },
    });

    // Hardcoded defaults from code
    const hardcodedDefaults = [
      {
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
        source: 'HARDCODED',
      },
      {
        productName: 'empanadas',
        baseWeightLb: 1.0,
        weightPerUnitLb: 0.8,
        isActive: true,
        applicableForNationwideOnly: true,
        source: 'HARDCODED',
      },
    ];

    // Fetch all available products
    const products = await prisma.product.findMany({
      where: { isAvailable: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Analyze product matching
    const productMatching = await Promise.all(
      products.map(async (product) => {
        const productType = getProductTypeFromName(product.name);
        const appliedConfig = await getShippingWeightConfig(productType);

        return {
          productId: product.id,
          productName: product.name,
          matchedType: productType,
          appliedConfig: appliedConfig
            ? {
                productName: appliedConfig.productName,
                baseWeightLb: appliedConfig.baseWeightLb,
                weightPerUnitLb: appliedConfig.weightPerUnitLb,
                isActive: appliedConfig.isActive,
                applicableForNationwideOnly: appliedConfig.applicableForNationwideOnly,
              }
            : null,
          source: databaseConfigs.some((c) => c.productName === productType) ? 'DATABASE' : 'HARDCODED',
        };
      })
    );

    // Generate warnings
    const warnings: string[] = [];

    // Count products by type
    const productsByType = productMatching.reduce((acc, p) => {
      acc[p.matchedType] = (acc[p.matchedType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Warning: Products using default weights
    const defaultProducts = productMatching.filter((p) => p.matchedType === 'default');
    if (defaultProducts.length > 0) {
      warnings.push(
        `${defaultProducts.length} products are using 'default' weights. Consider adding specific weight configurations for these product types.`
      );
    }

    // Warning: Missing database configs
    const missingDbConfigs = ['alfajores', 'empanadas', 'default'].filter(
      (type) => !databaseConfigs.some((c) => c.productName === type)
    );
    if (missingDbConfigs.length > 0) {
      warnings.push(
        `Missing database configurations for: ${missingDbConfigs.join(', ')}. Currently using hardcoded defaults.`
      );
    }

    // Warning: Database is completely empty
    if (databaseConfigs.length === 0) {
      warnings.push(
        'CRITICAL: shipping_configurations table is EMPTY! All weights are using hardcoded defaults. Run migration to populate database.'
      );
    }

    // Compare database vs hardcoded
    const configComparison = hardcodedDefaults.map((hardcoded) => {
      const dbConfig = databaseConfigs.find((c) => c.productName === hardcoded.productName);

      return {
        productType: hardcoded.productName,
        hardcodedConfig: {
          baseWeightLb: hardcoded.baseWeightLb,
          weightPerUnitLb: hardcoded.weightPerUnitLb,
        },
        databaseConfig: dbConfig
          ? {
              baseWeightLb: Number(dbConfig.baseWeightLb),
              weightPerUnitLb: Number(dbConfig.weightPerUnitLb),
            }
          : null,
        status: dbConfig
          ? Number(dbConfig.baseWeightLb) === hardcoded.baseWeightLb &&
            Number(dbConfig.weightPerUnitLb) === hardcoded.weightPerUnitLb
            ? 'MATCHES'
            : 'DIFFERS'
          : 'MISSING_FROM_DB',
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalProducts: products.length,
        totalDatabaseConfigs: databaseConfigs.length,
        totalHardcodedDefaults: hardcodedDefaults.length,
        productsByType,
        warningCount: warnings.length,
      },
      databaseConfigs: databaseConfigs.map((c) => ({
        id: c.id,
        productName: c.productName,
        baseWeightLb: Number(c.baseWeightLb),
        weightPerUnitLb: Number(c.weightPerUnitLb),
        isActive: c.isActive,
        applicableForNationwideOnly: c.applicableForNationwideOnly,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      hardcodedDefaults,
      configComparison,
      productMatching: productMatching.slice(0, 50), // Limit to first 50 for readability
      defaultProducts: defaultProducts.map((p) => ({
        name: p.productName,
        id: p.productId,
      })),
      warnings,
    });
  } catch (error) {
    console.error('Error in shipping verification endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to determine product type from name
 * (duplicated from shippingUtils to avoid circular dependencies)
 */
function getProductTypeFromName(productName: string): string {
  const name = productName.toLowerCase().trim();

  if (name.includes('alfajor')) {
    return 'alfajores';
  }

  if (name.includes('empanada')) {
    return 'empanadas';
  }

  return 'default';
}
