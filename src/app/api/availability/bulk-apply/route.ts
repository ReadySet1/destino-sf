import { NextRequest, NextResponse } from 'next/server';
import { type AvailabilityApiResponse, type AvailabilityRule } from '@/types/availability';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { logger } from '@/utils/logger';
import { withDatabaseConnection } from '@/lib/db-utils';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';

/**
 * POST /api/availability/bulk-apply
 * Apply a rule to multiple products (creates new rules or updates existing ones)
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
    const { templateRuleId, productIds, enabled } = body;

    if (!templateRuleId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'templateRuleId and productIds array are required',
        },
        { status: 400 }
      );
    }

    const result = await withDatabaseConnection(async () => {
      // Get the template rule
      const templateRule = await AvailabilityQueries.getRuleById(templateRuleId);
      if (!templateRule) {
        throw new Error('Template rule not found');
      }

      const updatedRules: AvailabilityRule[] = [];
      const createdRules: AvailabilityRule[] = [];

      // For each product, either update existing rule or create new one
      for (const productId of productIds) {
        // Check if product already has a rule with this name
        const existingRules = await AvailabilityQueries.getProductRules(productId);
        const existingRule = existingRules.find(r => r.name === templateRule.name);

        if (existingRule) {
          // Update existing rule
          const updated = await AvailabilityQueries.updateRule(
            existingRule.id!,
            { enabled: enabled ?? !existingRule.enabled },
            authResult.user!.id
          );
          updatedRules.push(updated);
        } else {
          // Create new rule for this product
          const newRule = await AvailabilityQueries.createRule(
            {
              productId,
              name: templateRule.name,
              enabled: enabled ?? true,
              priority: templateRule.priority,
              ruleType: templateRule.ruleType,
              state: templateRule.state,
              startDate: templateRule.startDate,
              endDate: templateRule.endDate,
              seasonalConfig: templateRule.seasonalConfig,
              timeRestrictions: templateRule.timeRestrictions,
              preOrderSettings: templateRule.preOrderSettings,
              viewOnlySettings: templateRule.viewOnlySettings,
              overrideSquare: templateRule.overrideSquare,
            },
            authResult.user!.id
          );
          createdRules.push(newRule);
        }
      }

      return {
        updated: updatedRules.length,
        created: createdRules.length,
        total: updatedRules.length + createdRules.length,
        rules: [...updatedRules, ...createdRules],
      };
    });

    logger.info('Bulk applied availability rule', {
      templateRuleId,
      productCount: productIds.length,
      updated: result.updated,
      created: result.created,
      userId: authResult.user!.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in POST /api/availability/bulk-apply', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk apply rule',
      },
      { status: 500 }
    );
  }
}
