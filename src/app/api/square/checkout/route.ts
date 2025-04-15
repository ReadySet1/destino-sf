import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { createOrder } from '@/app/actions';

// Environment variables for Square
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://connect.squareup.com' 
  : 'https://connect.sandbox.squareup.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Define address schema
const addressSchema = z.object({
  street: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

// Define fulfillment schemas for different methods
const pickupFulfillmentSchema = z.object({
  method: z.literal('pickup'),
  pickupTime: z.string(),
});

const deliveryFulfillmentSchema = z.object({
  method: z.literal('delivery'),
  deliveryAddress: addressSchema,
  deliveryTime: z.string(),
  deliveryInstructions: z.string().optional(),
});

const shippingFulfillmentSchema = z.object({
  method: z.literal('shipping'),
  shippingAddress: addressSchema,
  shippingMethod: z.string(),
});

// Combine fulfillment schemas
const fulfillmentSchema = z.discriminatedUnion('method', [
  pickupFulfillmentSchema,
  deliveryFulfillmentSchema,
  shippingFulfillmentSchema,
]);

// Validation schema for the request body
const checkoutRequestSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number(),
      variantId: z.string().optional(),
    })
  ),
  customerInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    pickupTime: z.string(),
  }),
  fulfillment: fulfillmentSchema,
});

// Type for Square Checkout API request
interface SquareCheckoutRequest {
  idempotencyKey: string;
  order: {
    lineItems: Array<{
      quantity: string;
      catalogObjectId: string;
      name: string;
      basePriceMoney: {
        amount: number;
        currency: string;
      };
    }>;
    locationId: string | undefined;
    fulfillments?: Array<{
      type: string;
      state: string;
      pickupDetails?: {
        pickupAt: string;
        note?: string;
        recipient?: {
          customerId?: string;
          displayName: string;
          emailAddress?: string;
          phoneNumber?: string;
        };
      };
      deliveryDetails?: {
        deliveryAt: string;
        note?: string;
        recipient?: {
          customerId?: string;
          displayName: string;
          emailAddress?: string;
          phoneNumber?: string;
          address?: {
            addressLine1: string;
            addressLine2?: string;
            locality: string;
            administrativeDistrictLevel1: string;
            postalCode: string;
            country: string;
          };
        };
      };
      shipmentDetails?: {
        recipient?: {
          customerId?: string;
          displayName: string;
          emailAddress?: string;
          phoneNumber?: string;
          address?: {
            addressLine1: string;
            addressLine2?: string;
            locality: string;
            administrativeDistrictLevel1: string;
            postalCode: string;
            country: string;
          };
        };
        carrier?: string;
        shippingNote?: string;
      };
    }>;
  };
  checkoutOptions: {
    allowTipping: boolean;
    redirectUrl: string;
    merchantSupportEmail: string;
  };
  prePopulateBuyerEmail?: string;
  prePopulateShippingAddress?: {
    fullName?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = checkoutRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('Invalid checkout request:', validationResult.error);
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { items, customerInfo, fulfillment } = validationResult.data;
    
    // First, save the order to our database
    const orderResult = await createOrder({
      items,
      customerInfo,
      fulfillmentData: fulfillment,
    });
    
    if (!orderResult.success) {
      return NextResponse.json(
        { error: 'Failed to create order', details: orderResult.error },
        { status: 500 }
      );
    }
    
    // Create line items for Square
    const lineItems = items.map(item => ({
      quantity: item.quantity.toString(),
      catalogObjectId: item.id,
      name: item.name,
      basePriceMoney: {
        amount: Math.round(item.price * 100), // Convert to cents
        currency: 'USD'
      }
    }));
    
    // Create order for checkout
    const order: any = {
      lineItems,
      locationId: SQUARE_LOCATION_ID,
    };
    
    // Add fulfillment details based on the selected method
    if (fulfillment) {
      const squareFulfillments = [];
      
      if (fulfillment.method === 'pickup') {
        squareFulfillments.push({
          type: 'PICKUP',
          state: 'PROPOSED',
          pickupDetails: {
            pickupAt: fulfillment.pickupTime,
            recipient: {
              displayName: customerInfo.name,
              emailAddress: customerInfo.email,
              phoneNumber: customerInfo.phone,
            },
          },
        });
      } else if (fulfillment.method === 'delivery') {
        squareFulfillments.push({
          type: 'DELIVERY',
          state: 'PROPOSED',
          deliveryDetails: {
            deliveryAt: fulfillment.deliveryTime,
            recipient: {
              displayName: customerInfo.name,
              emailAddress: customerInfo.email,
              phoneNumber: customerInfo.phone,
              address: {
                addressLine1: fulfillment.deliveryAddress.street,
                addressLine2: fulfillment.deliveryAddress.street2,
                locality: fulfillment.deliveryAddress.city,
                administrativeDistrictLevel1: fulfillment.deliveryAddress.state,
                postalCode: fulfillment.deliveryAddress.postalCode,
                country: fulfillment.deliveryAddress.country,
              },
            },
            note: fulfillment.deliveryInstructions,
          },
        });
      } else if (fulfillment.method === 'shipping') {
        squareFulfillments.push({
          type: 'SHIPMENT',
          state: 'PROPOSED',
          shipmentDetails: {
            recipient: {
              displayName: customerInfo.name,
              emailAddress: customerInfo.email,
              phoneNumber: customerInfo.phone,
              address: {
                addressLine1: fulfillment.shippingAddress.street,
                addressLine2: fulfillment.shippingAddress.street2,
                locality: fulfillment.shippingAddress.city,
                administrativeDistrictLevel1: fulfillment.shippingAddress.state,
                postalCode: fulfillment.shippingAddress.postalCode,
                country: fulfillment.shippingAddress.country,
              },
            },
            carrier: fulfillment.shippingMethod,
          },
        });
      }
      
      if (squareFulfillments.length > 0) {
        order.fulfillments = squareFulfillments;
      }
    }
    
    // Create payment link request
    const checkoutRequest: SquareCheckoutRequest = {
      idempotencyKey: crypto.randomUUID(),
      order,
      checkoutOptions: {
        allowTipping: true,
        redirectUrl: `${APP_URL}/order-confirmation/${orderResult.orderId}?status=success`,
        merchantSupportEmail: process.env.MERCHANT_SUPPORT_EMAIL || 'support@destino-sf.com',
      },
    };
    
    // Add pre-populated buyer information
    checkoutRequest.prePopulateBuyerEmail = customerInfo.email;
    checkoutRequest.prePopulateShippingAddress = {
      fullName: customerInfo.name
    };
    
    // Call Square Checkout API to create payment link
    const response = await fetch(`${SQUARE_API_URL}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2023-12-13',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutRequest)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      logger.error('Square Checkout API error:', responseData);
      return NextResponse.json(
        { 
          error: 'Failed to create checkout session',
          details: responseData.errors || 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    // Return the checkout URL to the client
    return NextResponse.json({
      success: true,
      orderId: orderResult.orderId,
      checkoutUrl: responseData.paymentLink.url,
      paymentLinkId: responseData.paymentLink.id,
      longUrl: responseData.paymentLink.longUrl,
    });
  } catch (error) {
    logger.error('Error creating Square checkout:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 