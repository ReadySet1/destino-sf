import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';
import { applyUserBasedRateLimit } from '@/middleware/rate-limit';

const MAX_RETRY_ATTEMPTS = 3;
const CHECKOUT_URL_EXPIRY_HOURS = 24;

export async function POST(request: NextRequest, { params }: { params: any }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply user-based rate limiting for order retry endpoint (3 requests per minute per user)
    const rateLimitResponse = await applyUserBasedRateLimit(request, user.id, {
      config: { id: 'order-retry', limit: 3, window: 60 * 1000, prefix: 'order_retry_rl' },
    });
    if (rateLimitResponse) {
      console.warn(`Order retry rate limit exceeded for user ${user.id}`);
      return rateLimitResponse;
    }

    const { orderId } = await params;

    // Fetch order with validation
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: user.id, // Ensure user owns the order
        status: { in: ['PENDING', 'PAYMENT_FAILED'] },
        paymentMethod: 'SQUARE', // Only allow retries for Square payments
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found, not eligible for retry, or uses cash payment method' },
        { status: 404 }
      );
    }

    // Additional check for payment method (extra safety)
    if (order.paymentMethod !== 'SQUARE') {
      return NextResponse.json(
        { error: 'Payment retry is only available for credit card orders' },
        { status: 400 }
      );
    }

    // Check retry limits
    if (order.retryCount >= MAX_RETRY_ATTEMPTS) {
      return NextResponse.json({ error: 'Maximum retry attempts exceeded' }, { status: 429 });
    }

    // Check if existing URL is still valid
    if (order.paymentUrl && order.paymentUrlExpiresAt && order.paymentUrlExpiresAt > new Date()) {
      return NextResponse.json({
        success: true,
        checkoutUrl: order.paymentUrl,
        expiresAt: order.paymentUrlExpiresAt,
      });
    }

    // Create new Square checkout session
    const squareResult = await createSquareCheckoutSession({
      orderId: order.id,
      orderItems: order.items,
      customerInfo: {
        name: order.customerName,
        email: order.email,
        phone: order.phone,
      },
      total: order.total,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=cancelled`,
    });

    if (!squareResult.success || !squareResult.checkoutUrl) {
      return NextResponse.json(
        { error: squareResult.error || 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    // Update order with new checkout URL and retry info
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CHECKOUT_URL_EXPIRY_HOURS);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentUrl: squareResult.checkoutUrl,
        paymentUrlExpiresAt: expiresAt,
        retryCount: order.retryCount + 1,
        lastRetryAt: new Date(),
        status: 'PENDING', // Reset to pending for new attempt
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: squareResult.checkoutUrl,
      expiresAt,
      retryAttempt: order.retryCount + 1,
    });
  } catch (error) {
    console.error('Error in retry payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create Square checkout session
async function createSquareCheckoutSession({
  orderId,
  orderItems,
  customerInfo,
  total,
  redirectUrl,
  cancelUrl,
}: {
  orderId: string;
  orderItems: any[];
  customerInfo: { name: string; email: string; phone: string };
  total: any;
  redirectUrl: string;
  cancelUrl: string;
}) {
  try {
    const locationId = process.env.SQUARE_LOCATION_ID;
    const squareEnv = process.env.USE_SQUARE_SANDBOX === 'true' ? 'sandbox' : 'production';
    const accessToken =
      squareEnv === 'sandbox'
        ? process.env.SQUARE_SANDBOX_TOKEN
        : process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;

    if (!locationId || !accessToken) {
      return { success: false, error: 'Square configuration missing' };
    }

    const BASE_URL =
      squareEnv === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    // Prepare Square line items
    const squareLineItems = orderItems.map(item => ({
      quantity: item.quantity.toString(),
      base_price_money: {
        amount: Math.round(Number(item.price) * 100), // Price in cents
        currency: 'USD',
      },
      name: item.product.name + (item.variant ? ` (${item.variant.name})` : ''),
    }));

    const squareRequestBody = {
      idempotency_key: randomUUID(),
      order: {
        location_id: locationId,
        reference_id: orderId,
        line_items: squareLineItems,
        metadata: { retryPayment: 'true' },
      },
      checkout_options: {
        allow_tipping: true,
        redirect_url: redirectUrl,
        merchant_support_email: process.env.SUPPORT_EMAIL || 'info@destinosf.com',
        accepted_payment_methods: {
          apple_pay: true,
          google_pay: true,
          cash_app_pay: false,
          afterpay_clearpay: false,
          venmo: false,
        },
      },
    };

    const paymentLinkUrl = `${BASE_URL}/v2/online-checkout/payment-links`;
    const fetchResponse = await fetch(paymentLinkUrl, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-05-21',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(squareRequestBody),
    });

    const responseData = await fetchResponse.json();

    if (!fetchResponse.ok || responseData.errors || !responseData.payment_link?.url) {
      const errorDetail =
        responseData.errors?.[0]?.detail || 'Failed to create Square payment link';
      return { success: false, error: errorDetail };
    }

    return {
      success: true,
      checkoutUrl: responseData.payment_link.url,
      squareOrderId: responseData.payment_link.order_id,
    };
  } catch (error) {
    console.error('Error creating Square checkout session:', error);
    return { success: false, error: 'Failed to create checkout session' };
  }
}
