/**
 * HTTP Timeout Utilities
 *
 * Provides timeout handling for HTTP requests and async operations.
 * Part of DES-60 Phase 3: Network & Timeout Resilience
 */

/**
 * Timeout error thrown when an operation exceeds its timeout limit
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    public readonly operationName?: string
  ) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Wraps a promise with a timeout
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message (optional)
 * @param operationName - Name of the operation for logging (optional)
 * @returns Promise that rejects with TimeoutError if timeout is exceeded
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'API request timed out',
 *   'fetchUserData'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string,
  operationName?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const message =
        errorMessage ||
        `Operation${operationName ? ` '${operationName}'` : ''} timed out after ${timeoutMs}ms`;
      reject(new TimeoutError(message, timeoutMs, operationName));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Configuration for timeout with retry
 */
export interface TimeoutWithRetryConfig {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay between retries in milliseconds */
  retryDelayMs?: number;
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs?: number;
  /** Operation name for logging */
  operationName?: string;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Default function to determine if an error is retryable
 */
function defaultIsRetryable(error: Error): boolean {
  // Retry on timeout errors and network errors
  if (error instanceof TimeoutError) return true;
  if (error.message.includes('ETIMEDOUT')) return true;
  if (error.message.includes('ECONNRESET')) return true;
  if (error.message.includes('ECONNREFUSED')) return true;
  if (error.message.includes('Network')) return true;

  return false;
}

/**
 * Wraps a promise with timeout and automatic retry logic
 *
 * @param promiseFactory - Function that creates a new promise (called on each attempt)
 * @param config - Timeout and retry configuration
 * @returns Promise that resolves with the result or rejects after all retries exhausted
 *
 * @example
 * ```typescript
 * const result = await withTimeoutAndRetry(
 *   () => fetch('https://api.example.com/data'),
 *   {
 *     timeoutMs: 5000,
 *     maxRetries: 3,
 *     retryDelayMs: 1000,
 *     exponentialBackoff: true,
 *     operationName: 'fetchUserData'
 *   }
 * );
 * ```
 */
export async function withTimeoutAndRetry<T>(
  promiseFactory: () => Promise<T>,
  config: TimeoutWithRetryConfig
): Promise<T> {
  const {
    timeoutMs,
    maxRetries = 3,
    retryDelayMs = 1000,
    exponentialBackoff = true,
    maxDelayMs = 30000,
    operationName,
    isRetryable = defaultIsRetryable,
  } = config;

  let lastError: Error;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const promise = promiseFactory();
      const result = await withTimeout(
        promise,
        timeoutMs,
        undefined,
        operationName ? `${operationName} (attempt ${attempt + 1}/${maxRetries + 1})` : undefined
      );
      return result;
    } catch (error) {
      lastError = error as Error;
      attempt++;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt > maxRetries || !isRetryable(lastError)) {
        throw lastError;
      }

      // Calculate delay with optional exponential backoff
      let delay = retryDelayMs;
      if (exponentialBackoff) {
        delay = Math.min(retryDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      }

      // Add jitter (0-500ms) to prevent thundering herd
      const jitter = Math.random() * 500;
      delay += jitter;

      // Log retry attempt if operation name is provided
      if (operationName) {
        console.warn(
          `[${operationName}] Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`,
          lastError.message
        );
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Creates an AbortController that aborts after a timeout
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with AbortController and cleanup function
 *
 * @example
 * ```typescript
 * const { controller, cleanup } = createTimeoutController(5000);
 * try {
 *   const response = await fetch('https://api.example.com', {
 *     signal: controller.signal
 *   });
 *   cleanup();
 *   return response;
 * } catch (error) {
 *   cleanup();
 *   throw error;
 * }
 * ```
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return { controller, cleanup };
}

/**
 * Wraps a fetch request with timeout using AbortController
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds
 * @returns Fetch response
 *
 * @example
 * ```typescript
 * const response = await fetchWithTimeout(
 *   'https://api.example.com/data',
 *   { method: 'POST', body: JSON.stringify(data) },
 *   5000
 * );
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const { controller, cleanup } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    cleanup();
    return response;
  } catch (error) {
    cleanup();

    // Convert AbortError to TimeoutError for consistency
    if ((error as Error).name === 'AbortError') {
      throw new TimeoutError(`Fetch request timed out after ${timeoutMs}ms`, timeoutMs);
    }

    throw error;
  }
}

/**
 * Checks if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Checks if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const networkErrorPatterns = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ENETUNREACH',
    'Network',
    'network',
    'timeout',
    'timed out',
  ];

  return networkErrorPatterns.some(pattern => error.message.includes(pattern));
}
