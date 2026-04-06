// src/app/api/products/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductMappingService } from '@/lib/products/mapping-service';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.statusCode });
    }

    logger.info(`🔐 Product audit requested by user: ${adminCheck.user!.email}`);

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
        warnings: auditResult.issues.filter(i => i.severity === 'WARNING').length,
      },
    });
  } catch (error) {
    logger.error('Product audit failed:', error);
    return NextResponse.json(
      { error: 'Audit failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
