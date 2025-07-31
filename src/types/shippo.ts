/**
 * TypeScript interfaces and types for Shippo API integration
 */

export interface ShippoClientConfig {
  apiKeyHeader: string;
  serverURL?: string;
}

export interface ShippoTransactionRequest {
  rate: string;
  labelFileType: 'PDF' | 'PDF_4x6' | 'PNG';
  async: boolean;
  metadata?: string;
}

export interface ShippoTransactionResponse {
  object_id: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  labelUrl?: string;
  trackingNumber?: string;
  messages?: Array<{ text: string; type: string }>;
  eta?: string;
}

export interface ShippingLabelResponse {
  success: boolean;
  labelUrl?: string;
  trackingNumber?: string;
  error?: string;
  errorCode?: string;
  retryAttempt?: number;
}

/**
 * Discriminated union for different types of Shippo errors
 */
export type ShippoError = 
  | { type: 'RATE_EXPIRED'; rateId: string; message: string }
  | { type: 'API_INITIALIZATION'; message: string }
  | { type: 'TRANSACTION_FAILED'; details: string; messages?: Array<{ text: string; type: string }> }
  | { type: 'NETWORK_ERROR'; message: string; statusCode?: number }
  | { type: 'VALIDATION_ERROR'; field: string; message: string }
  | { type: 'RETRY_EXHAUSTED'; attempts: number; lastError: string };

/**
 * Type guard to check if error indicates rate expiration
 */
export function isRateExpiredError(error: any): boolean {
  if (typeof error === 'string') {
    const lowerError = error.toLowerCase();
    return lowerError.includes('rate') && 
           (lowerError.includes('expired') || 
            lowerError.includes('not found') || 
            lowerError.includes('invalid'));
  }
  
  if (error && typeof error === 'object') {
    const message = error.message || error.details || '';
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase();
      return lowerMessage.includes('rate') && 
             (lowerMessage.includes('expired') || 
              lowerMessage.includes('not found') || 
              lowerMessage.includes('invalid'));
    }
  }
  
  return false;
}

/**
 * Create a ShippoError from an unknown error
 */
export function createShippoError(error: unknown, context?: string): ShippoError {
  if (error instanceof Error) {
    const message = error.message;
    
    // Check for rate expiration
    if (isRateExpiredError(message)) {
      return {
        type: 'RATE_EXPIRED',
        rateId: '', // Will be filled in by calling code
        message: message,
      };
    }
    
    // Check for network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('ECONNRESET')) {
      return {
        type: 'NETWORK_ERROR',
        message: message,
      };
    }
    
    // Check for validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        type: 'VALIDATION_ERROR',
        field: context || 'unknown',
        message: message,
      };
    }
    
    // Default to transaction failed
    return {
      type: 'TRANSACTION_FAILED',
      details: message,
    };
  }
  
  // Handle non-Error objects
  const errorMessage = typeof error === 'string' ? error : 'Unknown error occurred';
  return {
    type: 'TRANSACTION_FAILED',
    details: errorMessage,
  };
}

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};