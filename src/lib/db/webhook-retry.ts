import { ensureWebhookConnection } from './webhook-connection';

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  onRetry?: (error: any, attempt: number) => void;
}

export async function withWebhookRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options?: RetryOptions
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const initialDelay = options?.initialDelay ?? 100;
  const maxDelay = options?.maxDelay ?? 2000;
  const factor = options?.factor ?? 2;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Ensure connection before each attempt
      await ensureWebhookConnection();

      const result = await operation();

      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable =
        error.code === 'P1001' || // Can't reach database
        error.code === 'P1002' || // Database timeout
        error.code === 'P2024' || // Pool timeout
        error.message?.includes('Engine is not yet connected') ||
        error.message?.includes('Cannot read properties of undefined') ||
        error.message?.includes('getInstance is undefined');

      if (!isRetryable || attempt === maxAttempts) {
        console.error(`❌ ${operationName} failed after ${attempt} attempts:`, error);
        throw error;
      }

      const delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);
      console.warn(`⚠️ ${operationName} attempt ${attempt} failed, retrying in ${delay}ms...`);

      if (options?.onRetry) {
        options.onRetry(error, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
