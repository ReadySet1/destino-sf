// Add this patch at the top of the file
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

import { SquareClient } from 'square';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { formatISO } from 'date-fns';

// Initialize Square client with appropriate environment
const square = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'development' ? 'sandbox' : 'production',
});

// Define expected request body structure
interface Item {
  id: string;
  name: string;
  price: number; // Assuming price is a number
  quantity: number;
  variantId?: string;
}

interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  pickupTime?: string; // Included but might not be needed directly here
}

interface Fulfillment {
  method: 'pickup' | 'delivery' | 'shipping';
  pickupTime?: string; // Format: YYYY-MM-DDTHH:mm:00 from frontend
  deliveryTime?: string; // Format: YYYY-MM-DDTHH:mm:00 from frontend
  deliveryAddress?: Address;
  deliveryInstructions?: string;
  shippingAddress?: Address;
  shippingMethod?: string;
}

interface RequestBody {
  items: Item[];
  customerInfo: CustomerInfo;
  fulfillment: Fulfillment;
}

// Updated type guard for structural check
interface PotentialSquareError {
    errors?: Array<{ category?: string; code?: string; detail?: string; field?: string }>;
    statusCode?: number;
    [key: string]: any; // Allow other properties
}
function isPotentialSquareError(error: unknown): error is PotentialSquareError {
  return typeof error === 'object' && error !== null && ('errors' in error || 'statusCode' in error);
}

