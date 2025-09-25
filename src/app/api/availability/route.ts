import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  AvailabilityRuleSchema, 
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
 * GET /api/availability
 * Get availability rules with optional filtering
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
    const productId = searchParams.get('productId');
    const productIds = searchParams.get('productIds')?.split(',');

    let rules: AvailabilityRule[] = [];

    if (productId) {
      rules = await AvailabilityQueries.getProductRules(productId);
    } else if (productIds && productIds.length > 0) {
      const ruleMap = await AvailabilityQueries.getMultipleProductRules(productIds);
      rules = Array.from(ruleMap.values()).flat();
    } else {
      // Get all rules (for admin management) if no specific products requested
      rules = await AvailabilityQueries.getAllRules();
    }

    logger.info('Retrieved availability rules via API', {
      userId: authResult.user!.id,
      rulesCount: rules.length,
      productId,
      productIds: productIds?.length
    });

    return NextResponse.json({ 
      success: true, 
      data: rules 
    });
  } catch (error) {
    logger.error('Error in GET /api/availability', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve availability rules' 
    }, { status: 500 });
  }
}

/**
 * POST /api/availability
 * Create a new availability rule
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

    const body = await request.json();
    
    // Validate the rule data
    const validation = AvailabilityValidators.validateRule(body);
    if (!validation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      }, { status: 400 });
    }

    const validated = AvailabilityRuleSchema.parse(body);

    const result = await withDatabaseConnection(async () => {
      return await AvailabilityQueries.createRule(
        validated as Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>,
        authResult.user!.id
      );
    });

    // Schedule any automated state changes
    if (result.id) {
      await AvailabilityScheduler.scheduleRuleChanges(result);
    }

    logger.info('Created availability rule via API', {
      ruleId: result.id,
      productId: result.productId,
      userId: authResult.user!.id
    });

    return NextResponse.json({ 
      success: true, 
      data: result 
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/availability', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create availability rule' 
    }, { status: 500 });
  }
}

/**
 * PUT /api/availability
 * Update an existing availability rule
 */
export async function PUT(request: NextRequest): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.statusCode });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rule ID is required for updates' 
      }, { status: 400 });
    }

    // Validate the updates
    const validation = AvailabilityValidators.validateRule(updates);
    if (!validation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      }, { status: 400 });
    }

    const result = await withDatabaseConnection(async () => {
      return await AvailabilityQueries.updateRule(id, updates, authResult.user!.id);
    });

    // Reschedule automated state changes
    await AvailabilityScheduler.scheduleRuleChanges(result);

    logger.info('Updated availability rule via API', {
      ruleId: id,
      userId: authResult.user!.id,
      changes: Object.keys(updates)
    });

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    logger.error('Error in PUT /api/availability', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update availability rule' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/availability
 * Delete an availability rule
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.statusCode });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rule ID is required' 
      }, { status: 400 });
    }

    await withDatabaseConnection(async () => {
      await AvailabilityQueries.deleteRule(ruleId, authResult.user!.id);
    });

    logger.info('Deleted availability rule via API', {
      ruleId,
      userId: authResult.user!.id
    });

    return NextResponse.json({ 
      success: true 
    });
  } catch (error) {
    logger.error('Error in DELETE /api/availability', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete availability rule' 
    }, { status: 500 });
  }
}
