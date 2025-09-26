import { NextRequest, NextResponse } from 'next/server';
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
 * GET /api/availability/[id]
 * Get a specific availability rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.statusCode });
    }

    const { id } = await params;
    const rule = await AvailabilityQueries.getRuleById(id);
    
    if (!rule) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rule not found' 
      }, { status: 404 });
    }

    logger.info('Retrieved availability rule via API', {
      ruleId: id,
      userId: authResult.user!.id
    });

    return NextResponse.json({ 
      success: true, 
      data: rule 
    });
  } catch (error) {
    logger.error('Error in GET /api/availability/[id]', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve availability rule' 
    }, { status: 500 });
  }
}

/**
 * PUT /api/availability/[id]
 * Update an existing availability rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AvailabilityApiResponse>> {
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
      const { id } = await params;
      return await AvailabilityQueries.updateRule(
        id,
        validated as Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt'>,
        authResult.user!.id
      );
    });

    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rule not found' 
      }, { status: 404 });
    }

    // Update scheduled changes
    if (result.id) {
      await AvailabilityScheduler.scheduleRuleChanges(result);
    }

    logger.info('Updated availability rule via API', {
      ruleId: result.id,
      productId: result.productId,
      userId: authResult.user!.id
    });

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    logger.error('Error in PUT /api/availability/[id]', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update availability rule' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/availability/[id]
 * Delete an availability rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AvailabilityApiResponse>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.statusCode });
    }

    const { id } = await params;
    const result = await withDatabaseConnection(async () => {
      return await AvailabilityQueries.deleteRule(id, authResult.user!.id);
    });

    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rule not found' 
      }, { status: 404 });
    }

    logger.info('Deleted availability rule via API', {
      ruleId: id,
      userId: authResult.user!.id
    });

    return NextResponse.json({ 
      success: true, 
      data: { id } 
    });
  } catch (error) {
    logger.error('Error in DELETE /api/availability/[id]', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete availability rule' 
    }, { status: 500 });
  }
}
