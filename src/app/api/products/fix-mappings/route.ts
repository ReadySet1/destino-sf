// src/app/api/products/fix-mappings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductMappingService } from '@/lib/products/mapping-service';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const FixMappingsSchema = z.object({
  auditResult: z.object({
    timestamp: z.string().transform(str => new Date(str)), // Allow string input, convert to Date
    totalProducts: z.number(),
    validProducts: z.number(),
    invalidProducts: z.number(),
    issues: z.array(z.any()),
    recommendations: z.array(z.string()),
    fixApplied: z.boolean(),
  }),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.statusCode });
    }

    logger.info(`🔧 Product mapping fix requested by user: ${adminCheck.user!.email}`);

    const body = await request.json();
    const { auditResult, dryRun } = FixMappingsSchema.parse(body);

    const service = new ProductMappingService();

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run completed',
        wouldFix: auditResult.issues.filter(i => i.severity === 'ERROR').length,
        issues: auditResult.issues,
      });
    }

    // Apply fixes
    await service.fixMappings(auditResult);

    // Run audit again to verify fixes
    const verificationAudit = await service.auditAllMappings();

    return NextResponse.json({
      success: true,
      message: 'Mappings fixed successfully',
      before: {
        invalid: auditResult.invalidProducts,
        issues: auditResult.issues.length,
      },
      after: {
        invalid: verificationAudit.invalidProducts,
        issues: verificationAudit.issues.length,
      },
      fixed: auditResult.invalidProducts - verificationAudit.invalidProducts,
    });
  } catch (error) {
    logger.error('Fix mappings failed:', error);
    return NextResponse.json(
      {
        error: 'Fix operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
