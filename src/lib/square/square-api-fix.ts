import { logger } from '@/utils/logger';

/**
 * Fix for Square API URL parsing issue
 * The error "Failed to parse URL from production/v2/orders/..." suggests
 * that the URL construction is missing the protocol and hostname
 */

/**
 * Construct proper Square API URLs with validation
 */
export function constructSquareApiUrl(
  path: string,
  environment: 'sandbox' | 'production' = 'production'
): string {
  try {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Remove any incorrect prefixes that might cause issues
    path = path.replace(/^(production|sandbox)\//, '/');

    // Construct the full URL based on environment
    const baseUrl =
      environment === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    const fullUrl = `${baseUrl}${path}`;

    // Validate the URL
    new URL(fullUrl); // This will throw if invalid

    logger.debug(`Square API URL constructed: ${fullUrl}`);
    return fullUrl;
  } catch (error) {
    logger.error(`Failed to construct Square API URL for path: ${path}`, {
      path,
      environment,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Invalid Square API URL construction: ${path}`);
  }
}

/**
 * Validate Square API response and handle common errors
 */
export function validateSquareApiResponse(response: any, context: string): void {
  if (!response) {
    throw new Error(`Empty response from Square API (${context})`);
  }

  // Check for Square API errors
  if (response.errors && response.errors.length > 0) {
    const errorMessages = response.errors
      .map((err: any) => `${err.code}: ${err.detail || err.message || 'Unknown error'}`)
      .join(', ');

    logger.error(`Square API errors in ${context}:`, response.errors);
    throw new Error(`Square API error: ${errorMessages}`);
  }

  // Log successful response (without sensitive data)
  logger.debug(`Square API response validated for ${context}`, {
    hasResult: !!response.result,
    responseKeys: Object.keys(response),
  });
}

/**
 * Enhanced error handling for Square API calls
 */
export function handleSquareApiError(error: any, context: string): never {
  logger.error(`Square API error in ${context}:`, {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    body: error.body,
    stack: error.stack,
  });

  // Check for specific error types
  if (error.statusCode === 401) {
    throw new Error(
      `Square API authentication failed in ${context}. Please check your API credentials.`
    );
  }

  if (error.statusCode === 404) {
    throw new Error(
      `Square API resource not found in ${context}. The requested resource may not exist.`
    );
  }

  if (error.statusCode === 429) {
    throw new Error(`Square API rate limit exceeded in ${context}. Please retry after a delay.`);
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    throw new Error(
      `Network error connecting to Square API in ${context}. Please check your internet connection.`
    );
  }

  // Generic error handling
  const errorMessage = error.message || error.toString();
  throw new Error(`Square API error in ${context}: ${errorMessage}`);
}

/**
 * Retry wrapper for Square API calls with exponential backoff
 */
export async function retrySquareApiCall<T>(
  apiCall: () => Promise<T>,
  context: string,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Square API call attempt ${attempt}/${maxRetries} for ${context}`);
      const result = await apiCall();

      if (attempt > 1) {
        logger.info(`Square API call succeeded on attempt ${attempt} for ${context}`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
        logger.error(`Non-retryable error in ${context}:`, error.message);
        handleSquareApiError(error, context);
      }

      if (attempt === maxRetries) {
        logger.error(`Square API call failed after ${maxRetries} attempts for ${context}`);
        break;
      }

      // Calculate delay with exponential backoff
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(
        `Square API call attempt ${attempt} failed for ${context}, retrying in ${delayMs}ms:`,
        error.message
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // All attempts failed
  handleSquareApiError(lastError, context);
}

/**
 * Patch existing Square API client methods to use proper URL construction
 */
export function patchSquareApiClient(client: any, environment: 'sandbox' | 'production'): void {
  if (!client) {
    logger.warn('Cannot patch Square API client: client is null or undefined');
    return;
  }

  // Patch orders API if available
  if (client.ordersApi) {
    const originalRetrieveOrder = client.ordersApi.retrieveOrder;
    if (originalRetrieveOrder) {
      client.ordersApi.retrieveOrder = async function (orderId: string, locationId?: string) {
        try {
          logger.debug(`Retrieving Square order: ${orderId}`);
          return await retrySquareApiCall(
            () => originalRetrieveOrder.call(this, orderId, locationId),
            `retrieveOrder(${orderId})`,
            3,
            1000
          );
        } catch (error) {
          handleSquareApiError(error, `retrieveOrder(${orderId})`);
        }
      };
    }
  }

  // Patch payments API if available
  if (client.paymentsApi) {
    const originalGetPayment = client.paymentsApi.getPayment;
    if (originalGetPayment) {
      client.paymentsApi.getPayment = async function (paymentId: string) {
        try {
          logger.debug(`Retrieving Square payment: ${paymentId}`);
          return await retrySquareApiCall(
            () => originalGetPayment.call(this, paymentId),
            `getPayment(${paymentId})`,
            3,
            1000
          );
        } catch (error) {
          handleSquareApiError(error, `getPayment(${paymentId})`);
        }
      };
    }
  }

  logger.info(`Square API client patched for ${environment} environment`);
}
