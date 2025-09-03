import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withPreparedStatementHandling } from '@/lib/db';
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

    // 2. Fetch regular orders for the authenticated user
    const regularOrders: RegularOrder[] = await withPreparedStatementHandling(async () => {
      return await prisma.order.findMany({
        where: {
          userId: user.id,
        },
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
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }, `user-orders-${user.id}`);

    // 3. Fetch catering orders for the authenticated user
    const cateringOrders = await withPreparedStatementHandling(async () => {
      return await prisma.cateringOrder.findMany({
        where: {
          customerId: user.id,
        },
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
              totalPrice: true,
              itemName: true,
              itemType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }, `user-catering-orders-${user.id}`);

    // 4. Transform regular orders to unified format
    const unifiedRegularOrders: UserOrder[] = regularOrders.map(order => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status || 'UNKNOWN',
      total:
        typeof order.total === 'object' && order.total !== null
          ? Number(order.total)
          : Number(order.total) || 0,
      paymentStatus: order.paymentStatus || 'UNKNOWN',
      trackingNumber: order.trackingNumber,
      shippingCarrier: order.shippingCarrier,
      type: 'regular' as const,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price:
          typeof item.price === 'object' && item.price !== null
            ? Number(item.price)
            : Number(item.price) || 0,
        product: item.product,
        variant: item.variant,
      })),
    }));

    // 5. Transform catering orders to unified format
    const unifiedCateringOrders: UserOrder[] = cateringOrders.map(order => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status || 'UNKNOWN',
      total:
        typeof order.totalAmount === 'object' && order.totalAmount !== null
          ? Number(order.totalAmount)
          : Number(order.totalAmount) || 0,
      paymentStatus: order.paymentStatus || 'UNKNOWN',
      type: 'catering' as const,
      eventDate: order.eventDate,
      numberOfPeople: order.numberOfPeople,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price:
          typeof item.pricePerUnit === 'object' && item.pricePerUnit !== null
            ? Number(item.pricePerUnit)
            : Number(item.pricePerUnit) || 0,
        name: item.itemName,
      })),
    }));

    // 6. Combine and sort all orders by creation date
    const allOrders = [...unifiedRegularOrders, ...unifiedCateringOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(
      `API Route: Found ${regularOrders.length} regular orders and ${cateringOrders.length} catering orders for User ID: ${user.id}`
    );

    return NextResponse.json(allOrders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: errorMessage },
      { status: 500 }
    );
  }
}

// Optional: Define explicit types for request and response if needed
// export type GetUserOrdersResponse = UserOrder[] | { error: string; details?: string };
