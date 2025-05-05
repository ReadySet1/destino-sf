'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { formatISO, parseISO } from 'date-fns';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

// Define our own PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = "SQUARE",
  VENMO = "VENMO",
  CASH = "CASH"
}

// Re-add BigInt patch if needed directly in actions, or ensure it runs globally
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

// --- Constants ---
const TAX_RATE = new Decimal(0.0825); // 8.25%
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
  shippingAddress: addressSchema,
  shippingMethod: z.string(),      // Service level TOKEN (e.g., "usps_priority")
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

interface DeliveryFulfillment { // This seems potentially outdated? FulfillmentSchema covers it.
  method: 'delivery';
  deliveryAddress: Address;
  deliveryTime: string;
  deliveryInstructions?: string;
}

interface ShippingFulfillment { // This seems potentially outdated? FulfillmentSchema covers it.
  method: 'shipping';
  shippingAddress: Address;
  shippingMethod: string;
}

interface LocalDeliveryFulfillment { // This seems potentially outdated? FulfillmentSchema covers it.
  method: 'local_delivery';
  deliveryAddress: Address;
  deliveryDate: string;
  deliveryTime: string;
  deliveryInstructions?: string;
  // Add fields for delivery fee
  deliveryFee?: number;
  deliveryZone?: string | null;
}