// Map back to string country codes based on migration guide examples
const mapCountryCode = (code: string | undefined): string | undefined => {
    if (!code) return undefined;
    const upperCaseCode = code.toUpperCase();
    // Return standard codes directly as strings
    if (upperCaseCode === 'US') return 'US';
    if (upperCaseCode === 'CA') return 'CA';
    // Add other supported countries as needed, returning their string codes
    console.warn(`Unsupported country code: ${code}. Returning original.`);
    return upperCaseCode; // Return the original code or undefined if strict validation is needed
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { items, customerInfo, fulfillment } = body;

    // Validate required environment variables
    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!process.env.SQUARE_ACCESS_TOKEN) {
        console.error('Server Configuration Error: SQUARE_ACCESS_TOKEN is not set.');
        return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
    }
     if (!locationId) {
        console.error('Server Configuration Error: SQUARE_LOCATION_ID is not set.');
        return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
    }

    if (!items?.length) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      );
    }

    // Create line items for Square checkout
    const lineItems = items.map((item) => {
        // Validate price is a number before converting
        const priceInCents = typeof item.price === 'number' ? Math.round(item.price * 100) : 0;
        if (priceInCents <= 0) {
            console.warn(`Invalid price for item ${item.name}: ${item.price}. Setting to 0.`);
            // Optionally throw an error or handle differently
        }
        return {
          quantity: item.quantity.toString(),
          basePriceMoney: {
            amount: BigInt(Math.round(item.price * 100)),
            currency: "USD" as any,
          },
          name: item.name,
          // You might need item.variation_name or item.variantId depending on your Square setup
          // catalogObjectId: item.variantId, // If using catalog items
        };
    });

    // Prepare fulfillment data with corrected time format
    let fulfillmentData: any = { // Use 'any' for simplicity or define a stricter Square type
      type: fulfillment.method.toUpperCase(),
    };

    if (fulfillment.method === 'pickup' && fulfillment.pickupTime) {
      try {
          // Ensure pickupTime is a valid date string before parsing
          const pickupDate = new Date(fulfillment.pickupTime);
          if (isNaN(pickupDate.getTime())) {
            throw new Error('Invalid pickup date/time format');
          }
          fulfillmentData.pickupDetails = {
            pickupAt: formatISO(pickupDate), // Convert to RFC 3339 using date-fns
            note: 'Please bring your ID for pickup',
            // Add recipient details if needed by Square for pickup
            recipient: {
                displayName: customerInfo.name,
                emailAddress: customerInfo.email,
                phoneNumber: customerInfo.phone,
            }
          };
      } catch (dateError) {
          console.error('Error parsing pickup time:', dateError);
          return NextResponse.json({ success: false, error: 'Invalid pickup time format provided.' }, { status: 400 });
      }
    } else if (fulfillment.method === 'delivery' && fulfillment.deliveryTime && fulfillment.deliveryAddress) {
       try {
           const deliveryDate = new Date(fulfillment.deliveryTime);
            if (isNaN(deliveryDate.getTime())) {
               throw new Error('Invalid delivery date/time format');
           }
           const deliveryCountry = mapCountryCode(fulfillment.deliveryAddress.country);
           if (!deliveryCountry) {
               console.error(`Unsupported country code for delivery: ${fulfillment.deliveryAddress.country}`);
               return NextResponse.json({ success: false, error: `Unsupported country code for delivery: ${fulfillment.deliveryAddress.country}` }, { status: 400 });
           }
           fulfillmentData.deliveryDetails = {
             deliverAt: formatISO(deliveryDate),
             recipient: {
               displayName: customerInfo.name,
               emailAddress: customerInfo.email,
               phoneNumber: customerInfo.phone,
               address: {
                 addressLine1: fulfillment.deliveryAddress.street,
                 addressLine2: fulfillment.deliveryAddress.street2 || undefined, // Use undefined for optional fields
                 locality: fulfillment.deliveryAddress.city,
                 administrativeDistrictLevel1: fulfillment.deliveryAddress.state,
                 postalCode: fulfillment.deliveryAddress.postalCode,
                 country: deliveryCountry as any, // Use string code + type assertion
               },
             },
             note: fulfillment.deliveryInstructions || undefined, // Use undefined for optional fields
           };
       } catch (dateError) {
           console.error('Error parsing delivery time:', dateError);
           return NextResponse.json({ success: false, error: 'Invalid delivery time format provided.' }, { status: 400 });
       }
    } else if (fulfillment.method === 'shipping' && fulfillment.shippingAddress) {
        const shippingCountry = mapCountryCode(fulfillment.shippingAddress.country);
         if (!shippingCountry) {
             console.error(`Unsupported country code for shipping: ${fulfillment.shippingAddress.country}`);
             return NextResponse.json({ success: false, error: `Unsupported country code for shipping: ${fulfillment.shippingAddress.country}` }, { status: 400 });
         }
      fulfillmentData.shippingDetails = {
        recipient: {
          displayName: customerInfo.name,
          emailAddress: customerInfo.email,
          phoneNumber: customerInfo.phone,
          address: {
            addressLine1: fulfillment.shippingAddress.street,
            addressLine2: fulfillment.shippingAddress.street2 || undefined, // Use undefined
            locality: fulfillment.shippingAddress.city,
            administrativeDistrictLevel1: fulfillment.shippingAddress.state,
            postalCode: fulfillment.shippingAddress.postalCode,
            country: shippingCountry as any, // Use string code + type assertion
          },
        },
        // You might need shipping options here depending on your setup
      };
    }

    console.log("Sending to Square:", JSON.stringify({ fulfillmentData, lineItems }, null, 2)); // Log what's being sent

    // Create a payment link using Square's Checkout API
    const response = await square.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId: locationId, // Use validated locationId
        lineItems,
        fulfillments: [fulfillmentData],
      },
      checkoutOptions: {
        allowTipping: true,
        // Only ask for shipping address if fulfillment is shipping AND we haven't provided it
        askForShippingAddress: fulfillment.method === 'shipping',
        merchantSupportEmail: process.env.SUPPORT_EMAIL || customerInfo.email, // Fallback email
        acceptedPaymentMethods: {
          applePay: true,
          googlePay: true,
          cashAppPay: false, // Adjust based on your needs
          afterpayClearpay: false, // Adjust based on your needs
        },
      },
      prePopulatedData: {
        buyerEmail: customerInfo.email,
        buyerPhoneNumber: customerInfo.phone,
        // Pre-populate address only if it's delivery or shipping
        ...( (fulfillment.method === 'delivery' && fulfillment.deliveryAddress) ||
             (fulfillment.method === 'shipping' && fulfillment.shippingAddress) ) && {
               buyerAddress: {
                   addressLine1: fulfillment.deliveryAddress?.street || fulfillment.shippingAddress?.street,
                   addressLine2: fulfillment.deliveryAddress?.street2 || fulfillment.shippingAddress?.street2 || undefined,
                   locality: fulfillment.deliveryAddress?.city || fulfillment.shippingAddress?.city,
                   administrativeDistrictLevel1: fulfillment.deliveryAddress?.state || fulfillment.shippingAddress?.state,
                   postalCode: fulfillment.deliveryAddress?.postalCode || fulfillment.shippingAddress?.postalCode,
                   country: mapCountryCode(fulfillment.deliveryAddress?.country || fulfillment.shippingAddress?.country) as any,
               }
           }
      },
      // Consider removing paymentNote or simplifying it if not strictly needed
      // paymentNote: JSON.stringify({ customerInfo, fulfillmentMethod: fulfillment.method }),
    });

    if (response.paymentLink?.url) {
      console.log("Square Payment Link URL:", response.paymentLink.url);
      return NextResponse.json({
        success: true,
        checkoutUrl: response.paymentLink.url,
      });
    } else {
      console.error('Square API did not return a payment link URL.', response);
      throw new Error('Failed to get checkout URL from Square');
    }
  } catch (error: unknown) { // Catch error as unknown
     console.error('Checkout API Error:', error);

     // Use updated structural type guard
     if (isPotentialSquareError(error)) {
         console.error('Square API Error Details:', JSON.stringify(error.errors || error, null, 2)); // Log errors or whole object
         const specificError = error.errors?.[0]?.detail || 'Failed to communicate with payment provider.';
          return NextResponse.json(
              { success: false, error: specificError },
              { status: error.statusCode || 500 }
          );
     } else if (error instanceof Error) {
        // Handle generic JavaScript errors
         return NextResponse.json(
              { success: false, error: error.message || 'An unexpected error occurred.' },
              { status: 500 }
          );
     }

    // Fallback for non-Error objects
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session due to an internal server error.' },
      { status: 500 }
    );
  }
} 