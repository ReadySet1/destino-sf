import { logger } from '@/utils/logger';
import https from 'https';
import type { GiftCardError } from '@/types/square';

// Function to get the current Square configuration
function getSquareConfig() {
  const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
  
  let accessToken;
  let tokenSource;
  
  if (useSandbox) {
    accessToken = process.env.SQUARE_SANDBOX_TOKEN;
    tokenSource = 'SQUARE_SANDBOX_TOKEN';
  } else if (process.env.NODE_ENV === 'production') {
    accessToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
    tokenSource = process.env.SQUARE_PRODUCTION_TOKEN ? 'SQUARE_PRODUCTION_TOKEN' : 'SQUARE_ACCESS_TOKEN';
  } else {
    accessToken = process.env.SQUARE_ACCESS_TOKEN;
    tokenSource = 'SQUARE_ACCESS_TOKEN';
  }
  
  const apiHost = useSandbox ? 'sandbox.squareup.com' : 'connect.squareup.com';
    
  return {
    useSandbox,
    accessToken,
    apiHost,
    tokenSource
  };
}

/**
 * Makes an HTTPS request to the Square API
 */
async function httpsRequest(options: any, requestBody?: any): Promise<any> {
  const squareConfig = getSquareConfig();
  
  if (!squareConfig.accessToken) {
    throw new Error(`Square access token not configured for ${squareConfig.tokenSource}`);
  }
  
  if (options.headers) {
    options.headers['Authorization'] = `Bearer ${squareConfig.accessToken}`;
  }
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            // Enhanced error handling for gift card payments (2025-05-21 update)
            if (parsedData.errors) {
              const enhancedErrors = parsedData.errors.map((error: any) => {
                // Check for gift card insufficient funds error
                if (error.code === 'INSUFFICIENT_FUNDS') {
                  // Look for accompanying GIFT_CARD_AVAILABLE_AMOUNT error
                  const giftCardError = parsedData.errors.find((e: any) => 
                    e.code === 'GIFT_CARD_AVAILABLE_AMOUNT'
                  );
                  
                  if (giftCardError) {
                    logger.info('Gift card insufficient funds with available amount:', {
                      availableAmount: giftCardError.available_amount,
                      requestedAmount: error.requested_amount
                    });
                  }
                }
                return error;
              });
              
              parsedData.errors = enhancedErrors;
            }
            
            if (res.statusCode === 401) {
              logger.error(`Authentication error with token from ${squareConfig.tokenSource}`);
            }
            
            reject(new Error(`Request failed with status: ${res.statusCode}, body: ${JSON.stringify(parsedData)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (requestBody) {
      req.write(JSON.stringify(requestBody));
    }
    
    req.end();
  });
}

/**
 * Enhanced CreatePayment with improved gift card error handling (2025-05-21 update)
 * Now always returns GIFT_CARD_AVAILABLE_AMOUNT with INSUFFICIENT_FUNDS for gift cards
 */
export async function createPayment(requestBody: {
  source_id: string;
  idempotency_key: string;
  amount_money: {
    amount: number;
    currency: string;
  };
  app_fee_money?: {
    amount: number;
    currency: string;
  };
  delay_duration?: string;
  statement_descriptor?: string;
  tip_money?: {
    amount: number;
    currency: string;
  };
  team_member_id?: string;
  autocomplete?: boolean;
  order_id?: string;
  customer_id?: string;
  location_id?: string;
  reference_id?: string;
  note?: string;
}): Promise<{
  result?: {
    payment: any;
  };
  errors?: Array<{
    code: string;
    detail?: string;
    field?: string;
    available_amount?: {
      amount: number;
      currency: string;
    };
  }>;
}> {
  const squareConfig = getSquareConfig();
  
  logger.info(`Creating payment on ${squareConfig.apiHost}`);
  
  const options = {
    hostname: squareConfig.apiHost,
    path: '/v2/payments',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    return {
      result: {
        payment: response.payment
      }
    };
  } catch (error) {
    logger.error('Error creating payment:', error);
    
    // Parse error response for enhanced gift card error handling
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorMatch = errorMessage.match(/body: (.+)$/);
      if (errorMatch) {
        const errorBody = JSON.parse(errorMatch[1]);
        if (errorBody.errors) {
          return {
            errors: errorBody.errors
          };
        }
      }
    } catch (parseError) {
      logger.error('Error parsing payment error response:', parseError);
    }
    
    throw error;
  }
}

/**
 * Enhanced payment error handler that specifically handles gift card errors
 */
export function handleGiftCardPaymentError(errors: any[]): {
  isGiftCardError: boolean;
  availableAmount?: { amount: number; currency: string };
  insufficientFunds: boolean;
} {
  // Check for various gift card error codes
  const giftCardErrorCodes = [
    'GIFT_CARD_INSUFFICIENT_FUNDS',
    'GIFT_CARD_AVAILABLE_AMOUNT',
    'INSUFFICIENT_FUNDS' // When used with gift cards
  ];
  
  const insufficientFunds = errors.some(error => 
    error.code === 'INSUFFICIENT_FUNDS' || error.code === 'GIFT_CARD_INSUFFICIENT_FUNDS'
  );
  
  // Look for any gift card specific error
  const giftCardError = errors.find(error => 
    giftCardErrorCodes.includes(error.code) || 
    error.code?.includes('GIFT_CARD')
  );
  
  // Check for available amount in gift card error or accompanying error
  const availableAmountError = errors.find(error => 
    error.code === 'GIFT_CARD_AVAILABLE_AMOUNT' || error.available_amount
  );
  
  return {
    isGiftCardError: !!giftCardError,
    availableAmount: availableAmountError?.available_amount || giftCardError?.available_amount,
    insufficientFunds
  };
}

/**
 * Helper function to format gift card error messages for users
 */
export function formatGiftCardErrorMessage(
  availableAmount: { amount: number; currency: string },
  requestedAmount: { amount: number; currency: string }
): string {
  const availableFormatted = (availableAmount.amount / 100).toFixed(2);
  const requestedFormatted = (requestedAmount.amount / 100).toFixed(2);
  
  return `Gift card has insufficient funds. Available: $${availableFormatted}, Requested: $${requestedFormatted}`;
}

/**
 * Direct Payments API implementation object
 */
export const directPaymentsApi = {
  createPayment,
  handleGiftCardPaymentError,
  formatGiftCardErrorMessage
}; 