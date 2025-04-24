import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Corrected import
import { prisma } from '@/lib/prisma'; // Adjust path if needed
import { cookies } from 'next/headers';
import type { Prisma } from '@prisma/client';

// Define the structure of the order data we want to return
export type UserOrder = Prisma.OrderGetPayload<{
  select: {
    id: true;
    createdAt: true;
    status: true;
    total: true;
    paymentStatus: true;
    // Add other fields you want to display
    items: { // Include items if needed for display
      select: {
        id: true;
        quantity: true;
        price: true;
        product: { select: { name: true } };
        variant: { select: { name: true } };
      };
    };
  };
}>;

export async function GET() {
  const supabase = await createClient();

  try {
    // 1. Get the current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('API Auth Error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('API Route: Querying orders for User ID:', user.id);

    // 2. Fetch orders for the authenticated user
    const orders: UserOrder[] = await prisma.order.findMany({
      where: {
        userId: user.id, // Assuming your Order model has a userId field
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        total: true,
        paymentStatus: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: { select: { name: true } },
            variant: { select: { name: true } },
          },
        },
        // Add other fields as needed
      },
      orderBy: {
        createdAt: 'desc', // Show newest orders first
      },
    });

    console.log(`API Route: Found ${orders.length} orders for User ID: ${user.id}`);

    return NextResponse.json(orders);

  } catch (error) {
    console.error('Error fetching user orders:', error);
    // Type guard for better error handling
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Failed to fetch orders', details: errorMessage }, { status: 500 });
  }
}

// Optional: Define explicit types for request and response if needed
// export type GetUserOrdersResponse = UserOrder[] | { error: string; details?: string }; 