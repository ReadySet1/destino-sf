// src/app/api/products/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductMappingService } from '@/lib/products/mapping-service';
import { verifyAdminAccess } from '@/lib/auth/admin-guard';
import { logger } from '@/utils/logger';
import { ValidateProductRequestSchema } from '@/types/product-mapping';

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.statusCode });
    }

    logger.info(`🔍 Product validation requested by user: ${adminCheck.user!.email}`);

    const body = await request.json();
    const { productId } = ValidateProductRequestSchema.parse(body);

    const service = new ProductMappingService();
    const issues = await service.validateSingleProduct(productId);

    return NextResponse.json({
      success: true,
      issues,
      isValid: issues.length === 0,
    });
  } catch (error) {
    logger.error('Product validation failed:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
