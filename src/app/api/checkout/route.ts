import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/square/orders';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { applyStrictRateLimit } from '@/middleware/rate-limit';

// Helper function moved outside the POST handler
async function getSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieList = Array.from(cookieStore.getAll());
          return cookieList.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(_cookies) {
          // Route handlers can't set cookies directly
          // This is just a stub to satisfy the type requirements
        },
      },
    }
  );
}

interface CheckoutRequestBody {
  items: Array<{
    id: string;
    variantId?: string;
    quantity: number;
  }>;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    pickupTime: string;
  };
}

export async function POST(request: Request) {
  // Apply strict rate limiting for checkout endpoint (10 requests per minute per IP)
  const rateLimitResponse = await applyStrictRateLimit(request as any, 10);
  if (rateLimitResponse) {
    console.warn('Checkout rate limit exceeded');
    return rateLimitResponse;
  }

  try {
    // Get the Supabase client
    const supabase = await getSupabaseClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    const { items, customerInfo }: CheckoutRequestBody = await request.json();

    // Validate cart items
    if (!items || !items.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Get product information from Sanity or database
    // This is simplified for this example
    const orderItems = items.map(item => ({
      productId: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      price: 0, // You'd calculate this based on your actual product data
    }));

    // Calculate total
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create order in database
    const order = await prisma.order.create({
      data: {
        status: 'PENDING',
        total,
        userId: user?.id,
        customerName: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        pickupTime: new Date(customerInfo.pickupTime),
        items: {
          create: orderItems,
        },
      },
    });

    // Create order in Square
    // This is simplified - you'd map your products to Square catalog items
    const squareOrder = await createOrder({
      locationId: process.env.SQUARE_LOCATION_ID!,
      lineItems: items.map(item => ({
        quantity: String(item.quantity),
        catalogObjectId: item.id, // This should be the Square catalog ID
      })),
    });

    // Update our order with Square order ID
    await prisma.order.update({
      where: { id: order.id },
      data: { squareOrderId: squareOrder.id },
    });

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
