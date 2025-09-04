'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { OrderStatus, Prisma, PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import { formatISO, parseISO } from 'date-fns';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { validateOrderMinimums } from '@/lib/cart-helpers'; // Import the validation helper
import { createRegularOrderTipSettings } from '@/lib/square/tip-settings';
import { AlertService } from '@/lib/alerts'; // Import the alert service
import { errorMonitor } from '@/lib/error-monitoring'; // Import error monitoring
import { env } from '@/env'; // Import the validated environment configuration
import { getTaxRate, isStoreOpen } from '@/lib/store-settings'; // Import store settings service

// Re-add BigInt patch if needed directly in actions, or ensure it runs globally
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// --- Constants ---
// Tax rate is now fetched from store settings
const SERVICE_FEE_RATE = new Decimal(0.035); // 3.5%

// --- Schemas ---
// Define addressSchema directly within this file (or move to a shared location)
const addressSchema = z.object({
  recipientName: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().optional(),
});

// Shipping address schema with optional recipient name (validated at runtime)
const shippingAddressSchema = z.object({
  recipientName: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().optional(),
});

const CustomerInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  pickupTime: z.string().optional(), // Validate format if always present for pickup
});

// Fulfillment Schemas
const FulfillmentBaseSchema = z.object({
  method: z.enum(['pickup', 'local_delivery', 'nationwide_shipping']),
});

const PickupSchema = FulfillmentBaseSchema.extend({
  method: z.literal('pickup'),
  pickupTime: z.string(), // Expecting ISO format string like "YYYY-MM-DDTHH:mm:ss"
});

const LocalDeliverySchema = FulfillmentBaseSchema.extend({
  method: z.literal('local_delivery'),
  deliveryDate: z.string(),
  deliveryTime: z.string(),
  deliveryAddress: addressSchema,
  deliveryInstructions: z.string().optional(),
});

const NationwideShippingSchema = FulfillmentBaseSchema.extend({
  method: z.literal('nationwide_shipping'),
  shippingAddress: shippingAddressSchema,
  shippingMethod: z.string(), // Service level TOKEN (e.g., "usps_priority")
  shippingCarrier: z.string(), // Carrier name (e.g., "USPS")
  shippingCost: z.number().positive().int(), // Cost in cents (now required as it's selected)
  rateId: z.string(), // Shippo Rate ID (now required)
});

const FulfillmentSchema = z.discriminatedUnion('method', [
  PickupSchema,
  LocalDeliverySchema,
  NationwideShippingSchema,
]);

const CartItemSchema = z.object({
  id: z.string(), // Your internal Product ID
  name: z.string(),
  price: z.number(), // Price per item in DOLLARS (e.g., 12.99)
  quantity: z.number().min(1),
  variantId: z.string().optional(),
  // Add other necessary fields like image, variant name etc. if needed for Square
});

const PayloadSchema = z.object({
  items: z.array(CartItemSchema),
  customerInfo: CustomerInfoSchema,
  fulfillment: FulfillmentSchema, // Use the discriminated union type
  paymentMethod: z.nativeEnum(PaymentMethod).optional(), // Make it optional for backward compatibility
});

// --- Types ---
// Consider moving Address to a shared types file if used elsewhere
interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  recipientName?: string;
}

// These specific fulfillment interfaces might be internal to this file
interface PickupFulfillment {
  method: 'pickup';
  pickupTime: string;
}

interface DeliveryFulfillment {
  // This seems potentially outdated? FulfillmentSchema covers it.
  method: 'delivery';
  deliveryAddress: Address;
  deliveryTime: string;
  deliveryInstructions?: string;
}

interface ShippingFulfillment {
  // This seems potentially outdated? FulfillmentSchema covers it.
  method: 'shipping';
  shippingAddress: Address;
  shippingMethod: string;
}

interface LocalDeliveryFulfillment {
  // This seems potentially outdated? FulfillmentSchema covers it.
  method: 'local_delivery';
  deliveryAddress: Address;
  deliveryDate: string;
  deliveryTime: string;
  deliveryInstructions?: string;
  // Add fields for delivery fee
  deliveryFee?: number;
  deliveryZone?: string | null;
}

interface NationwideShippingFulfillment {
  // This seems potentially outdated? FulfillmentSchema covers it.
  method: 'nationwide_shipping';
  shippingAddress: Address;
  shippingMethod: string;
  shippingCost?: number; // Cost in cents
  shippingCarrier?: string; // Optional carrier
  rateId?: string; // Optional Shippo rate ID
}

// Export this type if needed elsewhere, but FulfillmentSchema might be better
export type FulfillmentData = // Consider removing if FulfillmentSchema is sufficient

    | PickupFulfillment
    | DeliveryFulfillment
    | ShippingFulfillment
    | LocalDeliveryFulfillment
    | NationwideShippingFulfillment;

type OrderItem = {
  // Potentially internal type for getOrderById
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
  };
  variant?: {
    name: string;
  } | null;
};

// Server Action Return Type for createOrderAndGenerateCheckoutUrl
type ServerActionResult = {
  success: boolean;
  error: string | null;
  checkoutUrl: string | null;
  orderId: string | null;
};

// --- Helper Functions ---
// Helper to map country code (reuse from API route or define here)
const mapCountryCode = (code: string | undefined): string | undefined => {
  if (!code) return undefined;
  const upperCaseCode = code.toUpperCase();
  if (['US', 'CA'].includes(upperCaseCode)) return upperCaseCode;
  console.warn(`Unsupported country code: ${code}. Returning original.`);
  return upperCaseCode;
};

// --- Server Actions ---

