import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';

// Schema for validation
const updateProductTypeSchema = z.object({
  product_type: z.enum(['empanada', 'salsa', 'alfajor', 'other']),
});

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminProfile = await withRetry(
    () => prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    }),
    3,
    'isUserAdmin profile lookup'
  );

  return adminProfile?.role === 'ADMIN';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateProductTypeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { product_type } = validationResult.data;

    // Update the product's product_type
    const updatedProduct = await withRetry(
      () => prisma.product.update({
        where: { id },
        data: {
          productType: product_type,
          updatedAt: new Date(),
        },
      }),
      3,
      'update product type'
    );

    return NextResponse.json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product type:', error);

    // Handle not found error
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
