import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  type BulkAvailabilityRequest,
  type AvailabilityRule,
  type AvailabilityApiResponse 
} from '@/types/availability';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityValidators } from '@/lib/availability/validators';
import { AvailabilityScheduler } from '@/lib/availability/scheduler';
import { logger } from '@/utils/logger';
import { withDatabaseConnection } from '@/lib/db-utils';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';

/**
 * POST /api/availability/bulk
 * Perform bulk operations on availability rules
 */
export async function POST(request: NextRequest): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.statusCode });
    }

    const body: BulkAvailabilityRequest = await request.json();
    
    // Validate the bulk request
    const validation = AvailabilityValidators.validateBulkRequest(body);
    if (!validation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      }, { status: 400 });
    }

    let result: any;

    await withDatabaseConnection(async () => {
      switch (body.operation) {
        case 'create':
          // Create rules for each product
          const createRules = body.productIds.flatMap(productId =>
            body.rules.map(rule => ({ 
              ...rule, 
              productId,
              id: undefined // Remove any existing IDs
            }))
          );

          // Validate each rule
          for (const rule of createRules) {
            const ruleValidation = AvailabilityValidators.validateRule(rule);
            if (!ruleValidation.isValid) {
              throw new Error(`Rule validation failed: ${ruleValidation.errors.join(', ')}`);
            }
          }

          result = await AvailabilityQueries.bulkCreateRules(
            createRules as Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>[],
            authResult.user!.id
          );
          break;

        case 'update':
          // Validate each rule update
          for (const rule of body.rules) {
            if (!rule.id) {
              throw new Error('Rule ID is required for updates');
            }
            const ruleValidation = AvailabilityValidators.validateRule(rule);
            if (!ruleValidation.isValid) {
              throw new Error(`Rule validation failed: ${ruleValidation.errors.join(', ')}`);
            }
          }

          const updateData = body.rules.map(rule => ({
            id: rule.id!,
            data: rule
          }));
          result = await AvailabilityQueries.bulkUpdateRules(updateData, authResult.user!.id);
          break;

        case 'delete':
          const ruleIds = body.rules.map(rule => rule.id!).filter(Boolean);
          if (ruleIds.length === 0) {
            throw new Error('No valid rule IDs provided for deletion');
          }
          await AvailabilityQueries.bulkDeleteRules(ruleIds, authResult.user!.id);
          result = { deletedCount: ruleIds.length };
          break;

        default:
          throw new Error('Invalid operation');
      }
    });

    // Schedule changes for created/updated rules
    if (body.operation !== 'delete' && Array.isArray(result)) {
      for (const rule of result) {
        try {
          await AvailabilityScheduler.scheduleRuleChanges(rule);
        } catch (scheduleError) {
          logger.warn('Failed to schedule rule changes', {
            ruleId: rule.id,
            error: scheduleError instanceof Error ? scheduleError.message : 'Unknown error'
          });
        }
      }
    }

    logger.info('Bulk availability operation completed via API', {
      operation: body.operation,
      productCount: body.productIds.length,
      rulesCount: body.rules.length,
      userId: authResult.user!.id
    });

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    logger.error('Error in POST /api/availability/bulk', {
      operation: (request as any).operation,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Bulk operation failed' 
    }, { status: 500 });
  }
}

/**
 * GET /api/availability/bulk
 * Get bulk operation status or templates
 */
export async function GET(request: NextRequest): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.statusCode });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'templates':
        // Return bulk operation templates
        const templates = {
          preOrder: {
            name: 'Pre-order Rule',
            ruleType: 'date_range',
            state: 'pre_order',
            preOrderSettings: {
              message: 'Available for pre-order',
              depositRequired: false
            }
          },
          seasonal: {
            name: 'Seasonal Rule',
            ruleType: 'seasonal',
            state: 'available',
            seasonalConfig: {
              yearly: true,
              timezone: 'America/Los_Angeles'
            }
          },
          hiddenWeekends: {
            name: 'Hide on Weekends',
            ruleType: 'time_based',
            state: 'hidden',
            timeRestrictions: {
              daysOfWeek: [0, 6], // Sunday and Saturday
              timezone: 'America/Los_Angeles'
            }
          }
        };

        return NextResponse.json({ 
          success: true, 
          data: templates 
        });

      case 'statistics':
        // Return bulk operation statistics
        const stats = await AvailabilityQueries.getRuleStatistics();
        return NextResponse.json({ 
          success: true, 
          data: stats 
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action parameter' 
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error in GET /api/availability/bulk', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process bulk request' 
    }, { status: 500 });
  }
}