/**
 * DEPRECATED? Creates an order in the database directly.
 * Consider if createOrderAndGenerateCheckoutUrl replaces this functionality.
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
    pickupTime: string; // Note: This might conflict with fulfillmentData
  };
  squareOrderId?: string;
  fulfillmentData?: FulfillmentData; // Uses potentially outdated type
}) {
  console.warn(
    'createOrder function called. Consider using createOrderAndGenerateCheckoutUrl instead.'
  );
  try {
    const supabase = await createClient(); // Assumes server-side usage
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Calculate total price (using basic number math, consider Decimal.js for accuracy)
    const totalPrice = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Prepare order data with base fields
    const orderCreateData: Prisma.OrderCreateInput = {
      squareOrderId: orderData.squareOrderId,
      status: 'PENDING',
      total: new Decimal(totalPrice), // Use Decimal for precision
      // Connect user if ID exists
      ...(user?.id && { user: { connect: { id: user.id } } }),
      customerName: orderData.customerInfo.name,
      email: orderData.customerInfo.email,
      phone: orderData.customerInfo.phone,
      paymentStatus: 'PENDING',
      items: {
        create: orderData.items.map(item => ({
          quantity: item.quantity,
          price: new Decimal(item.price), // Use Decimal for precision
          productId: item.id,
          variantId: item.variantId,
        })),
      },
      // Initialize fulfillment fields to null or defaults
      fulfillmentType: 'pickup', // Default, will be overwritten
      pickupTime: null,
      // ... add other potential fields from Prisma schema
    };

    // Set fulfillment details based on fulfillmentData
    if (orderData.fulfillmentData) {
      const { method } = orderData.fulfillmentData;
      orderCreateData.fulfillmentType = method;

      // Store fulfillment details in the notes field (as JSON) - Legacy approach?
      orderCreateData.notes = JSON.stringify(orderData.fulfillmentData);

      // Map specific fulfillment types to DB fields
      if (method === 'pickup' && 'pickupTime' in orderData.fulfillmentData) {
        orderCreateData.pickupTime = new Date(orderData.fulfillmentData.pickupTime);
      } else if (method === 'delivery' && 'deliveryTime' in orderData.fulfillmentData) {
        // Assuming delivery uses pickupTime field - adjust schema if needed
        orderCreateData.pickupTime = new Date(orderData.fulfillmentData.deliveryTime);
        // Store address/etc. in notes or dedicated fields if they exist
      } else if (
        method === 'local_delivery' &&
        'deliveryDate' in orderData.fulfillmentData &&
        'deliveryTime' in orderData.fulfillmentData
      ) {
        orderCreateData.deliveryDate = orderData.fulfillmentData.deliveryDate;
        orderCreateData.deliveryTime = orderData.fulfillmentData.deliveryTime;
        // Store address/instructions in notes or dedicated fields
        orderCreateData.notes = JSON.stringify({
          deliveryAddress: orderData.fulfillmentData.deliveryAddress,
          deliveryInstructions: orderData.fulfillmentData.deliveryInstructions,
        });
        // Potentially set pickupTime as placeholder if required by schema
        orderCreateData.pickupTime = new Date();
      } else if (
        method === 'nationwide_shipping' &&
        'shippingAddress' in orderData.fulfillmentData
      ) {
        // Store address/method in notes or dedicated fields
        orderCreateData.shippingMethodName = orderData.fulfillmentData.shippingMethod;
        // Potentially set pickupTime as placeholder if required by schema
        orderCreateData.pickupTime = new Date();
      } else {
        // Fallback for other cases or if pickupTime is expected
        orderCreateData.pickupTime = new Date(orderData.customerInfo.pickupTime); // Fallback to customer info time?
      }
    } else {
      // Fallback if no fulfillmentData provided (maybe default to pickup?)
      orderCreateData.fulfillmentType = 'pickup';
      orderCreateData.pickupTime = new Date(orderData.customerInfo.pickupTime); // Use customer info time
    }

    // Create order in database
    const order = await prisma.order.create({
      data: orderCreateData,
      // No need to include items here unless immediately needed
    });

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('Error creating order (legacy function):', error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return { success: false, error: message };
  }
}

/**
 * Updates an order with Square payment information (e.g., after webhook confirmation)
 */
export async function updateOrderPayment(
  orderId: string,
  squareOrderId: string,
  paymentStatus: 'PAID' | 'FAILED' = 'PAID',
  notes?: string
) {
  try {
    // Get the current order status before updating
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    const previousStatus = currentOrder?.status;
    const newStatus = paymentStatus === 'PAID' ? OrderStatus.PROCESSING : OrderStatus.CANCELLED;

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        squareOrderId, // Update Square Order ID if needed
        paymentStatus: paymentStatus,
        // Use PROCESSING status after payment confirmation
        status: newStatus,
        notes: notes ? notes : undefined, // Append or set notes if provided
      },
    });

    // Send alerts for payment failures and status changes
    try {
      const alertService = new AlertService();

      // Send payment failed alert if payment failed
      if (paymentStatus === 'FAILED') {
        // Fetch the complete order with items for the alert
        const orderWithItems = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (orderWithItems) {
          await alertService.sendPaymentFailedAlert(
            orderWithItems,
            notes || 'Payment processing failed'
          );
          console.log(`Payment failed alert sent for order ${orderId}`);
        }
      }

      // Send status change alert if status actually changed
      if (previousStatus && previousStatus !== newStatus) {
        // Fetch the complete order with items for the alert
        const orderWithItems = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (orderWithItems) {
          await alertService.sendOrderStatusChangeAlert(orderWithItems, previousStatus);
          console.log(
            `Status change alert sent for order ${orderId}: ${previousStatus} → ${newStatus}`
          );
        }
      }
    } catch (alertError: any) {
      console.error(`Failed to send alerts for order ${orderId}:`, alertError);
      // Don't fail the payment update if alert fails
    }

    revalidatePath(`/admin/orders/${orderId}`); // Revalidate specific order page
    revalidatePath('/admin/orders');
    revalidatePath(`/orders/${orderId}`); // Revalidate user order page
    revalidatePath('/orders');

    // Return the updated order data for tests and calling functions
    return updatedOrder;
  } catch (error) {
    console.error('Error updating order payment:', error);
    const message = error instanceof Error ? error.message : 'Failed to update order payment';
    throw new Error(message);
  }
}

/**
 * Retrieves comprehensive order details by ID for display purposes.
 */
export async function getOrderById(orderId: string) {
  try {
    // No Supabase client needed if just querying Prisma and not checking auth
    // Add auth check here if this needs to be restricted
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
      return null;
    }

    // Construct the response object with proper decimal conversion
    const responseOrder = {
      id: order.id,
      status: order.status,
      customerName: order.customerName,
      customerEmail: order.email,
      customerPhone: order.phone,
      fulfillmentMethod: order.fulfillmentType,
      subtotal: { toNumber: () => Number(order.total) },
      taxAmount: { toNumber: () => Number(order.taxAmount) },
      total: { toNumber: () => Number(order.total) },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      userId: order.userId,
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: { toNumber: () => Number(item.price) },
        product: { name: item.product.name },
        variant: item.variant ? { name: item.variant.name } : null,
      })),
    };

    return responseOrder;
  } catch (error) {
    console.error('Error retrieving order:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve order';
    return { success: false, error: message };
  }
}

/**
 * Creates an order in the database and generates a Square checkout URL.
 * This is the primary action for initiating a new order.
 */
