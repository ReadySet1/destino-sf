import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  type AvailabilityRule,
  type AvailabilityApiResponse,
  type AvailabilityEvaluation 
} from '@/types/availability';
import { AvailabilityEngine } from '@/lib/availability/engine';
import { AvailabilityValidators } from '@/lib/availability/validators';
import { logger } from '@/utils/logger';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';

/**
 * POST /api/availability/preview
 * Preview availability changes without saving
 */
export async function POST(request: NextRequest): Promise<NextResponse<AvailabilityApiResponse<AvailabilityEvaluation>>> {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.statusCode });
    }

    const body = await request.json();
    const { productId, rules, previewDate } = body;

    if (!productId || !Array.isArray(rules)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Product ID and rules array are required' 
      }, { status: 400 });
    }

    // Validate all rules
    for (const rule of rules) {
      const validation = AvailabilityValidators.validateRule(rule);
      if (!validation.isValid) {
        return NextResponse.json({ 
          success: false, 
          error: `Rule validation failed: ${validation.errors.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Run evaluation with preview rules
    const evaluationTime = previewDate ? new Date(previewDate) : new Date();
    const evaluation = await AvailabilityEngine.evaluateProduct(
      productId, 
      rules as AvailabilityRule[], 
      evaluationTime
    );

    // Detect any rule conflicts
    const conflicts = AvailabilityEngine.detectRuleConflicts(rules as AvailabilityRule[]);

    logger.info('Previewed availability changes via API', {
      productId,
      rulesCount: rules.length,
      conflictsFound: conflicts.length,
      userId: authResult.user!.id
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        ...evaluation,
        conflicts
      }
    });
  } catch (error) {
    logger.error('Error in POST /api/availability/preview', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to preview availability changes' 
    }, { status: 500 });
  }
}
