import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
// Do not use edge runtime with Prisma

export async function GET(request: Request) {
  try {
    // Create a new Prisma client instance for this request
    const prisma = new PrismaClient();
    
    // Get the Supabase client
    const cookieStore = await cookies();
    
    const supabase =createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieList = Array.from(cookieStore.getAll());
            return cookieList.map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll(_cookies) {
            // Route handlers can't set cookies directly
            // This is just a stub to satisfy the type requirements
          }
        }
      }
    );
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Ensure the requested userId matches the authenticated user
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Fetch orders for the user
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Close the Prisma connection
    await prisma.$disconnect();
    
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