export async function createOrderAndGenerateCheckoutUrl(formData: {
  items: z.infer<typeof CartItemSchema>[];
  customerInfo: z.infer<typeof CustomerInfoSchema>;
  fulfillment: z.infer<typeof FulfillmentSchema>; // Use the discriminated union type
  paymentMethod: PaymentMethod; // CASH, SQUARE, etc.
}): Promise<ServerActionResult> {
  console.log('Server Action: createOrderAndGenerateCheckoutUrl started.');
  console.log('Received Fulfillment Data:', JSON.stringify(formData.fulfillment, null, 2));
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const supabaseUserId = user?.id;

  // Validate input using Zod schema before processing
  const validationResult = PayloadSchema.safeParse(formData);
  if (!validationResult.success) {
    console.error('Invalid form data:', validationResult.error.errors);
    // Combine Zod errors into a single message
    const errorMessage = validationResult.error.errors
      .map(e => `${e.path.join('.')} - ${e.message}`)
      .join('; ');
    return {
      success: false,
      error: `Invalid input: ${errorMessage}`,
      checkoutUrl: null,
      orderId: null,
    };
  }

  const { items, customerInfo, fulfillment, paymentMethod } = validationResult.data; // Use validated data

  // Check if store is open
  const storeOpen = await isStoreOpen();
  if (!storeOpen) {
    return {
      success: false,
      error: 'Store is currently closed. Please check our hours or try again later.',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // Add minimum order validation
  const orderValidation = await validateOrderMinimums(items);
  if (!orderValidation.isValid) {
    return {
      success: false,
      error: orderValidation.errorMessage || 'Order does not meet minimum requirements',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // Check if this is a catering order
  const hasCateringItems = await hasCateringProducts(items.map(item => item.id));

  // --- Calculate Totals using Decimal.js ---
  let subtotal = new Decimal(0);
  const orderItemsData = items.map(item => {
    const itemPrice = new Decimal(item.price);
    const itemTotal = itemPrice.times(item.quantity);
    subtotal = subtotal.plus(itemTotal);
    return {
      productId: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      price: itemPrice, // Keep as Decimal for DB
    };
  });

  // Get tax rate from store settings
  const taxRateDecimal = await getTaxRate();
  const taxAmount = subtotal.times(new Decimal(taxRateDecimal)).toDecimalPlaces(2);

  // Get shipping cost directly from the validated fulfillment data
  const shippingCostCents =
    fulfillment.method === 'nationwide_shipping' ? fulfillment.shippingCost : 0;
  const shippingCostDecimal = new Decimal(shippingCostCents).dividedBy(100);

  const totalBeforeFee = subtotal.plus(taxAmount).plus(shippingCostDecimal);
  const serviceFeeAmount = totalBeforeFee.times(SERVICE_FEE_RATE).toDecimalPlaces(2);
  const finalTotal = totalBeforeFee.plus(serviceFeeAmount);

  console.log(`Calculated Subtotal: ${subtotal.toFixed(2)}`);
  console.log(`Calculated Tax: ${taxAmount.toFixed(2)}`);
  console.log(
    `Calculated Shipping: ${shippingCostDecimal.toFixed(2)} (Cents: ${shippingCostCents})`
  );
  console.log(`Calculated Service Fee: ${serviceFeeAmount.toFixed(2)}`);
  console.log(`Calculated Final Total: ${finalTotal.toFixed(2)}`);

  // --- Prepare Fulfillment DB Data ---
  let dbFulfillmentData: Partial<Prisma.OrderCreateInput> = {
    fulfillmentType: fulfillment.method,
    notes: undefined, // Initialize notes
    // Initialize other fulfillment fields to null/undefined
    pickupTime: null,
    deliveryDate: null,
    deliveryTime: null,
    shippingMethodName: null,
    shippingCarrier: null,
    shippingServiceLevelToken: null,
    shippingCostCents: null,
    shippingRateId: null,
  };

  let pickupTimeISO: string | null = null; // Still needed for Square Pickup

  try {
    // Separate try for parsing dates/preparing fulfillment data
    if (fulfillment.method === 'pickup') {
      pickupTimeISO = formatISO(parseISO(fulfillment.pickupTime));
      dbFulfillmentData.pickupTime = new Date(pickupTimeISO);
    } else if (fulfillment.method === 'local_delivery') {
      dbFulfillmentData.deliveryDate = fulfillment.deliveryDate;
      dbFulfillmentData.deliveryTime = fulfillment.deliveryTime;
      // Store complex address/instructions in notes as JSON
      dbFulfillmentData.notes = JSON.stringify({
        deliveryAddress: fulfillment.deliveryAddress,
        deliveryInstructions: fulfillment.deliveryInstructions,
      });
      // Set a placeholder pickupTime only if the DB schema strictly requires it (non-nullable)
      // dbFulfillmentData.pickupTime = new Date();
    } else if (fulfillment.method === 'nationwide_shipping') {
      // Store dedicated shipping fields
      dbFulfillmentData.shippingMethodName = `${fulfillment.shippingCarrier} ${fulfillment.shippingMethod}`; // Construct a display name
      dbFulfillmentData.shippingCarrier = fulfillment.shippingCarrier;
      dbFulfillmentData.shippingServiceLevelToken = fulfillment.shippingMethod; // This is the token
      dbFulfillmentData.shippingCostCents = fulfillment.shippingCost; // Already validated as number/int
      dbFulfillmentData.shippingRateId = fulfillment.rateId; // Already validated as string
      // Store address in notes as JSON
      dbFulfillmentData.notes = JSON.stringify({
        shippingAddress: fulfillment.shippingAddress,
      });
      // Set a placeholder pickupTime only if the DB schema strictly requires it (non-nullable)
      // dbFulfillmentData.pickupTime = new Date();
    }
  } catch (dateError: any) {
    console.error('Invalid date format provided for fulfillment:', dateError);
    return {
      success: false,
      error: 'Invalid date/time format for fulfillment.',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // --- Database Order Creation ---
  let dbOrder: { id: string } | null = null;
  try {
    const orderInputData: Prisma.OrderCreateInput = {
      // Connect profile using userId if ID exists
      ...(supabaseUserId && { profile: { connect: { id: supabaseUserId } } }),
      status: OrderStatus.PENDING, // Use Prisma Enum
      paymentStatus: 'PENDING',
      paymentMethod: paymentMethod,
      total: finalTotal, // Prisma handles Decimal
      taxAmount: taxAmount,
      customerName: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      // Set the catering order flag
      isCateringOrder: hasCateringItems,
      // Spread the prepared fulfillment data
      ...dbFulfillmentData,
      items: {
        create: orderItemsData.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price, // Pass Decimal directly
        })),
      },
    };

    dbOrder = await prisma.order.create({
      data: orderInputData,
      select: { id: true }, // Select only the ID
    });
    console.log(
      `Database order created with ID: ${dbOrder.id} (isCateringOrder: ${hasCateringItems})`
    );

    // Send new order alert to admin
    try {
      // Fetch the complete order with items for the alert
      const orderWithItems = await prisma.order.findUnique({
        where: { id: dbOrder.id },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      if (orderWithItems) {
        const alertService = new AlertService();
        await alertService.sendNewOrderAlert(orderWithItems);
        console.log(`New order alert sent for order ${dbOrder.id}`);
      }
    } catch (alertError: any) {
      console.error(`Failed to send new order alert for order ${dbOrder.id}:`, alertError);
      // Don't fail the order creation if alert fails
    }
  } catch (error: any) {
    console.error('Database Error creating order:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code, 'Meta:', error.meta);
    }
    return {
      success: false,
      error: error.message || 'Failed to save order details.',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // --- Square API Interaction ---
  const squareEnv = process.env.USE_SQUARE_SANDBOX === 'true' ? 'sandbox' : 'production';
  
  // Use the correct location ID based on environment
  const locationId = squareEnv === 'sandbox' 
    ? 'LMV06M1ER6HCC'                         // Use Default Test Account sandbox location ID
    : process.env.SQUARE_LOCATION_ID;         // Use production location ID
    
  const accessToken =
    squareEnv === 'sandbox'
      ? process.env.SQUARE_SANDBOX_TOKEN
      : process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
  const supportEmail = process.env.SUPPORT_EMAIL || 'info@destinosf.com';

  console.log(`Using Square ${squareEnv} environment with location ID: ${locationId}`);
  console.log(
    `Token source: ${squareEnv === 'sandbox' ? 'SQUARE_SANDBOX_TOKEN' : 'SQUARE_PRODUCTION_TOKEN/SQUARE_ACCESS_TOKEN'}`
  );
  console.log(`Has token: ${!!accessToken}`);

  if (!locationId || !accessToken) {
    console.error('Server Action Config Error: Missing Square Location ID or Access Token.');
    if (dbOrder?.id) {
      await prisma.order
        .update({
          where: { id: dbOrder.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: 'FAILED',
            notes: 'Square config error (missing credentials)',
          },
        })
        .catch(e => console.error('Failed to update order status on config error:', e));
    }
    return {
      success: false,
      error: 'Payment provider configuration error.',
      checkoutUrl: null,
      orderId: dbOrder?.id ?? null,
    };
  }

  const BASE_URL =
    squareEnv === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

  try {
    // --- Prepare Square Line Items ---
    const squareLineItems: any[] = items.map(item => ({
      quantity: item.quantity.toString(),
      base_price_money: {
        amount: Math.round(item.price * 100), // Price in cents
        currency: 'USD',
      },
      name: item.name,
      // TODO: Fetch and add variation_name if variantId is present
      // variation_name: item.variantId ? await getVariantName(item.variantId) : undefined,
    }));

    // Add shipping as a line item if applicable
    if (fulfillment.method === 'nationwide_shipping' && fulfillment.shippingCost > 0) {
      squareLineItems.push({
        name: dbFulfillmentData.shippingMethodName || `Shipping (${fulfillment.shippingCarrier})`, // Use DB field or fallback
        quantity: '1',
        base_price_money: { amount: fulfillment.shippingCost, currency: 'USD' }, // Use cost in cents
      });
    }

    // --- Prepare Square Service Charges ---
    const squareServiceCharges: any[] = [];
    if (serviceFeeAmount.greaterThan(0)) {
      squareServiceCharges.push({
        name: 'Service Fee',
        amount_money: { amount: Math.round(serviceFeeAmount.toNumber() * 100), currency: 'USD' },
        calculation_phase: 'TOTAL_PHASE', // Applied after tax and shipping
        taxable: false,
      });
    }

    // --- Prepare Square Taxes ---
    const squareTaxes: any[] = [];
    if (taxAmount.greaterThan(0)) {
      squareTaxes.push({
        // uid: randomUUID().substring(0, 6), // Optional: helps Square UI
        name: 'Sales Tax',
        percentage: new Decimal(taxRateDecimal).times(100).toFixed(2), // e.g., "8.25"
        scope: 'ORDER', // Apply to order subtotal (before service fees)
      });
    }

    // --- Prepare Square Fulfillment ---
    let squareFulfillment: any = null; // Initialize as null
    const squareRecipient = {
      // Define recipient once
      display_name: customerInfo.name,
      email_address: customerInfo.email,
      phone_number: customerInfo.phone,
    };

    if (fulfillment.method === 'pickup' && pickupTimeISO) {
      squareFulfillment = {
        type: 'PICKUP',
        pickup_details: {
          recipient: squareRecipient,
          pickup_at: pickupTimeISO, // Use ISO string
          schedule_type: 'SCHEDULED',
        },
      };
    } else if (fulfillment.method === 'local_delivery' && fulfillment.deliveryAddress) {
      const address = fulfillment.deliveryAddress;
      squareFulfillment = {
        type: 'DELIVERY',
        delivery_details: {
          recipient: {
            ...squareRecipient,
            address: {
              address_line_1: address.street,
              address_line_2: address.street2,
              locality: address.city,
              administrative_district_level_1: address.state,
              postal_code: address.postalCode,
              country: mapCountryCode(address.country) || 'US', // Use helper
            },
          },
          schedule_type: 'SCHEDULED',
          placed_at: new Date().toISOString(), // When the order is placed with us
          // Combine date and time, ensuring valid RFC 3339 format
          deliver_at: fulfillment.deliveryTime.includes('T')
            ? formatISO(parseISO(fulfillment.deliveryTime))
            : formatISO(parseISO(`${fulfillment.deliveryDate}T${fulfillment.deliveryTime}`)),
          delivery_instructions: fulfillment.deliveryInstructions,
          carrier_code: 'CUSTOM', // Indicate local delivery
        },
      };
    } else if (fulfillment.method === 'nationwide_shipping' && fulfillment.shippingAddress) {
      const address = fulfillment.shippingAddress;
      
      // Validate that recipient name is provided for shipping orders
      if (!address.recipientName || !address.recipientName.trim()) {
        console.error('❌ Order creation failed: Missing recipient name for shipping address');
        return {
          success: false,
          error: 'Recipient name is required for shipping orders. Please provide a complete shipping address.',
          checkoutUrl: null,
          orderId: null,
        };
      }
      
      squareFulfillment = {
        type: 'SHIPMENT',
        shipment_details: {
          recipient: {
            ...squareRecipient,
            address: {
              address_line_1: address.street,
              address_line_2: address.street2,
              locality: address.city,
              administrative_district_level_1: address.state,
              postal_code: address.postalCode,
              country: mapCountryCode(address.country) || 'US', // Use helper
            },
          },
          shipping_type: fulfillment.shippingMethod, // Service level token (e.g., "usps_priority")
          carrier_code: fulfillment.shippingCarrier, // Carrier identifier (e.g., "USPS")
          // shipping_note: `Rate ID: ${fulfillment.rateId}`, // Optional note
        },
      };
    }

    // --- Prepare Square Checkout Options ---
    const origin = env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      console.error('Server Action Config Error: NEXT_PUBLIC_APP_URL is not set.');
      if (dbOrder?.id) {
        await prisma.order
          .update({
            where: { id: dbOrder.id },
            data: {
              status: OrderStatus.CANCELLED,
              paymentStatus: 'FAILED',
              notes: 'Missing base URL config',
            },
          })
          .catch(e => console.error('Failed to update order status on config error:', e));
      }
      return {
        success: false,
        error: 'Server configuration error: Base URL missing.',
        checkoutUrl: null,
        orderId: dbOrder?.id ?? null,
      };
    }
    // Use URL constructor for robust query parameter handling
    const redirectUrl = new URL('/order-confirmation', origin);
    redirectUrl.searchParams.set('status', 'success');
    redirectUrl.searchParams.set('orderId', dbOrder.id);

    const cancelUrl = new URL('/cart', origin);
    cancelUrl.searchParams.set('status', 'cancelled');
    cancelUrl.searchParams.set('orderId', dbOrder.id); // Include orderId in cancel URL

    const squareCheckoutOptions = {
      allow_tipping: true,
      redirect_url: redirectUrl.toString(),
      merchant_support_email: supportEmail, // Now has proper fallback
      ask_for_shipping_address: false, // Provided via fulfillment
      accepted_payment_methods: {
        apple_pay: true,
        google_pay: true,
        cash_app_pay: false,
        afterpay_clearpay: false,
        venmo: false,
      },
      // Custom tip settings with 5%, 10%, and 15% instead of default 15%, 20%, 25%
      tip_settings: createRegularOrderTipSettings(),
    };

    // --- Build Full Square Request Body ---
    const squareRequestBody: any = {
      idempotency_key: randomUUID(),
      order: {
        location_id: locationId,
        reference_id: dbOrder.id, // Link to our DB order
        // customer_id: undefined, // TODO: Link if Square Customer profile exists?
        line_items: squareLineItems,
        taxes: squareTaxes,
        service_charges: squareServiceCharges,
        // Only include fulfillments array if squareFulfillment is not null
        fulfillments: squareFulfillment ? [squareFulfillment] : [],
        metadata: supabaseUserId ? { supabaseUserId: supabaseUserId } : undefined,
      },
      checkout_options: squareCheckoutOptions,
      // Optionally pre-fill buyer info
      // pre_populated_data: {
      //     buyer_email: customerInfo.email,
      //     buyer_phone_number: customerInfo.phone,
      // }
    };

    console.log('Calling Square Create Payment Link API...');
    const paymentLinkUrl = `${BASE_URL}/v2/online-checkout/payment-links`;
    const fetchResponse = await fetch(paymentLinkUrl, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-05-21', // Use the latest API version
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(squareRequestBody),
    });

    const responseData = await fetchResponse.json();

    // Check for fetch errors OR Square API errors in the response body
    if (
      !fetchResponse.ok ||
      responseData.errors ||
      !responseData.payment_link?.url ||
      !responseData.payment_link?.order_id
    ) {
      const errorDetail =
        responseData.errors?.[0]?.detail || 'Failed to create Square payment link';
      const squareErrorCode = responseData.errors?.[0]?.code;
      console.error(
        `Square API Error (${fetchResponse.status} - ${squareErrorCode}):`,
        JSON.stringify(responseData, null, 2)
      );
      await prisma.order
        .update({
          where: { id: dbOrder.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: 'FAILED',
            notes: `Square API Error: ${errorDetail} (Code: ${squareErrorCode})`,
          },
        })
        .catch(e => console.error('Failed to update order status on Square error:', e));
      return {
        success: false,
        error: `Payment provider error: ${errorDetail}`,
        checkoutUrl: null,
        orderId: dbOrder.id,
      };
    }

    const checkoutUrl = responseData.payment_link.url;
    // This is the Square Order ID associated with the *payment link itself*,
    // which might differ from the order ID created within the link if modifications occur.
    const squareOrderId = responseData.payment_link.order_id;
    console.log(
      `Square Checkout URL: ${checkoutUrl}, Square Order ID (from link): ${squareOrderId}`
    );

    // Update our order with the Square Order ID and payment URL from the payment link response
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await prisma.order.update({
      where: { id: dbOrder.id },
      data: {
        squareOrderId: squareOrderId, // Store the ID for reference
        paymentUrl: checkoutUrl,
        paymentUrlExpiresAt: expiresAt,
      },
    });

    console.log('Server Action finished successfully.');
    // Revalidate relevant paths to update caches
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${dbOrder.id}`);
    revalidatePath('/orders'); // User's order list
    revalidatePath(`/orders/${dbOrder.id}`); // Specific user order page

    return { success: true, error: null, checkoutUrl: checkoutUrl, orderId: dbOrder.id };
  } catch (error: any) {
    console.error('Error during Square API interaction or final update:', error);
    const errorMessage = error.message || 'An unexpected error occurred during checkout.';
    if (dbOrder?.id) {
      try {
        await prisma.order.update({
          where: { id: dbOrder.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: 'FAILED',
            notes: `Checkout Error: ${errorMessage}`,
          },
        });
      } catch (updateError: any) {
        console.error('Failed to update order status on final catch block:', updateError?.message);
      }
    }
    return { success: false, error: errorMessage, checkoutUrl: null, orderId: dbOrder?.id || null };
  }
}

/**
 * Generates a manual payment page URL for payment methods that require manual processing
 * Currently supports Cash only.
 */
export async function createManualPaymentOrder(formData: {
  items: z.infer<typeof CartItemSchema>[];
  customerInfo: z.infer<typeof CustomerInfoSchema>;
  fulfillment: z.infer<typeof FulfillmentSchema>;
  paymentMethod: PaymentMethod; // CASH, etc.
}): Promise<ServerActionResult> {
  console.log('Server Action: createManualPaymentOrder started.');

  // Validate the payment method is supported
  if (formData.paymentMethod !== 'CASH') {
    return {
      success: false,
      error: `Payment method ${formData.paymentMethod} is not supported for manual processing.`,
      checkoutUrl: null,
      orderId: null,
    };
  }

  // Reuse much of the same logic as createOrderAndGenerateCheckoutUrl
  // Validate input first
  const validationResult = PayloadSchema.safeParse(formData);
  if (!validationResult.success) {
    console.error('Invalid form data:', validationResult.error.errors);
    const errorMessage = validationResult.error.errors
      .map(e => `${e.path.join('.')} - ${e.message}`)
      .join('; ');
    return {
      success: false,
      error: `Invalid input: ${errorMessage}`,
      checkoutUrl: null,
      orderId: null,
    };
  }

  const { items, customerInfo, fulfillment, paymentMethod } = formData;

  // Check if store is open
  const storeOpen = await isStoreOpen();
  if (!storeOpen) {
    return {
      success: false,
      error: 'Store is currently closed. Please check our hours or try again later.',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // Add minimum order validation
  const orderValidation = await validateOrderMinimums(items);
  if (!orderValidation.isValid) {
    return {
      success: false,
      error: orderValidation.errorMessage || 'Order does not meet minimum requirements',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // --- Calculate Totals using Decimal.js ---
  let subtotal = new Decimal(0);
  const orderItemsData = items.map(item => {
    const itemPrice = new Decimal(item.price);
    const itemTotal = itemPrice.times(item.quantity);
    subtotal = subtotal.plus(itemTotal);
    return {
      productId: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      price: itemPrice,
    };
  });

  // Get tax rate from store settings
  const taxRateDecimal = await getTaxRate();
  const taxAmount = subtotal.times(new Decimal(taxRateDecimal)).toDecimalPlaces(2);
  const shippingCostCents =
    fulfillment.method === 'nationwide_shipping' ? fulfillment.shippingCost : 0;
  const shippingCostDecimal = new Decimal(shippingCostCents).dividedBy(100);
  const totalBeforeFee = subtotal.plus(taxAmount).plus(shippingCostDecimal);
  const serviceFeeAmount = totalBeforeFee.times(SERVICE_FEE_RATE).toDecimalPlaces(2);
  const finalTotal = totalBeforeFee.plus(serviceFeeAmount);

  console.log(`Manual Payment - Calculated Subtotal: ${subtotal.toFixed(2)}`);
  console.log(`Manual Payment - Calculated Tax: ${taxAmount.toFixed(2)}`);
  console.log(
    `Manual Payment - Calculated Shipping: ${shippingCostDecimal.toFixed(2)} (Cents: ${shippingCostCents})`
  );
  console.log(`Manual Payment - Calculated Service Fee: ${serviceFeeAmount.toFixed(2)}`);
  console.log(`Manual Payment - Calculated Final Total: ${finalTotal.toFixed(2)}`);

  // --- Prepare Fulfillment DB Data ---
  let dbFulfillmentData: Partial<Prisma.OrderCreateInput> = {
    fulfillmentType: fulfillment.method,
    notes: undefined,
    pickupTime: null,
    deliveryDate: null,
    deliveryTime: null,
    shippingMethodName: null,
    shippingCarrier: null,
    shippingServiceLevelToken: null,
    shippingCostCents: null,
    shippingRateId: null,
  };

  let pickupTimeISO: string | null = null;

  try {
    // Process fulfillment data based on method
    if (fulfillment.method === 'pickup') {
      pickupTimeISO = formatISO(parseISO(fulfillment.pickupTime));
      dbFulfillmentData.pickupTime = new Date(pickupTimeISO);
    } else if (fulfillment.method === 'local_delivery') {
      dbFulfillmentData.deliveryDate = fulfillment.deliveryDate;
      dbFulfillmentData.deliveryTime = fulfillment.deliveryTime;
      dbFulfillmentData.notes = JSON.stringify({
        deliveryAddress: fulfillment.deliveryAddress,
        deliveryInstructions: fulfillment.deliveryInstructions,
      });
    } else if (fulfillment.method === 'nationwide_shipping') {
      dbFulfillmentData.shippingMethodName = `${fulfillment.shippingCarrier} ${fulfillment.shippingMethod}`;
      dbFulfillmentData.shippingCarrier = fulfillment.shippingCarrier;
      dbFulfillmentData.shippingServiceLevelToken = fulfillment.shippingMethod;
      dbFulfillmentData.shippingCostCents = fulfillment.shippingCost;
      dbFulfillmentData.shippingRateId = fulfillment.rateId;
      dbFulfillmentData.notes = JSON.stringify({
        shippingAddress: fulfillment.shippingAddress,
      });
    }
  } catch (dateError: any) {
    console.error('Invalid date format provided for fulfillment:', dateError);
    return {
      success: false,
      error: 'Invalid date/time format for fulfillment.',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // Get current user from Supabase if available
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const supabaseUserId = user?.id;

  // Check if this is a catering order
  const hasCateringItems = await hasCateringProducts(items.map(item => item.id));

  // --- Database Order Creation ---
  let dbOrder: { id: string } | null = null;
  try {
    const orderInputData: Prisma.OrderCreateInput = {
      ...(supabaseUserId && { profile: { connect: { id: supabaseUserId } } }),
      status: OrderStatus.PENDING,
      paymentStatus: 'PENDING',
      paymentMethod: paymentMethod,
      total: finalTotal,
      taxAmount: taxAmount,
      customerName: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      isCateringOrder: hasCateringItems,
      ...dbFulfillmentData,
      items: {
        create: orderItemsData.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    };

    dbOrder = await prisma.order.create({
      data: orderInputData,
      select: { id: true },
    });
    console.log(
      `Manual payment order created with ID: ${dbOrder.id} (isCateringOrder: ${hasCateringItems})`
    );

    // Send new order alert to admin
    try {
      // Fetch the complete order with items for the alert
      const orderWithItems = await prisma.order.findUnique({
        where: { id: dbOrder.id },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      if (orderWithItems) {
        const alertService = new AlertService();
        await alertService.sendNewOrderAlert(orderWithItems);
        console.log(`New order alert sent for manual payment order ${dbOrder.id}`);
      }
    } catch (alertError: any) {
      console.error(
        `Failed to send new order alert for manual payment order ${dbOrder.id}:`,
        alertError
      );
      // Don't fail the order creation if alert fails
    }
  } catch (error: any) {
    console.error('Database Error creating manual payment order:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code, 'Meta:', error.meta);
    }
    return {
      success: false,
      error: error.message || 'Failed to save order details.',
      checkoutUrl: null,
      orderId: null,
    };
  }

  // Generate a payment page URL
  const origin = env.NEXT_PUBLIC_APP_URL;
  if (!origin) {
    console.error('Server Action Config Error: NEXT_PUBLIC_APP_URL is not set.');
    if (dbOrder?.id) {
      await prisma.order
        .update({
          where: { id: dbOrder.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: 'FAILED',
            notes: 'Missing base URL config',
          },
        })
        .catch(e => console.error('Failed to update order status on config error:', e));
    }
    return {
      success: false,
      error: 'Server configuration error: Base URL missing.',
      checkoutUrl: null,
      orderId: dbOrder?.id ?? null,
    };
  }

  // Create a custom checkout URL for the manual payment flow
  const paymentPageUrl = new URL(`/payment/${dbOrder!.id}`, origin);
  paymentPageUrl.searchParams.set('method', paymentMethod);

  console.log(`Manual Payment URL generated: ${paymentPageUrl}`);

  // Revalidate relevant paths
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${dbOrder!.id}`);
  revalidatePath('/orders');
  revalidatePath(`/orders/${dbOrder!.id}`);

  return {
    success: true,
    error: null,
    checkoutUrl: paymentPageUrl.toString(),
    orderId: dbOrder!.id,
  };
}

/**
 * Server action to validate order minimums with delivery zone support for catering orders
 * Ensures Prisma calls only happen on the server
 */
export async function validateOrderMinimumsServer(
  items: z.infer<typeof CartItemSchema>[],
  deliveryAddress?: { city?: string; postalCode?: string }
): Promise<{
  isValid: boolean;
  errorMessage: string | null;
  deliveryZone?: string;
  minimumRequired?: number;
  currentAmount?: number;
}> {
  if (!items || items.length === 0) {
    return { isValid: false, errorMessage: 'Your cart is empty' };
  }

  // Calculate cart total
  const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Check if this is a catering order
  const hasCateringItems = await hasCateringProducts(items.map(item => item.id));

  // If it's a catering order and we have delivery address, use delivery zone validation
  if (hasCateringItems && deliveryAddress) {
    // Import database-driven delivery zone functions
    const { determineDeliveryZone, validateMinimumPurchase } = await import('@/lib/delivery-zones');

    // Determine delivery zone from address
    const deliveryZone = await determineDeliveryZone(
      deliveryAddress.postalCode || '',
      deliveryAddress.city
    );

    if (!deliveryZone) {
      return {
        isValid: false,
        errorMessage:
          'Sorry, we currently do not deliver to this location. Please check our delivery zones or contact us for assistance.',
      };
    }

    // Validate minimum purchase for the zone
    const validation = await validateMinimumPurchase(cartTotal, deliveryZone);

    if (!validation.isValid) {
      return {
        isValid: false,
        errorMessage: validation.message || `Minimum order required for this delivery zone.`,
        deliveryZone: deliveryZone,
        minimumRequired: validation.minimumRequired,
        currentAmount: validation.currentAmount,
      };
    }

    return {
      isValid: true,
      errorMessage: null,
      deliveryZone: deliveryZone,
      minimumRequired: validation.minimumRequired,
      currentAmount: validation.currentAmount,
    };
  }

  // Fall back to store settings for non-catering orders or pickup orders
  const storeSettings = await prisma.storeSettings.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!storeSettings) {
    // Fall back to basic validation if store settings not found
    return { isValid: true, errorMessage: null };
  }

  // Convert store settings to numbers for comparison
  const minOrderAmount = Number(storeSettings.minOrderAmount);
  const cateringMinimumAmount = Number(storeSettings.cateringMinimumAmount);

  // Apply validation based on order type
  if (hasCateringItems && cartTotal < cateringMinimumAmount && cateringMinimumAmount > 0) {
    return {
      isValid: false,
      errorMessage: `Catering orders require a minimum purchase of $${cateringMinimumAmount.toFixed(2)}`,
      minimumRequired: cateringMinimumAmount,
      currentAmount: cartTotal,
    };
  } else if (cartTotal < minOrderAmount && minOrderAmount > 0) {
    return {
      isValid: false,
      errorMessage: `Orders require a minimum purchase of $${minOrderAmount.toFixed(2)}`,
      minimumRequired: minOrderAmount,
      currentAmount: cartTotal,
    };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Helper function to check if any products belong to catering category
 * Only used server-side by the validateOrderMinimumsServer function
 */
async function hasCateringProducts(productIds: string[]): Promise<boolean> {
  if (!productIds || productIds.length === 0) return false;

  try {
    // Find all products in the cart that belong to a catering category
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        category: {
          name: { contains: 'catering', mode: 'insensitive' }, // Case-insensitive search for 'catering'
        },
      },
    });

    // If any products are found, this is a catering order
    return Array.isArray(products) && products.length > 0;
  } catch (error) {
    console.error('Error checking catering products:', error);
    // In case of database error, assume it's not a catering order to prevent blocking orders
    return false;
  }
}

/**
 * Archive a single order
 */
export async function archiveOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return { success: false, error: 'Admin access required' };
    }

    // Check if order exists and is not already archived
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, isArchived: true },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.isArchived) {
      return { success: false, error: 'Order is already archived' };
    }

    // Archive the order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: user.id,
        archiveReason: reason || null,
      },
    });

    // Revalidate relevant paths
    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/archived');
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error archiving order:', error);
    return { success: false, error: error.message || 'Failed to archive order' };
  }
}

