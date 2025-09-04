import { randomUUID } from 'crypto';
import { logger } from '@/utils/logger';
import { formatPhoneForSquarePaymentLink, formatEmailForSquare } from './formatting';

export interface SquareCheckoutLinkParams {
  orderId: string;
  locationId: string;
  lineItems: Array<{
    name: string;
    quantity: string;
    basePriceMoney: {
      amount: number;
      currency: string;
    };
  }>;
  redirectUrl: string;
  customerEmail?: string;
  customerName?: string;    // ADD
  customerPhone?: string;   // ADD
  merchantSupportEmail?: string;
}

export interface SquareCheckoutResponse {
  checkoutUrl: string;
  checkoutId: string;
  orderId: string;
}

/**
 * Creates a Square checkout link for catering orders using direct HTTP API
 * This allows customers to pay via Square's hosted checkout page
 */
export async function createCheckoutLink(params: SquareCheckoutLinkParams): Promise<SquareCheckoutResponse> {
  try {
    logger.info('Creating Square checkout link', {
      orderId: params.orderId,
      locationId: params.locationId,
      itemCount: params.lineItems.length,
      customerEmail: params.customerEmail
    });

    // DEBUG: Log environment variables
    console.error('🔧 [CHECKOUT-LINKS] NODE_ENV:', process.env.NODE_ENV);
    console.error('🔧 [CHECKOUT-LINKS] USE_SQUARE_SANDBOX:', process.env.USE_SQUARE_SANDBOX);
    console.error('🔧 [CHECKOUT-LINKS] SQUARE_TRANSACTIONS_USE_SANDBOX:', process.env.SQUARE_TRANSACTIONS_USE_SANDBOX);

    // Get Square access token from environment
    const accessToken = process.env.SQUARE_SANDBOX_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Square access token not configured');
    }

    // Fix environment detection to properly use sandbox in development
    const useTransactionSandbox = process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';
    const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
    const isProduction = process.env.NODE_ENV === 'production' && !useSandbox && !useTransactionSandbox;
    
    const BASE_URL = isProduction 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';

    console.error('🔧 [CHECKOUT-LINKS] isProduction:', isProduction);
    console.error('🔧 [CHECKOUT-LINKS] BASE_URL:', BASE_URL);

    // Use correct location ID - LMV06M1ER6HCC for sandbox (Default Test Account), provided locationId for production
    const actualLocationId = isProduction ? params.locationId : 'LMV06M1ER6HCC';
    
    console.error('🔧 [CHECKOUT-LINKS] actualLocationId:', actualLocationId);

    // Generate idempotency key with catering context to prevent duplicates
    const idempotencyKey = `catering_${params.orderId}_${Date.now()}`;
    
    const squareRequestBody = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: actualLocationId,
        reference_id: params.orderId,
        line_items: params.lineItems.map(item => ({
          quantity: item.quantity,
          base_price_money: {
            amount: item.basePriceMoney.amount,
            currency: item.basePriceMoney.currency,
          },
          name: item.name,
        })),
        // Add fulfillment to mark this as a FOOD order (pickup type)
        fulfillments: [{
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            schedule_type: 'SCHEDULED',
            recipient: {
              display_name: params.customerName || 'Catering Customer',
              email_address: params.customerEmail,
              phone_number: params.customerPhone,
            },
            note: 'Catering order - please prepare for scheduled pickup',
          },
        }],
        // Add metadata to explicitly identify this as a catering/food order
        metadata: {
          order_type: 'CATERING',
          fulfillment_type: 'FOOD',
          source: 'catering_checkout',
          idempotency_key: idempotencyKey,
        },
      },
      checkout_options: {
        redirect_url: params.redirectUrl,
        merchant_support_email: params.merchantSupportEmail || process.env.ADMIN_EMAIL,
      },
      pre_populated_data: (() => {
        const data: any = {};
        
        // Note: Cannot set buyer_email when fulfillments are present per Square API
        // Customer email is already set in fulfillment recipient details above
        
        // Format phone number for Square API compatibility - this is allowed with fulfillments
        if (params.customerPhone) {
          const formattedPhone = formatPhoneForSquarePaymentLink(params.customerPhone);
          if (formattedPhone) {
            data.buyer_phone_number = formattedPhone;
          }
        }
        
        return data;
      })(),
    };
    
    logger.info('Sending Square payment link request', { 
      baseUrl: BASE_URL,
      requestBody: squareRequestBody 
    });
    
    const paymentLinkUrl = `${BASE_URL}/v2/online-checkout/payment-links`;
    const fetchResponse = await fetch(paymentLinkUrl, {
      method: 'POST',
      headers: {
        'Square-Version': '2025-05-21',
        'Authorization': `Bearer ${accessToken}`,
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
      !responseData.payment_link?.id
    ) {
      const errorDetail = responseData.errors?.[0]?.detail || 'Failed to create Square payment link';
      const squareErrorCode = responseData.errors?.[0]?.code;
      
      logger.error(`Square API Error (${fetchResponse.status} - ${squareErrorCode}):`, {
        responseData,
        requestBody: squareRequestBody
      });
      
      throw new Error(`Square API Error: ${errorDetail} (Code: ${squareErrorCode})`);
    }
    
    logger.info('Successfully created Square checkout link', { 
      checkoutId: responseData.payment_link.id,
      checkoutUrl: responseData.payment_link.url
    });

    console.error('🔧 [CHECKOUT-LINKS] SUCCESS! Final checkout URL:', responseData.payment_link.url);

    return {
      checkoutUrl: responseData.payment_link.url,
      checkoutId: responseData.payment_link.id,
      orderId: responseData.payment_link.order_id,
    };
  } catch (error) {
    logger.error('Error creating Square checkout link:', error);
    
    throw new Error(`Failed to create checkout link: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to format catering items for Square checkout
 */
export function formatCateringItemsForSquare(items: Array<{
  name: string;
  quantity: number;
  pricePerUnit: number;
}>): Array<{
  name: string;
  quantity: string;
  basePriceMoney: {
    amount: number;
    currency: string;
  };
}> {
  return items.map(item => ({
    name: item.name,
    quantity: String(item.quantity),
    basePriceMoney: {
      amount: Math.round(item.pricePerUnit * 100), // Convert to cents
      currency: 'USD',
    },
  }));
}

/**
 * Helper function to add delivery fee as a line item
 */
export function addDeliveryFeeLineItem(
  lineItems: Array<{
    name: string;
    quantity: string;
    basePriceMoney: {
      amount: number;
      currency: string;
    };
  }>,
  deliveryFee: number
): Array<{
  name: string;
  quantity: string;
  basePriceMoney: {
    amount: number;
    currency: string;
  };
}> {
  if (deliveryFee <= 0) {
    return lineItems;
  }

  return [
    ...lineItems,
    {
      name: 'Delivery Fee',
      quantity: '1',
      basePriceMoney: {
        amount: Math.round(deliveryFee * 100), // Convert to cents
        currency: 'USD',
      },
    },
  ];
}
