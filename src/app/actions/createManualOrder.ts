'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Define our own PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = 'SQUARE',
  CASH = 'CASH',
}

/**
 * Updates an order to use a manual payment method like Cash
 * This is used when customers want to pay with cash at pickup
 */
export async function updateOrderWithManualPayment(
  orderId: string,
  paymentMethod: PaymentMethod
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Updating order ${orderId} with manual payment method: ${paymentMethod}`);

    // Validate that this is a supported manual payment method
    if (paymentMethod !== 'CASH') {
      return {
        success: false,
        error: `Payment method ${paymentMethod} is not supported for manual processing. Only CASH is supported.`,
      };
    }

    // Validate the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
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
    };
  } catch (error: any) {
    console.error('Error updating order with manual payment method:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