/**
 * Archive a single catering order
 */
export async function archiveCateringOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return { success: false, error: 'Admin access required' };
    }

    // Check if catering order exists and is not already archived
    const order = await prisma.cateringOrder.findUnique({
      where: { id: orderId },
      select: { id: true, isArchived: true },
    });

    if (!order) {
      return { success: false, error: 'Catering order not found' };
    }

    if (order.isArchived) {
      return { success: false, error: 'Catering order is already archived' };
    }

    // Archive the catering order
    await prisma.cateringOrder.update({
      where: { id: orderId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: user.id,
        archiveReason: reason || null,
      },
    });

    // Revalidate relevant paths
    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/archived');
    revalidatePath(`/admin/catering/${orderId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error archiving catering order:', error);
    return { success: false, error: error.message || 'Failed to archive catering order' };
  }
}

/**
 * Archive multiple orders (bulk operation)
 */
export async function archiveBulkOrders(
  orderIds: string[],
  reason?: string
): Promise<{ success: boolean; count: number; errors?: string[] }> {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, count: 0, errors: ['Authentication required'] };
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return { success: false, count: 0, errors: ['Admin access required'] };
    }

    // Limit bulk operations to prevent abuse
    if (orderIds.length > 100) {
      return { success: false, count: 0, errors: ['Too many orders for bulk operation (max 100)'] };
    }

    const errors: string[] = [];
    let successCount = 0;

    // Process each order
    for (const orderId of orderIds) {
      try {
        // Check if it's a regular order or catering order
        const regularOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, isArchived: true },
        });

        if (regularOrder) {
          if (regularOrder.isArchived) {
            errors.push(`Order ${orderId}: Already archived`);
            continue;
          }

          await prisma.order.update({
            where: { id: orderId },
            data: {
              isArchived: true,
              archivedAt: new Date(),
              archivedBy: user.id,
              archiveReason: reason || null,
            },
          });
          successCount++;
        } else {
          // Check if it's a catering order
          const cateringOrder = await prisma.cateringOrder.findUnique({
            where: { id: orderId },
            select: { id: true, isArchived: true },
          });

          if (cateringOrder) {
            if (cateringOrder.isArchived) {
              errors.push(`Catering order ${orderId}: Already archived`);
              continue;
            }

            await prisma.cateringOrder.update({
              where: { id: orderId },
              data: {
                isArchived: true,
                archivedAt: new Date(),
                archivedBy: user.id,
                archiveReason: reason || null,
              },
            });
            successCount++;
          } else {
            errors.push(`Order ${orderId}: Not found`);
          }
        }
      } catch (error: any) {
        errors.push(`Order ${orderId}: ${error.message || 'Unknown error'}`);
      }
    }

    // Revalidate relevant paths
    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/archived');

    return {
      success: successCount > 0,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('Error in bulk archive operation:', error);
    return { success: false, count: 0, errors: [error.message || 'Failed to archive orders'] };
  }
}

/**
 * Unarchive an order
 */
export async function unarchiveOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return { success: false, error: 'Admin access required' };
    }

    // Check if order exists and is archived
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, isArchived: true },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (!order.isArchived) {
      return { success: false, error: 'Order is not archived' };
    }

    // Unarchive the order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      },
    });

    // Revalidate relevant paths
    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/archived');
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error unarchiving order:', error);
    return { success: false, error: error.message || 'Failed to unarchive order' };
  }
}

/**
 * Unarchive a catering order
 */
export async function unarchiveCateringOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return { success: false, error: 'Admin access required' };
    }

    // Check if catering order exists and is archived
    const order = await prisma.cateringOrder.findUnique({
      where: { id: orderId },
      select: { id: true, isArchived: true },
    });

    if (!order) {
      return { success: false, error: 'Catering order not found' };
    }

    if (!order.isArchived) {
      return { success: false, error: 'Catering order is not archived' };
    }

    // Unarchive the catering order
    await prisma.cateringOrder.update({
      where: { id: orderId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      },
    });

    // Revalidate relevant paths
    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/archived');
    revalidatePath(`/admin/catering/${orderId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error unarchiving catering order:', error);
    return { success: false, error: error.message || 'Failed to unarchive catering order' };
  }
}

