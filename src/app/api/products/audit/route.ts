// src/app/api/products/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductMappingService } from '@/lib/products/mapping-service';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info(`🔐 Product audit requested by user: ${user.email}`);
    // TODO: Add admin role check when role system is fully implemented

    const service = new ProductMappingService();
    const auditResult = await service.auditAllMappings();

    return NextResponse.json({
      success: true,
      audit: auditResult,
      summary: {
        total: auditResult.totalProducts,
        valid: auditResult.validProducts,
        invalid: auditResult.invalidProducts,
        criticalIssues: auditResult.issues.filter(i => i.severity === 'ERROR').length,
        warnings: auditResult.issues.filter(i => i.severity === 'WARNING').length
      }
    });

  } catch (error) {
    logger.error('Product audit failed:', error);
    return NextResponse.json(
      { error: 'Audit failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
