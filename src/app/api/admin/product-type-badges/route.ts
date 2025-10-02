import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';

// Schema for validation
const updateBadgesSchema = z.object({
  product_type: z.enum(['empanada', 'salsa', 'alfajor', 'other']),
  badge1: z.string().min(1).max(100, 'Badge 1 must be 100 characters or less'),
  badge2: z.string().min(1).max(100, 'Badge 2 must be 100 characters or less'),
  badge3: z.string().max(100, 'Badge 3 must be 100 characters or less').nullable().optional(),
  icon1: z.string().max(50, 'Icon 1 must be 50 characters or less').default('leaf'),
  icon2: z.string().max(50, 'Icon 2 must be 50 characters or less').default('clock'),
  icon3: z.string().max(50, 'Icon 3 must be 50 characters or less').nullable().optional(),
  bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Background color must be a valid hex color'),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Text color must be a valid hex color'),
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const badges = await withRetry(
      () => prisma.productTypeBadges.findMany({
        orderBy: { productType: 'asc' },
      }),
      3,
      'fetch product type badges'
    );

    return NextResponse.json(badges);
  } catch (error) {
    console.error('Error fetching product type badges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = updateBadgesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { product_type, badge1, badge2, badge3, icon1, icon2, icon3, bg_color, text_color } = validationResult.data;

    // Update the badges for the product type using raw query
    await withRetry(
      () => prisma.$executeRaw`
        UPDATE product_type_badges
        SET badge1 = ${badge1},
            badge2 = ${badge2},
            badge3 = ${badge3},
            icon1 = ${icon1},
            icon2 = ${icon2},
            icon3 = ${icon3},
            bg_color = ${bg_color},
            text_color = ${text_color},
            updated_at = NOW()
        WHERE product_type = ${product_type}
      `,
      3,
      'update product type badges'
    );

    // Fetch the updated record
    const result = await withRetry(
      () => prisma.$queryRaw<Array<{
        id: number;
        product_type: string;
        badge1: string;
        badge2: string;
        badge3: string | null;
        icon1: string;
        icon2: string;
        icon3: string | null;
        bg_color: string;
        text_color: string;
        updated_at: Date;
      }>>`
        SELECT * FROM product_type_badges WHERE product_type = ${product_type}
      `,
      3,
      'fetch updated product type badges'
    );

    const updatedBadges = result[0];

    return NextResponse.json({
      success: true,
      data: updatedBadges,
    });
  } catch (error) {
    console.error('Error updating product type badges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
