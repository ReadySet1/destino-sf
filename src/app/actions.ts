'use server';

import { createClient } from '@/utils/supabase/server';
import { encodedRedirect } from '@/utils/utils';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export const signUpAction = async (formData: FormData) => {
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(`${error.code  } ${  error.message}`);
    return { error: error.message };
  } else {
    return {};
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect('error', '/sign-in', error.message);
  }

  return redirect('/admin');
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get('email')?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get('origin');
  const callbackUrl = formData.get('callbackUrl')?.toString();

  if (!email) {
    return encodedRedirect('error', '/forgot-password', 'Email is required');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect('error', '/forgot-password', 'Could not reset password');
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    'success',
    '/forgot-password',
    'Check your email for a link to reset your password.'
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      'error',
      '/protected/reset-password',
      'Password and confirm password are required'
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect('error', '/protected/reset-password', 'Passwords do not match');
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect('error', '/protected/reset-password', 'Password update failed');
  }

  encodedRedirect('success', '/protected/reset-password', 'Password updated');
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect('/sign-in');
};

// Types for fulfillment data
interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface PickupFulfillment {
  method: 'pickup';
  pickupTime: string;
}

interface DeliveryFulfillment {
  method: 'delivery';
  deliveryAddress: Address;
  deliveryTime: string;
  deliveryInstructions?: string;
}

interface ShippingFulfillment {
  method: 'shipping';
  shippingAddress: Address;
  shippingMethod: string;
}

type FulfillmentData = PickupFulfillment | DeliveryFulfillment | ShippingFulfillment;

/**
 * Creates an order in the database
 */
export async function createOrder(orderData: {
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    variantId?: string;
  }>;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    pickupTime: string;
  };
  squareOrderId?: string;
  fulfillmentData?: FulfillmentData;
}) {
  try {
    // Get the Supabase client to check for an authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Calculate total price
    const totalPrice = orderData.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    
    // Prepare order data with base fields
    const orderCreateData: any = {
      squareOrderId: orderData.squareOrderId,
      status: 'PENDING',
      total: totalPrice,
      userId: user?.id, // Will be null for guest checkout
      customerName: orderData.customerInfo.name,
      email: orderData.customerInfo.email,
      phone: orderData.customerInfo.phone,
      paymentStatus: 'PENDING',
      items: {
        create: orderData.items.map(item => ({
          quantity: item.quantity,
          price: item.price,
          productId: item.id,
          variantId: item.variantId
        }))
      }
    };
    
    // Set pickup time based on fulfillment method
    if (orderData.fulfillmentData) {
      const { method } = orderData.fulfillmentData;
      
      // Store fulfillment details in the notes field (as JSON)
      orderCreateData.notes = JSON.stringify(orderData.fulfillmentData);
      
      if (method === 'pickup') {
        // For pickup, use the pickup time from fulfillment data
        orderCreateData.pickupTime = new Date(orderData.fulfillmentData.pickupTime);
      } else if (method === 'delivery') {
        // For delivery, use delivery time as pickup time
        orderCreateData.pickupTime = new Date(orderData.fulfillmentData.deliveryTime);
      } else {
        // For shipping, use the current time as a placeholder
        orderCreateData.pickupTime = new Date();
      }
    } else {
      // Fallback to the customer info pickup time
      orderCreateData.pickupTime = new Date(orderData.customerInfo.pickupTime);
    }
    
    // Create order in database
    const order = await prisma.order.create({
      data: orderCreateData,
      include: {
        items: true
      }
    });
    
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: 'Failed to create order' };
  }
}

/**
 * Updates an order with Square payment information
 */
export async function updateOrderPayment(orderId: string, squareOrderId: string) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        squareOrderId,
        paymentStatus: 'PAID'
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating order payment:', error);
    return { success: false, error: 'Failed to update order payment' };
  }
}

/**
 * Retrieves order details by ID
 */
export async function getOrderById(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true
          }
        }
      }
    });
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    // Parse fulfillment data if available
    let fulfillmentDetails = null;
    if (order.notes) {
      try {
        fulfillmentDetails = JSON.parse(order.notes);
      } catch (e) {
        console.error('Error parsing fulfillment data:', e);
      }
    }
    
    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        totalAmount: Number(order.total),
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        pickupTime: order.pickupTime.toISOString(),
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt.toISOString(),
        fulfillment: fulfillmentDetails,
        items: order.items.map(item => ({
          id: item.id,
          name: item.product.name,
          quantity: item.quantity,
          price: Number(item.price),
          variantName: item.variant?.name
        }))
      }
    };
  } catch (error) {
    console.error('Error retrieving order:', error);
    return { success: false, error: 'Failed to retrieve order' };
  }
}
