import { NextResponse, NextRequest } from 'next/server';
// Remove unused imports
// import { type CookieOptions, createServerClient } from '@supabase/ssr'; 
// import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
// Import the server client utility
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
// Do not use edge runtime with Prisma

export async function GET(request: NextRequest) {
  try {
    // Use the utility to create the Supabase client
    const supabase = await createClient();

    // Use getUser() to securely get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth Error in /api/orders:', authError);
      return NextResponse.json({ error: 'Unauthorized - Authentication failed' }, { status: 401 });
    }

    // Fetch orders using the authenticated user's ID
    const orders = await prisma.order.findMany({
      where: { userId: user.id }, // Use user.id directly
      include: {
        items: {
          include: {
            product: {
              select: { name: true, images: true },
            },
            variant: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching orders:', errorMessage, error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: errorMessage },
      { status: 500 }
    );
  }
}