interface NationwideShippingFulfillment { // This seems potentially outdated? FulfillmentSchema covers it.
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

type OrderItem = { // Potentially internal type for getOrderById
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
}

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
  console.warn("createOrder function called. Consider using createOrderAndGenerateCheckoutUrl instead.");
  try {
    const supabase = await createClient(); // Assumes server-side usage
    const { data: { user } } = await supabase.auth.getUser();

    // Calculate total price (using basic number math, consider Decimal.js for accuracy)
    const totalPrice = orderData.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

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
          variantId: item.variantId
        }))
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
      } else if (method === 'local_delivery' && 'deliveryDate' in orderData.fulfillmentData && 'deliveryTime' in orderData.fulfillmentData) {
         orderCreateData.deliveryDate = orderData.fulfillmentData.deliveryDate;
         orderCreateData.deliveryTime = orderData.fulfillmentData.deliveryTime;
         // Store address/instructions in notes or dedicated fields
         orderCreateData.notes = JSON.stringify({ 
             deliveryAddress: orderData.fulfillmentData.deliveryAddress,
             deliveryInstructions: orderData.fulfillmentData.deliveryInstructions 
         });
         // Potentially set pickupTime as placeholder if required by schema
         orderCreateData.pickupTime = new Date(); 
      } else if (method === 'nationwide_shipping' && 'shippingAddress' in orderData.fulfillmentData) {
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
export async function updateOrderPayment(orderId: string, squareOrderId: string, paymentStatus: 'PAID' | 'FAILED' = 'PAID', notes?: string) {
  try {
    // No Supabase client needed if just updating Prisma
    await prisma.order.update({
      where: { id: orderId },
      data: {
        squareOrderId, // Update Square Order ID if needed
        paymentStatus: paymentStatus,
        // Use PROCESSING status after payment confirmation
        status: paymentStatus === 'PAID' ? OrderStatus.PROCESSING : OrderStatus.CANCELLED,
        notes: notes ? notes : undefined // Append or set notes if provided
      }
    });

    revalidatePath(`/admin/orders/${orderId}`); // Revalidate specific order page
    revalidatePath('/admin/orders');
    revalidatePath(`/orders/${orderId}`); // Revalidate user order page
    revalidatePath('/orders');

    return { success: true };
  } catch (error) {
    console.error('Error updating order payment:', error);
    const message = error instanceof Error ? error.message : 'Failed to update order payment';
    return { success: false, error: message };
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
            product: { select: { name: true } }, // Select only needed fields
            variant: { select: { name: true } }  // Select only needed fields
          }
        }
      }
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Attempt to parse fulfillment data stored in notes (legacy or for complex types)
    let parsedNotesFulfillment = null;
    if (order.notes) {
      try {
        parsedNotesFulfillment = JSON.parse(order.notes);
      } catch (e) {
        console.warn('Could not parse fulfillment data from notes for order:', orderId, e);
        // Potentially store the raw notes string if parsing fails but notes exist
        parsedNotesFulfillment = { rawNotes: order.notes }; 
      }
    }

    // Construct the response object, preferring dedicated fields over parsed notes
    const responseOrder = {
      id: order.id,
      status: order.status,
      totalAmount: order.total.toNumber(), // Convert Decimal to number for client
      customerName: order.customerName,
      email: order.email,
      phone: order.phone,
      pickupTime: order.pickupTime?.toISOString(), // Use optional chaining
      deliveryDate: order.deliveryDate, // Include if present
      deliveryTime: order.deliveryTime, // Include if present
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      fulfillmentType: order.fulfillmentType,
      shippingMethodName: order.shippingMethodName,
      shippingCarrier: order.shippingCarrier,
      shippingCostCents: order.shippingCostCents,
      shippingServiceLevelToken: order.shippingServiceLevelToken,
      trackingNumber: order.trackingNumber,
      // Include parsed notes only if necessary or for specific fields like address
      // Example: Extract delivery address if stored in notes
      deliveryAddress: parsedNotesFulfillment?.deliveryAddress as Address | undefined,
      deliveryInstructions: parsedNotesFulfillment?.deliveryInstructions as string | undefined,
      shippingAddress: parsedNotesFulfillment?.shippingAddress as Address | undefined,
      // Raw notes might be useful for debugging or displaying complex info
      notes: order.notes,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price.toNumber(), // Convert Decimal to number
        variantName: item.variant?.name
      }))
    };

    return { success: true, order: responseOrder };
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
    paymentMethod: PaymentMethod; // VENMO, CASH, etc.
}): Promise<ServerActionResult> {
    console.log("Server Action: createOrderAndGenerateCheckoutUrl started.");
    console.log("Received Fulfillment Data:", JSON.stringify(formData.fulfillment, null, 2));
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
    const { data: { user } } = await supabase.auth.getUser();
    const supabaseUserId = user?.id;

    // Validate input using Zod schema before processing
    const validationResult = PayloadSchema.safeParse(formData);
    if (!validationResult.success) {
        console.error("Invalid form data:", validationResult.error.errors);
        // Combine Zod errors into a single message
        const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join('; ');
        return { success: false, error: `Invalid input: ${errorMessage}`, checkoutUrl: null, orderId: null };
    }

    const { items, customerInfo, fulfillment, paymentMethod } = validationResult.data; // Use validated data

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

    const taxAmount = subtotal.times(TAX_RATE).toDecimalPlaces(2);

    // Get shipping cost directly from the validated fulfillment data
    const shippingCostCents = fulfillment.method === 'nationwide_shipping' ? fulfillment.shippingCost : 0;
    const shippingCostDecimal = new Decimal(shippingCostCents).dividedBy(100);

    const totalBeforeFee = subtotal.plus(taxAmount).plus(shippingCostDecimal);
    const serviceFeeAmount = totalBeforeFee.times(SERVICE_FEE_RATE).toDecimalPlaces(2);
    const finalTotal = totalBeforeFee.plus(serviceFeeAmount);

    console.log(`Calculated Subtotal: ${subtotal.toFixed(2)}`);
    console.log(`Calculated Tax: ${taxAmount.toFixed(2)}`);
    console.log(`Calculated Shipping: ${shippingCostDecimal.toFixed(2)} (Cents: ${shippingCostCents})`);
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

    try { // Separate try for parsing dates/preparing fulfillment data
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
         console.error("Invalid date format provided for fulfillment:", dateError);
         return { success: false, error: "Invalid date/time format for fulfillment.", checkoutUrl: null, orderId: null };
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
        console.log(`Database order created with ID: ${dbOrder.id}`);
    } catch (error: any) {
        console.error("Database Error creating order:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             console.error("Prisma Error Code:", error.code, "Meta:", error.meta);
        }
        return { success: false, error: error.message || "Failed to save order details.", checkoutUrl: null, orderId: null };
    }

    // --- Square API Interaction --- 
    const locationId = process.env.SQUARE_LOCATION_ID;
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const squareEnv = process.env.SQUARE_ENVIRONMENT || 'sandbox'; // Default to sandbox
    const supportEmail = process.env.SUPPORT_EMAIL;

    if (!locationId || !accessToken) {
        console.error('Server Action Config Error: Missing Square Location ID or Access Token.');
        if (dbOrder?.id) {
             await prisma.order.update({ where: { id: dbOrder.id }, data: { status: OrderStatus.CANCELLED, paymentStatus: 'FAILED', notes: 'Square config error (missing credentials)' } }).catch(e => console.error("Failed to update order status on config error:", e));
        }
        return { success: false, error: 'Payment provider configuration error.', checkoutUrl: null, orderId: dbOrder?.id ?? null };
    }

    const BASE_URL = squareEnv === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    try {
        // --- Prepare Square Line Items --- 
        const squareLineItems: any[] = items.map(item => ({
            quantity: item.quantity.toString(),
            base_price_money: {
                 amount: Math.round(item.price * 100), // Price in cents
                 currency: "USD"
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
                 percentage: TAX_RATE.times(100).toFixed(2), // e.g., "8.25"
                 scope: 'ORDER', // Apply to order subtotal (before service fees)
             });
         }

        // --- Prepare Square Fulfillment --- 
        let squareFulfillment: any = null; // Initialize as null
        const squareRecipient = { // Define recipient once
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
                 }
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
                     deliver_at: formatISO(parseISO(`${fulfillment.deliveryDate}T${fulfillment.deliveryTime}:00`)), 
                     delivery_instructions: fulfillment.deliveryInstructions,
                     carrier_code: 'CUSTOM', // Indicate local delivery
                 }
             };
        } else if (fulfillment.method === 'nationwide_shipping' && fulfillment.shippingAddress) {
             const address = fulfillment.shippingAddress;
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
                 }
             };
        }

        // --- Prepare Square Checkout Options --- 
        const origin = process.env.NEXT_PUBLIC_APP_URL;
        if (!origin) {
            console.error('Server Action Config Error: NEXT_PUBLIC_APP_URL is not set.');
             if (dbOrder?.id) { await prisma.order.update({ where: { id: dbOrder.id }, data: { status: OrderStatus.CANCELLED, paymentStatus: 'FAILED', notes: 'Missing base URL config' } }).catch(e => console.error("Failed to update order status on config error:", e)); }
            return { success: false, error: 'Server configuration error: Base URL missing.', checkoutUrl: null, orderId: dbOrder?.id ?? null };
        }
        // Use URL constructor for robust query parameter handling
        const redirectUrl = new URL('/order-confirmation', origin);
        redirectUrl.searchParams.set('status', 'success');
        redirectUrl.searchParams.set('orderId', dbOrder.id);

        const cancelUrl = new URL('/cart', origin);
        cancelUrl.searchParams.set('status', 'cancelled');
        cancelUrl.searchParams.set('orderId', dbOrder.id); // Include orderId in cancel URL

        const squareCheckoutOptions = {
            allow_tipping: false,
            redirect_url: redirectUrl.toString(),
            merchant_support_email: supportEmail || customerInfo.email, // Fallback to customer email
            ask_for_shipping_address: false, // Provided via fulfillment
            accepted_payment_methods: {
                apple_pay: true,
                google_pay: true,
                cash_app_pay: false,
                afterpay_clearpay: false,
                venmo: true
            },
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

        console.log("Calling Square Create Payment Link API...");
        const paymentLinkUrl = `${BASE_URL}/v2/online-checkout/payment-links`;
        const fetchResponse = await fetch(paymentLinkUrl, {
             method: 'POST',
             headers: {
                 'Square-Version': '2024-01-18', // Use a recent API version
                 'Authorization': `Bearer ${accessToken}`,
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(squareRequestBody),
        });

        const responseData = await fetchResponse.json();

        // Check for fetch errors OR Square API errors in the response body
        if (!fetchResponse.ok || responseData.errors || !responseData.payment_link?.url || !responseData.payment_link?.order_id) {
             const errorDetail = responseData.errors?.[0]?.detail || 'Failed to create Square payment link';
             const squareErrorCode = responseData.errors?.[0]?.code;
             console.error(`Square API Error (${fetchResponse.status} - ${squareErrorCode}):`, JSON.stringify(responseData, null, 2));
             await prisma.order.update({
                 where: { id: dbOrder.id },
                 data: { status: OrderStatus.CANCELLED, paymentStatus: 'FAILED', notes: `Square API Error: ${errorDetail} (Code: ${squareErrorCode})` }
             }).catch(e => console.error("Failed to update order status on Square error:", e));
             return { success: false, error: `Payment provider error: ${errorDetail}`, checkoutUrl: null, orderId: dbOrder.id };
        }

        const checkoutUrl = responseData.payment_link.url;
        // This is the Square Order ID associated with the *payment link itself*, 
        // which might differ from the order ID created within the link if modifications occur.
        const squareOrderId = responseData.payment_link.order_id; 
        console.log(`Square Checkout URL: ${checkoutUrl}, Square Order ID (from link): ${squareOrderId}`);

        // Update our order with the Square Order ID from the payment link response
        await prisma.order.update({
             where: { id: dbOrder.id },
             data: { squareOrderId: squareOrderId } // Store the ID for reference
        });

        console.log("Server Action finished successfully.");
        // Revalidate relevant paths to update caches
        revalidatePath('/admin/orders'); 
        revalidatePath(`/admin/orders/${dbOrder.id}`);
        revalidatePath('/orders'); // User's order list
        revalidatePath(`/orders/${dbOrder.id}`); // Specific user order page

        return { success: true, error: null, checkoutUrl: checkoutUrl, orderId: dbOrder.id };

    } catch (error: any) {
        console.error("Error during Square API interaction or final update:", error);
        const errorMessage = error.message || "An unexpected error occurred during checkout.";
        if (dbOrder?.id) { 
             try {
                  await prisma.order.update({
                       where: { id: dbOrder.id },
                       data: { status: OrderStatus.CANCELLED, paymentStatus: 'FAILED', notes: `Checkout Error: ${errorMessage}` }
                  });
             } catch (updateError: any) {
                  console.error("Failed to update order status on final catch block:", updateError?.message);
             }
        }
        return { success: false, error: errorMessage, checkoutUrl: null, orderId: dbOrder?.id || null };
    }
}

