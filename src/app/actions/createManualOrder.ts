'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PaymentMethod } from '@prisma/client';

/**
 * Updates an order to use a manual payment method like Venmo or Cash
 * Returns a URL to a custom payment page based on the payment method
 */
export async function updateOrderWithManualPayment(
  orderId: string,
  paymentMethod: PaymentMethod
): Promise<{ success: boolean; error: string | null; checkoutUrl: string | null }> {
  try {
    // Validate the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
        checkoutUrl: null,
      };
    }

    // Validate the payment method
    if (paymentMethod !== 'VENMO' && paymentMethod !== 'CASH') {
      return {
        success: false,
        error: `Payment method ${paymentMethod} is not supported for manual processing`,
        checkoutUrl: null,
      };
    }

    // Update the order with the manual payment method
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod },
    });

    // Get app URL for generating the payment page URL
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      return {
        success: false,
        error: 'Server configuration error: Base URL missing',
        checkoutUrl: null,
      };
    }

    // Generate payment URL
    const paymentPageUrl = new URL(`/payment/${orderId}`, origin);
    paymentPageUrl.searchParams.set('method', paymentMethod);

    // Revalidate paths
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);

    return {
      success: true,
      error: null,
      checkoutUrl: paymentPageUrl.toString(),
    };
  } catch (error: any) {
    console.error('Error updating order with manual payment method:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      checkoutUrl: null,
    };
  }
} 