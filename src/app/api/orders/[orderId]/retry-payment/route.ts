import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { randomUUID } from 'crypto';
import { applyUserBasedRateLimit } from '@/middleware/rate-limit';
import { env } from '@/env'; // Import the validated environment configuration
import { createCheckoutLink } from '@/lib/square/checkout-links'; // Use existing working Square checkout
import { logger } from '@/utils/logger';

const MAX_RETRY_ATTEMPTS = 3;
const CHECKOUT_URL_EXPIRY_HOURS = 24;

export async function POST(request: NextRequest, { params }: { params: any }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { orderId } = await params;

    // Parse request body for guest email verification
    let requestBody: { email?: string } = {};
    try {
      requestBody = await request.json();
    } catch {
      // No body provided, continue with authenticated user flow
    }

    // Guest user verification: Allow retry if email matches order email
    const isGuestRequest = !user && requestBody.email;

    if (!user && !isGuestRequest) {
      return NextResponse.json(
        {
          error: 'Authentication required. Please provide your email address to retry payment.',
        },
        { status: 401 }
      );
    }

    // Apply rate limiting (user-based or email-based for guests)
    if (user) {
      const rateLimitResponse = await applyUserBasedRateLimit(request, user.id, {
        config: { id: 'order-retry', limit: 3, window: 60 * 1000, prefix: 'order_retry_rl' },
      });
      if (rateLimitResponse) {
        console.warn(`Order retry rate limit exceeded for user ${user.id}`);
        return rateLimitResponse;
      }
    } else if (isGuestRequest) {
      // Use email-based rate limiting for guests
      const rateLimitResponse = await applyUserBasedRateLimit(request, requestBody.email!, {
        config: {
          id: 'order-retry-guest',
          limit: 3,
          window: 60 * 1000,
          prefix: 'order_retry_guest_rl',
        },
      });
      if (rateLimitResponse) {
        console.warn(`Order retry rate limit exceeded for email ${requestBody.email}`);
        return rateLimitResponse;
      }
    }

    // Try to find as regular order first
    // DES-57: Include shipping and delivery fields for fee calculation
    let order = await prisma.order.findUnique({
      where: {
        id: orderId,
        paymentMethod: 'SQUARE', // Only allow retries for Square payments
        paymentStatus: { in: ['PENDING', 'FAILED'] }, // Check payment status only
        ...(user ? { userId: user.id } : {}), // Filter by userId only if authenticated
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      // Select all fields including shipping and delivery details
    });

    // If not found as regular order, try as catering order
    let cateringOrder = null;
    if (!order) {
      cateringOrder = await prisma.cateringOrder.findUnique({
        where: {
          id: orderId,
          paymentMethod: 'SQUARE', // Only allow retries for Square payments
          paymentStatus: { in: ['PENDING', 'FAILED'] }, // Check payment status only
          ...(user ? { customerId: user.id } : {}), // Filter by customerId only if authenticated
        },
        include: {
          items: true,
        },
      });
    }

    // If neither order type found
    if (!order && !cateringOrder) {
      return NextResponse.json(
        { error: 'Order not found, not eligible for retry, or uses cash payment method' },
        { status: 404 }
      );
    }

    const targetOrder = order || cateringOrder;
    const isRegularOrder = !!order;
    const isCateringOrder = !!cateringOrder;

    // For guest requests, verify email matches order email
    if (isGuestRequest) {
      if (targetOrder!.email.toLowerCase() !== requestBody.email!.toLowerCase()) {
        return NextResponse.json(
          { error: 'Email address does not match order email' },
          { status: 403 }
        );
      }
    }

    // Additional check for payment method (extra safety)
    if (targetOrder!.paymentMethod !== 'SQUARE') {
      return NextResponse.json(
        { error: 'Payment retry is only available for credit card orders' },
        { status: 400 }
      );
    }

    // Check retry limits
    if (targetOrder!.retryCount >= MAX_RETRY_ATTEMPTS) {
      return NextResponse.json({ error: 'Maximum retry attempts exceeded' }, { status: 429 });
    }

    // Check if existing URL is still valid
    if (
      targetOrder!.paymentUrl &&
      targetOrder!.paymentUrlExpiresAt &&
      targetOrder!.paymentUrlExpiresAt > new Date()
    ) {
      return NextResponse.json({
        success: true,
        checkoutUrl: targetOrder!.paymentUrl,
        expiresAt: targetOrder!.paymentUrlExpiresAt,
      });
    }

    // Prepare order items based on order type
    const orderItems = isRegularOrder
      ? order!.items.map(item => ({
          quantity: item.quantity,
          price: item.price,
          product: { name: item.product.name },
          variant: item.variant,
        }))
      : cateringOrder!.items.map(item => ({
          quantity: item.quantity,
          price: item.pricePerUnit,
          product: { name: item.itemName },
          variant: null,
        }));

    // Clean app URL to prevent double slashes
    const cleanAppUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

    // Create new Square checkout session
    const redirectUrl = isRegularOrder
      ? `${cleanAppUrl}/checkout/success?orderId=${targetOrder!.id}`
      : `${cleanAppUrl}/catering/confirmation?status=success&orderId=${targetOrder!.id}`;

    const cancelUrl = isRegularOrder
      ? `${cleanAppUrl}/orders/${targetOrder!.id}?payment=cancelled`
      : `${cleanAppUrl}/catering/confirmation?status=cancelled&orderId=${targetOrder!.id}`;

    // Format items for the existing working checkout function
    const lineItems = orderItems.map(item => ({
      name: item.product.name + (item.variant ? ` (${item.variant.name})` : ''),
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: Math.round(Number(item.price) * 100), // Convert to cents
        currency: 'USD',
      },
    }));

    // DES-57 FIX: Add shipping cost as a line item if applicable
    if (isRegularOrder && order) {
      const shippingCostCents = order.shippingCostCents || 0;
      if (shippingCostCents > 0) {
        lineItems.push({
          name: order.shippingMethodName || `Shipping (${order.shippingCarrier || 'Standard'})`,
          quantity: '1',
          basePriceMoney: {
            amount: shippingCostCents, // Already in cents from DB
            currency: 'USD',
          },
        });
        console.log(`🔧 [RETRY-PAYMENT] Added shipping cost: $${(shippingCostCents / 100).toFixed(2)}`);
      }
    }

    // DES-57 FIX: Add delivery fee as a line item if applicable
    if (isRegularOrder && order) {
      const deliveryFee = order.deliveryFee ? Number(order.deliveryFee) : 0;
      if (deliveryFee > 0) {
        lineItems.push({
          name: `Delivery Fee`,
          quantity: '1',
          basePriceMoney: {
            amount: Math.round(deliveryFee * 100), // Convert to cents
            currency: 'USD',
          },
        });
        console.log(`🔧 [RETRY-PAYMENT] Added delivery fee: $${deliveryFee.toFixed(2)}`);
      }
    }

    // DES-57 FIX: Calculate and add service/convenience fee (3.5% of subtotal)
    const SERVICE_FEE_RATE = 0.035; // 3.5%
    const subtotal = orderItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const serviceFeeAmount = Math.round(subtotal * SERVICE_FEE_RATE * 100); // Convert to cents

    // DES-57 FIX: Prepare service charges array if service fee > 0
    const serviceCharges = serviceFeeAmount > 0 ? [{
      name: 'Convenience Fee',
      amount_money: { amount: serviceFeeAmount, currency: 'USD' },
      calculation_phase: 'TOTAL_PHASE',
      taxable: false,
    }] : undefined;

    if (serviceFeeAmount > 0) {
      console.log(`🔧 [RETRY-PAYMENT] Added convenience fee: $${(serviceFeeAmount / 100).toFixed(2)}`);
    }

    // Use the existing working Square checkout function (handles sandbox/production logic)
    const squareEnv = process.env.USE_SQUARE_SANDBOX === 'true' ? 'sandbox' : 'production';
    const locationId =
      squareEnv === 'sandbox'
        ? 'LMV06M1ER6HCC' // Use Default Test Account sandbox location ID
        : process.env.SQUARE_LOCATION_ID; // Use production location ID

    let checkoutUrl: string;
    try {
      const checkoutParams: any = {
        orderId: targetOrder!.id,
        locationId: locationId!,
        lineItems,
        redirectUrl,
        customerEmail: targetOrder!.email,
        customerName: isRegularOrder ? order!.customerName : cateringOrder!.name,
        customerPhone: targetOrder!.phone,
        // DES-57 FIX: Include service charges in checkout params
        ...(serviceCharges && { serviceCharges }),
      };

      // Add eventDate for catering orders to ensure proper pickup_at scheduling
      if (isCateringOrder && cateringOrder) {
        checkoutParams.eventDate = cateringOrder.eventDate.toISOString();
        console.log(
          `🔧 [RETRY-PAYMENT] Added eventDate for catering order: ${checkoutParams.eventDate}`
        );
      }

      console.log(
        `🔧 [RETRY-PAYMENT] Creating checkout link for ${isRegularOrder ? 'regular' : 'catering'} order`
      );
      console.log(`🔧 [RETRY-PAYMENT] Total line items: ${lineItems.length}`);
      console.log(`🔧 [RETRY-PAYMENT] Service charges: ${serviceCharges ? 'Yes' : 'No'}`);
      const result = await createCheckoutLink(checkoutParams);
      checkoutUrl = result.checkoutUrl;
    } catch (error) {
      logger.error('Failed to create Square checkout link:', error);
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    // Update order with new checkout URL and retry info
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CHECKOUT_URL_EXPIRY_HOURS);

    if (isRegularOrder) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentUrl: checkoutUrl,
          paymentUrlExpiresAt: expiresAt,
          retryCount: order!.retryCount + 1,
          lastRetryAt: new Date(),
          status: 'PENDING', // Reset to pending for new attempt
        },
      });
    } else {
      await prisma.cateringOrder.update({
        where: { id: orderId },
        data: {
          paymentUrl: checkoutUrl,
          paymentUrlExpiresAt: expiresAt,
          retryCount: cateringOrder!.retryCount + 1,
          lastRetryAt: new Date(),
          status: 'PENDING', // Reset to pending for new attempt
        },
      });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      expiresAt,
      retryAttempt: targetOrder!.retryCount + 1,
    });
  } catch (error) {
    console.error('Error in retry payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
