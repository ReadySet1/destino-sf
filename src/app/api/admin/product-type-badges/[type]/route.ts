import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminProfile = await withRetry(
    () =>
      prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
    3,
    'isUserAdmin profile lookup'
  );

  return adminProfile?.role === 'ADMIN';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const supabase = await createClient();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await params;

    // Validate product type
    if (!['empanada', 'salsa', 'alfajor', 'other'].includes(type)) {
      return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
    }

    const badges = await withRetry(
      () =>
        prisma.productTypeBadges.findUnique({
          where: { productType: type },
        }),
      3,
      'fetch product type badges by type'
    );

    if (!badges) {
      return NextResponse.json(
        { error: 'Badges not found for this product type' },
        { status: 404 }
      );
    }

    return NextResponse.json(badges);
  } catch (error) {
    console.error('Error fetching product type badges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
