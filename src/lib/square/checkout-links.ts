import { randomUUID } from 'crypto';
import { logger } from '@/utils/logger';

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
  merchantSupportEmail?: string;
}

export interface SquareCheckoutResponse {
  checkoutUrl: string;
  checkoutId: string;
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

    // Get Square access token from environment
    const accessToken = process.env.SQUARE_SANDBOX_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Square access token not configured');
    }

    // Determine the base URL based on environment
    const isProduction = process.env.NODE_ENV === 'production' && !process.env.USE_SQUARE_SANDBOX;
    const BASE_URL = isProduction 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';

    const squareRequestBody = {
      idempotency_key: randomUUID(),
      order: {
        location_id: params.locationId,
        reference_id: params.orderId,
        line_items: params.lineItems.map(item => ({
          quantity: item.quantity,
          base_price_money: {
            amount: item.basePriceMoney.amount,
            currency: item.basePriceMoney.currency,
          },
          name: item.name,
        })),
      },
      checkout_options: {
        redirect_url: params.redirectUrl,
        merchant_support_email: params.merchantSupportEmail || process.env.ADMIN_EMAIL,
      },
      pre_populated_data: {
        buyer_email: params.customerEmail,
      },
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

    return {
      checkoutUrl: responseData.payment_link.url,
      checkoutId: responseData.payment_link.id,
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
