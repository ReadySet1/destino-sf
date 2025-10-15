import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  type AvailabilityRule,
  type AvailabilityApiResponse,
  type SquareAvailabilityMigration,
  AvailabilityState,
  RuleType,
} from '@/types/availability';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityScheduler } from '@/lib/availability/scheduler';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { withDatabaseConnection } from '@/lib/db-utils';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';

/**
 * POST /api/availability/migrate
 * Migrate products from Square-based availability to native system
 */
export async function POST(request: NextRequest): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.statusCode }
      );
    }

    const body = await request.json();
    const { productIds, dryRun = false } = body;

    // Get products to migrate
    const products = await prisma.product.findMany({
      where: productIds ? { id: { in: productIds } } : {},
      select: {
        id: true,
        name: true,
        squareId: true,
        visibility: true,
        isAvailable: true,
        isPreorder: true,
        preorderStartDate: true,
        preorderEndDate: true,
        availabilityStart: true,
        availabilityEnd: true,
        itemState: true,
        availabilityMeta: true,
      },
    });

    const migrations: SquareAvailabilityMigration[] = [];
    const createdRules: AvailabilityRule[] = [];

    for (const product of products) {
      const migration = await generateMigrationPlan(product);
      migrations.push(migration);

      // Create rules if not dry run
      if (!dryRun && migration.suggestedRules.length > 0) {
        for (const ruleData of migration.suggestedRules) {
          try {
            const rule = await AvailabilityQueries.createRule(
              {
                ...ruleData,
                productId: product.id,
                overrideSquare: true,
              } as Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>,
              authResult.user!.id
            );

            createdRules.push(rule);

            // Schedule any automated changes
            await AvailabilityScheduler.scheduleRuleChanges(rule);
          } catch (error) {
            logger.error('Failed to create migration rule', {
              productId: product.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Update migration status
        migration.migrationStatus = 'completed';
      }
    }

    logger.info('Availability migration completed', {
      productsProcessed: products.length,
      rulesCreated: createdRules.length,
      dryRun,
      userId: authResult.user!.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        migrations,
        rulesCreated: createdRules.length,
        dryRun,
      },
    });
  } catch (error) {
    logger.error('Error in POST /api/availability/migrate', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/availability/migrate
 * Get migration analysis for products
 */
export async function GET(request: NextRequest): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const productIds = searchParams.get('productIds')?.split(',');

    // Get products with Square-based availability settings
    const products = await prisma.product.findMany({
      where: {
        ...(productIds ? { id: { in: productIds } } : {}),
        OR: [
          { isPreorder: true },
          { visibility: { not: 'PUBLIC' } },
          { isAvailable: false },
          { preorderStartDate: { not: null } },
          { preorderEndDate: { not: null } },
          { availabilityStart: { not: null } },
          { availabilityEnd: { not: null } },
        ],
      },
      include: {
        availabilityRules: {
          where: { deletedAt: null },
        },
      },
    });

    const analysis = {
      totalProducts: products.length,
      productsWithRules: products.filter(p => p.availabilityRules.length > 0).length,
      productsMigratable: products.filter(p => p.availabilityRules.length === 0).length,
      breakdown: {
        preorderProducts: products.filter(p => p.isPreorder).length,
        hiddenProducts: products.filter(p => p.visibility !== 'PUBLIC').length,
        unavailableProducts: products.filter(p => !p.isAvailable).length,
        dateRestrictedProducts: products.filter(
          p => p.availabilityStart || p.availabilityEnd || p.preorderStartDate || p.preorderEndDate
        ).length,
      },
    };

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Error in GET /api/availability/migrate', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze migration',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate migration plan for a product
 */
async function generateMigrationPlan(product: any): Promise<SquareAvailabilityMigration> {
  const suggestedRules: Partial<AvailabilityRule>[] = [];

  // Check if product is hidden
  if (product.visibility !== 'PUBLIC') {
    suggestedRules.push({
      name: 'Migrated: Hidden Product',
      ruleType: RuleType.CUSTOM,
      state: AvailabilityState.HIDDEN,
      priority: 100,
      enabled: true,
    });
  }

  // Check if product is unavailable
  if (!product.isAvailable) {
    suggestedRules.push({
      name: 'Migrated: Unavailable Product',
      ruleType: RuleType.CUSTOM,
      state: AvailabilityState.VIEW_ONLY,
      priority: 90,
      enabled: true,
      viewOnlySettings: {
        message: 'Currently unavailable',
        showPrice: true,
        allowWishlist: true,
        notifyWhenAvailable: true,
      },
    });
  }

  // Check for pre-order settings
  if (product.isPreorder) {
    const rule: Partial<AvailabilityRule> = {
      name: 'Migrated: Pre-order',
      ruleType: RuleType.DATE_RANGE,
      state: AvailabilityState.PRE_ORDER,
      priority: 80,
      enabled: true,
      preOrderSettings: {
        message: 'Available for pre-order',
        expectedDeliveryDate: product.preorderStartDate
          ? new Date(product.preorderStartDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Use preorder start date or 1 week from now
        depositRequired: false,
        maxQuantity: null,
        depositAmount: null,
      },
    };

    if (product.preorderStartDate) {
      rule.startDate = product.preorderStartDate;
    }
    if (product.preorderEndDate) {
      rule.endDate = product.preorderEndDate;
    }

    suggestedRules.push(rule);
  }

  // Check for general availability dates
  if (product.availabilityStart || product.availabilityEnd) {
    suggestedRules.push({
      name: 'Migrated: Date Range Availability',
      ruleType: RuleType.DATE_RANGE,
      state: AvailabilityState.AVAILABLE,
      priority: 70,
      enabled: true,
      startDate: product.availabilityStart,
      endDate: product.availabilityEnd,
    });
  }

  return {
    productId: product.id,
    squareData: {
      isHidden: product.visibility !== 'PUBLIC',
      isPreorder: product.isPreorder,
      preorderStartDate: product.preorderStartDate,
      preorderEndDate: product.preorderEndDate,
    },
    suggestedRules,
    migrationStatus: 'pending',
  };
}
