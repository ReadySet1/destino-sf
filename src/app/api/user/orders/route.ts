import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';
import type { Prisma } from '@prisma/client';

// Define the structure for regular orders
type RegularOrder = Prisma.OrderGetPayload<{
  select: {
    id: true;
    createdAt: true;
    status: true;
    total: true;
    paymentStatus: true;
    trackingNumber: true;
    shippingCarrier: true;
    items: {
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

// Define the structure for catering orders
type CateringOrderData = Prisma.CateringOrderGetPayload<{
  select: {
    id: true;
    createdAt: true;
    status: true;
    totalAmount: true;
    paymentStatus: true;
    eventDate: true;
    numberOfPeople: true;
    items: {
      select: {
        id: true;
        quantity: true;
        pricePerUnit: true;
        totalPrice: true;
        itemName: true;
        itemType: true;
      };
    };
  };
}>;

// Unified order interface for the response
export interface UserOrder {
  id: string;
  createdAt: Date | string;
  status: string;
  total: number;
  paymentStatus: string;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  type: 'regular' | 'catering';
  eventDate?: Date | string | null;
  numberOfPeople?: number | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    product?: { name: string } | null;
    variant?: { name: string } | null;
    name?: string; // For catering items
  }[];
}

export async function GET(request: Request) {
  try {
    // Get user from middleware headers to avoid extra auth call
    const headers = new Headers(request.headers);
    const userId = headers.get('X-User-ID');
    
    if (!userId) {
      // Fallback to Supabase auth if headers not available
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('API Auth Error:', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      return await fetchUserOrders(user.id);
    }

    return await fetchUserOrders(userId);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: errorMessage },
      { status: 500 }
    );
  }
}

async function fetchUserOrders(userId: string) {
  console.log('API Route: Querying orders for User ID:', userId);

  // Handle build time or database unavailability
  if (isBuildTime()) {
    console.log('🔧 Build-time detected: Returning empty orders array');
    return NextResponse.json([]);
  }

  try {
    // Use a single optimized query with minimal data selection
    const [regularOrders, cateringOrders] = await Promise.all([
    withRetry(() => 
      prisma.order.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          status: true,
          total: true,
          paymentStatus: true,
          trackingNumber: true,
          shippingCarrier: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: { select: { name: true } },
              variant: { select: { name: true } },
            },
            take: 3, // Limit items for faster loading
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20, // Limit orders for faster response
      }),
      3,
      'user-orders'
    ),
    
    withRetry(() => 
      prisma.cateringOrder.findMany({
        where: { customerId: userId },
        select: {
          id: true,
          createdAt: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          eventDate: true,
          numberOfPeople: true,
          items: {
            select: {
              id: true,
              quantity: true,
              pricePerUnit: true,
              itemName: true,
              itemType: true,
            },
            take: 3, // Limit items for faster loading
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20, // Limit orders for faster response
      }),
      3,
      'user-catering-orders'
    )
  ]);

  // Simplified transformation
  const allOrders: UserOrder[] = [
    ...regularOrders.map(order => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status || 'UNKNOWN',
      total: Number(order.total) || 0,
      paymentStatus: order.paymentStatus || 'UNKNOWN',
      trackingNumber: order.trackingNumber,
      shippingCarrier: order.shippingCarrier,
      type: 'regular' as const,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price) || 0,
        product: item.product,
        variant: item.variant,
      })),
    })),
    ...cateringOrders.map(order => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status || 'UNKNOWN',
      total: Number(order.totalAmount) || 0,
      paymentStatus: order.paymentStatus || 'UNKNOWN',
      type: 'catering' as const,
      eventDate: order.eventDate,
      numberOfPeople: order.numberOfPeople,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.pricePerUnit) || 0,
        name: item.itemName,
      })),
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  console.log(
    `API Route: Found ${regularOrders.length} regular orders and ${cateringOrders.length} catering orders for User ID: ${userId}`
  );

    return NextResponse.json(allOrders);
  } catch (error) {
    console.error('❌ Failed to fetch user orders:', error);
    
    // Check if it's a connection error
    const isConnectionError = 
      error instanceof Error && (
        error.message.includes("Can't reach database server") ||
        error.message.includes('Connection terminated') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ECONNREFUSED')
      );

    if (isConnectionError) {
      console.log('🔄 Database connection failed for user orders, returning empty array');
      return NextResponse.json([]);
    }

    // For non-connection errors, re-throw
    throw error;
  }
}

// Optional: Define explicit types for request and response if needed
// export type GetUserOrdersResponse = UserOrder[] | { error: string; details?: string };