/**
 * Get archived orders with pagination and filtering
 */
export async function getArchivedOrders(params: {
  page?: number;
  search?: string;
  type?: 'all' | 'regular' | 'catering';
  reason?: string;
  archivedBy?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  orders: any[];
  totalCount: number;
  totalPages: number;
  error?: string;
}> {
  try {
    const { page = 1, search = '', type = 'all', reason, archivedBy, startDate, endDate } = params;

    const itemsPerPage = 15;
    const skip = (page - 1) * itemsPerPage;

    let allOrders: any[] = [];
    let totalCount = 0;

    // Build where conditions for regular orders
    const regularOrdersWhere: any = {
      isArchived: true,
    };

    if (search) {
      regularOrdersWhere.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (reason) {
      regularOrdersWhere.archiveReason = { contains: reason, mode: 'insensitive' };
    }

    if (archivedBy) {
      regularOrdersWhere.archivedBy = archivedBy;
    }

    if (startDate && endDate) {
      regularOrdersWhere.archivedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Build where conditions for catering orders
    const cateringOrdersWhere: any = {
      isArchived: true,
    };

    if (search) {
      cateringOrdersWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (reason) {
      cateringOrdersWhere.archiveReason = { contains: reason, mode: 'insensitive' };
    }

    if (archivedBy) {
      cateringOrdersWhere.archivedBy = archivedBy;
    }

    if (startDate && endDate) {
      cateringOrdersWhere.archivedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (type === 'all' || type === 'regular') {
      const regularOrders = await prisma.order.findMany({
        where: regularOrdersWhere,
        include: {
          items: true,
          archivedByUser: {
            select: { name: true, email: true },
          },
        },
        orderBy: { archivedAt: 'desc' },
        ...(type === 'regular' ? { skip, take: itemsPerPage } : {}),
      });

      const serializedRegularOrders = regularOrders.map(order => {
        const { total, taxAmount, items, ...rest } = order;
        return {
          ...rest,
          type: 'regular' as const,
          total: total.toNumber(),
          taxAmount: taxAmount.toNumber(),
          items: items.map(item => {
            const { price, ...itemRest } = item;
            return {
              ...itemRest,
              price: price.toNumber(),
            };
          }),
        };
      });

      allOrders.push(...serializedRegularOrders);

      if (type === 'regular') {
        totalCount = await prisma.order.count({ where: regularOrdersWhere });
      }
    }

    if (type === 'all' || type === 'catering') {
      const cateringOrders = await prisma.cateringOrder.findMany({
        where: cateringOrdersWhere,
        include: {
          items: true,
          archivedByUser: {
            select: { name: true, email: true },
          },
        },
        orderBy: { archivedAt: 'desc' },
        ...(type === 'catering' ? { skip, take: itemsPerPage } : {}),
      });

      const serializedCateringOrders = cateringOrders.map(order => {
        const { totalAmount, deliveryFee, items, ...rest } = order;
        return {
          ...rest,
          type: 'catering' as const,
          total: totalAmount.toNumber(),
          deliveryFee: deliveryFee?.toNumber(),
          items: items.map(item => {
            const { pricePerUnit, totalPrice, ...itemRest } = item;
            return {
              ...itemRest,
              pricePerUnit: pricePerUnit.toNumber(),
              totalPrice: totalPrice.toNumber(),
            };
          }),
        };
      });

      allOrders.push(...serializedCateringOrders);

      if (type === 'catering') {
        totalCount = await prisma.cateringOrder.count({ where: cateringOrdersWhere });
      }
    }

    // If fetching all types, we need to sort and paginate manually
    if (type === 'all') {
      // Sort by archived date (most recent first)
      allOrders.sort((a, b) => {
        const aDate = new Date(a.archivedAt || 0);
        const bDate = new Date(b.archivedAt || 0);
        return bDate.getTime() - aDate.getTime();
      });

      totalCount = allOrders.length;
      allOrders = allOrders.slice(skip, skip + itemsPerPage);
    }

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return {
      success: true,
      orders: allOrders,
      totalCount,
      totalPages,
    };
  } catch (error: any) {
    console.error('Error fetching archived orders:', error);
    return {
      success: false,
      orders: [],
      totalCount: 0,
      totalPages: 0,
      error: error.message || 'Failed to fetch archived orders',
    };
  }
}
