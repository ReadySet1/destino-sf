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

  // Trust signals (optional fields with defaults)
  trust_signal1_title: z.string().max(100).optional(),
  trust_signal1_desc: z.string().optional(),
  trust_signal1_icon: z.string().max(50).optional(),
  trust_signal1_icon_color: z.string().max(20).optional(),
  trust_signal1_bg_color: z.string().max(20).optional(),

  trust_signal2_title: z.string().max(100).optional(),
  trust_signal2_desc: z.string().optional(),
  trust_signal2_icon: z.string().max(50).optional(),
  trust_signal2_icon_color: z.string().max(20).optional(),
  trust_signal2_bg_color: z.string().max(20).optional(),

  trust_signal3_title: z.string().max(100).optional(),
  trust_signal3_desc: z.string().optional(),
  trust_signal3_icon: z.string().max(50).optional(),
  trust_signal3_icon_color: z.string().max(20).optional(),
  trust_signal3_bg_color: z.string().max(20).optional(),
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

    const {
      product_type,
      badge1,
      badge2,
      badge3,
      icon1,
      icon2,
      icon3,
      bg_color,
      text_color,
      trust_signal1_title,
      trust_signal1_desc,
      trust_signal1_icon,
      trust_signal1_icon_color,
      trust_signal1_bg_color,
      trust_signal2_title,
      trust_signal2_desc,
      trust_signal2_icon,
      trust_signal2_icon_color,
      trust_signal2_bg_color,
      trust_signal3_title,
      trust_signal3_desc,
      trust_signal3_icon,
      trust_signal3_icon_color,
      trust_signal3_bg_color,
    } = validationResult.data;

    // Update the badges for the product type using raw query
    // Only update trust signal fields if they are provided
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
            trust_signal1_title = COALESCE(${trust_signal1_title}, trust_signal1_title),
            trust_signal1_desc = COALESCE(${trust_signal1_desc}, trust_signal1_desc),
            trust_signal1_icon = COALESCE(${trust_signal1_icon}, trust_signal1_icon),
            trust_signal1_icon_color = COALESCE(${trust_signal1_icon_color}, trust_signal1_icon_color),
            trust_signal1_bg_color = COALESCE(${trust_signal1_bg_color}, trust_signal1_bg_color),
            trust_signal2_title = COALESCE(${trust_signal2_title}, trust_signal2_title),
            trust_signal2_desc = COALESCE(${trust_signal2_desc}, trust_signal2_desc),
            trust_signal2_icon = COALESCE(${trust_signal2_icon}, trust_signal2_icon),
            trust_signal2_icon_color = COALESCE(${trust_signal2_icon_color}, trust_signal2_icon_color),
            trust_signal2_bg_color = COALESCE(${trust_signal2_bg_color}, trust_signal2_bg_color),
            trust_signal3_title = COALESCE(${trust_signal3_title}, trust_signal3_title),
            trust_signal3_desc = COALESCE(${trust_signal3_desc}, trust_signal3_desc),
            trust_signal3_icon = COALESCE(${trust_signal3_icon}, trust_signal3_icon),
            trust_signal3_icon_color = COALESCE(${trust_signal3_icon_color}, trust_signal3_icon_color),
            trust_signal3_bg_color = COALESCE(${trust_signal3_bg_color}, trust_signal3_bg_color),
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
        trust_signal1_title: string;
        trust_signal1_desc: string;
        trust_signal1_icon: string;
        trust_signal1_icon_color: string;
        trust_signal1_bg_color: string;
        trust_signal2_title: string;
        trust_signal2_desc: string;
        trust_signal2_icon: string;
        trust_signal2_icon_color: string;
        trust_signal2_bg_color: string;
        trust_signal3_title: string;
        trust_signal3_desc: string;
        trust_signal3_icon: string;
        trust_signal3_icon_color: string;
        trust_signal3_bg_color: string;
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