/**
 * Generates a manual payment page URL for payment methods that require manual processing
 * Currently supports Venmo.
 */
export async function createManualPaymentOrder(formData: {
    items: z.infer<typeof CartItemSchema>[];
    customerInfo: z.infer<typeof CustomerInfoSchema>;
    fulfillment: z.infer<typeof FulfillmentSchema>;
    paymentMethod: PaymentMethod; // VENMO, CASH, etc.
}): Promise<ServerActionResult> {
    console.log("Server Action: createManualPaymentOrder started.");
    
    // Validate the payment method is supported
    if (formData.paymentMethod !== 'VENMO' && formData.paymentMethod !== 'CASH') {
        return { 
            success: false, 
            error: `Payment method ${formData.paymentMethod} is not supported for manual processing.`, 
            checkoutUrl: null, 
            orderId: null 
        };
    }

    // Reuse much of the same logic as createOrderAndGenerateCheckoutUrl
    // Validate input first
    const validationResult = PayloadSchema.safeParse(formData);
    if (!validationResult.success) {
        console.error("Invalid form data:", validationResult.error.errors);
        const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')} - ${e.message}`).join('; ');
        return { success: false, error: `Invalid input: ${errorMessage}`, checkoutUrl: null, orderId: null };
    }

    const { items, customerInfo, fulfillment, paymentMethod } = formData;

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

    const taxAmount = subtotal.times(TAX_RATE).toDecimalPlaces(2);
    const shippingCostCents = fulfillment.method === 'nationwide_shipping' ? fulfillment.shippingCost : 0;
    const shippingCostDecimal = new Decimal(shippingCostCents).dividedBy(100);
    const totalBeforeFee = subtotal.plus(taxAmount).plus(shippingCostDecimal);
    const serviceFeeAmount = totalBeforeFee.times(SERVICE_FEE_RATE).toDecimalPlaces(2);
    const finalTotal = totalBeforeFee.plus(serviceFeeAmount);

    console.log(`Manual Payment - Calculated Subtotal: ${subtotal.toFixed(2)}`);
    console.log(`Manual Payment - Calculated Tax: ${taxAmount.toFixed(2)}`);
    console.log(`Manual Payment - Calculated Shipping: ${shippingCostDecimal.toFixed(2)} (Cents: ${shippingCostCents})`);
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
         console.error("Invalid date format provided for fulfillment:", dateError);
         return { success: false, error: "Invalid date/time format for fulfillment.", checkoutUrl: null, orderId: null };
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
    const { data: { user } } = await supabase.auth.getUser();
    const supabaseUserId = user?.id;

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
        console.log(`Manual payment order created with ID: ${dbOrder.id}`);
    } catch (error: any) {
        console.error("Database Error creating manual payment order:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             console.error("Prisma Error Code:", error.code, "Meta:", error.meta);
        }
        return { success: false, error: error.message || "Failed to save order details.", checkoutUrl: null, orderId: null };
    }

    // Generate a payment page URL
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
        console.error('Server Action Config Error: NEXT_PUBLIC_APP_URL is not set.');
        if (dbOrder?.id) { 
            await prisma.order.update({ 
                where: { id: dbOrder.id }, 
                data: { 
                    status: OrderStatus.CANCELLED, 
                    paymentStatus: 'FAILED', 
                    notes: 'Missing base URL config' 
                } 
            }).catch(e => console.error("Failed to update order status on config error:", e)); 
        }
        return { 
            success: false, 
            error: 'Server configuration error: Base URL missing.', 
            checkoutUrl: null, 
            orderId: dbOrder?.id ?? null 
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
        orderId: dbOrder!.id 
    };
} 