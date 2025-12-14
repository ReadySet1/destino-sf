import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/square/orders';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma, withRetry } from '@/lib/db-unified';
import { applyStrictRateLimit } from '@/middleware/rate-limit';
import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';
import { syncCustomerToProfile } from '@/lib/profile-sync';
// DES-60 Phase 4: Duplicate order prevention and request deduplication
import { checkForDuplicateOrder } from '@/lib/duplicate-order-prevention';
import { globalDeduplicator, userKey } from '@/lib/concurrency/request-deduplicator';

// DES-81: Increase function timeout for database connection resilience
export const maxDuration = 60;

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
  // Idempotency key for duplicate prevention (frontend-generated UUID)
  idempotencyKey?: string;
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { items, customerInfo, idempotencyKey }: CheckoutRequestBody = await request.json();

    // Validate cart items
    if (!items || !items.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // DES-60 Phase 4: Deduplicate concurrent checkout requests
    const deduplicationKey = userKey(
      user?.id || customerInfo.email,
      'checkout',
      JSON.stringify(items)
    );

    return await globalDeduplicator.deduplicate(deduplicationKey, async () => {
      // DES-60 Phase 4: Check for duplicate orders BEFORE creating
      const duplicateCheck = await checkForDuplicateOrder(
        user?.id || null,
        items.map(item => ({
          id: item.id,
          variantId: item.variantId,
          quantity: item.quantity,
          name: '', // Not needed for duplicate check
          price: 0,
        })),
        customerInfo.email
      );

      if (duplicateCheck.hasPendingOrder && duplicateCheck.existingOrder) {
        console.warn('[Checkout] Duplicate order detected, returning existing order', {
          userId: user?.id,
          email: customerInfo.email,
          existingOrderId: duplicateCheck.existingOrderId,
        });

        return NextResponse.json(
          {
            error: 'Duplicate order detected',
            message:
              'You already have a pending order with these items. Please complete the payment for your existing order or cancel it before creating a new one.',
            existingOrder: duplicateCheck.existingOrder,
          },
          { status: 409 } // 409 Conflict
        );
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

      // Create order in database with connection management and idempotency
      let order;
      try {
        order = await withRetry(() =>
          prisma.order.create({
            data: {
              status: 'PENDING',
              total,
              userId: user?.id,
              customerName: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone,
              pickupTime: new Date(customerInfo.pickupTime),
              idempotencyKey: idempotencyKey || undefined, // Database-level duplicate prevention
              items: {
                create: orderItems,
              },
            },
            include: {
              items: true,
            },
          })
        );
      } catch (createError: any) {
        // Handle unique constraint violation on idempotencyKey (P2002)
        if (createError?.code === 'P2002' && idempotencyKey) {
          console.log('[Checkout] Idempotency key collision, returning existing order', {
            idempotencyKey,
            email: customerInfo.email,
          });

          // Return the existing order with this idempotency key
          const existingOrder = await prisma.order.findFirst({
            where: { idempotencyKey },
            include: { items: true },
          });

          if (existingOrder) {
            return NextResponse.json({
              orderId: existingOrder.id,
              message: 'Order already created with this idempotency key',
              existing: true,
            });
          }
        }
        // Re-throw if not an idempotency collision
        throw createError;
      }

      // Sync customer information to profile (async, non-blocking)
      syncCustomerToProfile(user?.id, {
        email: customerInfo.email,
        name: customerInfo.name,
        phone: customerInfo.phone,
      }).catch(error => {
        console.error('Failed to sync customer data to profile:', error);
        // Don't fail the order if profile sync fails
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

      // Update our order with Square order ID with connection management
      await withRetry(
        () =>
          prisma.order.update({
            where: { id: order.id },
            data: { squareOrderId: squareOrder.id },
          }),
        3,
        'update'
      );

      return NextResponse.json({ orderId: order.id });
    }); // End of deduplicator callback
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
