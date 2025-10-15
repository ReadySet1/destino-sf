/**
 * Enhanced Webhook Error Handler
 *
 * Provides better error handling and reporting for webhook processing,
 * with special attention to database connection issues.
 */

import { getDatabaseInfo } from './db-environment-validator';
import { errorMonitor } from './error-monitoring';

export interface WebhookError {
  type: 'database' | 'validation' | 'processing' | 'network' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  suggestedActions: string[];
  canRetry: boolean;
}

export interface WebhookErrorContext {
  webhookType: string;
  eventId?: string;
  orderId?: string;
  environment: string;
  timestamp: Date;
}

/**
 * Analyzes an error and categorizes it for better handling
 */
export function analyzeWebhookError(
  error: Error | any,
  context: WebhookErrorContext
): WebhookError {
  const errorMessage = error?.message || String(error);
  const errorCode = error?.code;

  // Database connection errors
  if (isDatabaseConnectionError(error)) {
    return analyzeDatabaseError(error, context);
  }

  // Prisma-specific errors
  if (isPrismaError(error)) {
    return analyzePrismaError(error, context);
  }

  // Network/timeout errors
  if (isNetworkError(error)) {
    return {
      type: 'network',
      severity: 'medium',
      message: `Network error during ${context.webhookType} processing`,
      details: {
        error: errorMessage,
        code: errorCode,
        eventId: context.eventId,
        orderId: context.orderId,
      },
      suggestedActions: [
        'Retry the operation',
        'Check network connectivity',
        'Verify external service availability',
      ],
      canRetry: true,
    };
  }

  // Validation errors
  if (isValidationError(error)) {
    return {
      type: 'validation',
      severity: 'medium',
      message: `Data validation error in ${context.webhookType}`,
      details: {
        error: errorMessage,
        eventId: context.eventId,
        orderId: context.orderId,
      },
      suggestedActions: [
        'Check webhook payload format',
        'Verify required fields are present',
        'Review data schema changes',
      ],
      canRetry: false,
    };
  }

  // Default unknown error
  return {
    type: 'unknown',
    severity: 'high',
    message: `Unexpected error in ${context.webhookType} processing`,
    details: {
      error: errorMessage,
      code: errorCode,
      stack: error?.stack,
      eventId: context.eventId,
      orderId: context.orderId,
    },
    suggestedActions: [
      'Review error logs for more details',
      'Check for recent code changes',
      'Contact development team if issue persists',
    ],
    canRetry: true,
  };
}

/**
 * Analyzes database-specific errors
 */
function analyzeDatabaseError(error: Error | any, context: WebhookErrorContext): WebhookError {
  const errorMessage = error?.message || String(error);
  const dbInfo = getDatabaseInfo();

  // Check for environment mismatch
  if (errorMessage.includes('drrejylrcjbeldnzodjd') && context.environment === 'production') {
    return {
      type: 'database',
      severity: 'critical',
      message: 'CRITICAL: Production environment using development database',
      details: {
        error: errorMessage,
        currentEnvironment: context.environment,
        databaseBeingAccessed: 'development (drrejylrcjbeldnzodjd)',
        expectedDatabase: 'production (ocusztulyiegeawqptrs)',
        eventId: context.eventId,
        orderId: context.orderId,
      },
      suggestedActions: [
        'IMMEDIATE: Update DATABASE_URL to production database',
        'Redeploy application with correct configuration',
        'Verify environment variables in deployment platform',
      ],
      canRetry: false,
    };
  }

  if (errorMessage.includes('ocusztulyiegeawqptrs') && context.environment === 'development') {
    return {
      type: 'database',
      severity: 'high',
      message: 'WARNING: Development environment using production database',
      details: {
        error: errorMessage,
        currentEnvironment: context.environment,
        databaseBeingAccessed: 'production (ocusztulyiegeawqptrs)',
        expectedDatabase: 'development (drrejylrcjbeldnzodjd)',
        eventId: context.eventId,
        orderId: context.orderId,
      },
      suggestedActions: [
        'Update DATABASE_URL to development database',
        'Check local environment configuration',
        'Avoid modifying production data',
      ],
      canRetry: false,
    };
  }

  // General connection errors
  if (errorMessage.includes("Can't reach database server")) {
    return {
      type: 'database',
      severity: 'high',
      message: 'Database server unreachable',
      details: {
        error: errorMessage,
        databaseInfo: dbInfo,
        eventId: context.eventId,
        orderId: context.orderId,
      },
      suggestedActions: [
        'Check database server status',
        'Verify network connectivity',
        'Check database configuration',
        'Retry operation after brief delay',
      ],
      canRetry: true,
    };
  }

  // Connection pool exhaustion
  if (errorMessage.includes('connection pool') || errorMessage.includes('P2024')) {
    return {
      type: 'database',
      severity: 'medium',
      message: 'Database connection pool exhausted',
      details: {
        error: errorMessage,
        eventId: context.eventId,
        orderId: context.orderId,
      },
      suggestedActions: [
        'Wait and retry operation',
        'Check for connection leaks',
        'Consider increasing connection pool size',
        'Review concurrent operation patterns',
      ],
      canRetry: true,
    };
  }

  return {
    type: 'database',
    severity: 'high',
    message: 'Database operation failed',
    details: {
      error: errorMessage,
      code: error?.code,
      eventId: context.eventId,
      orderId: context.orderId,
    },
    suggestedActions: [
      'Check database connectivity',
      'Verify database permissions',
      'Review error logs for more details',
    ],
    canRetry: true,
  };
}

/**
 * Analyzes Prisma-specific errors
 */
function analyzePrismaError(error: Error | any, context: WebhookErrorContext): WebhookError {
  const errorCode = error?.code;

  switch (errorCode) {
    case 'P1001':
      return {
        type: 'database',
        severity: 'high',
        message: 'Database server unreachable',
        details: { error: error.message, code: errorCode, eventId: context.eventId },
        suggestedActions: ['Check database server status', 'Verify connection configuration'],
        canRetry: true,
      };

    case 'P2025':
      return {
        type: 'validation',
        severity: 'medium',
        message: 'Record not found',
        details: { error: error.message, code: errorCode, eventId: context.eventId },
        suggestedActions: ['Verify record exists', 'Check data consistency'],
        canRetry: false,
      };

    default:
      return {
        type: 'database',
        severity: 'medium',
        message: 'Prisma operation failed',
        details: { error: error.message, code: errorCode, eventId: context.eventId },
        suggestedActions: ['Review database operation', 'Check data constraints'],
        canRetry: true,
      };
  }
}

/**
 * Enhanced webhook error handler with categorization and reporting
 */
export async function handleWebhookError(
  error: Error | any,
  context: WebhookErrorContext,
  options: {
    notifyMonitoring?: boolean;
    logDetails?: boolean;
  } = {}
): Promise<WebhookError> {
  const { notifyMonitoring = true, logDetails = true } = options;

  try {
    // Analyze the error
    const webhookError = analyzeWebhookError(error, context);

    // Log error details
    if (logDetails) {
      console.error(`🚨 Webhook Error [${webhookError.severity.toUpperCase()}]:`, {
        type: webhookError.type,
        message: webhookError.message,
        context,
        details: webhookError.details,
        suggestedActions: webhookError.suggestedActions,
      });
    }

    // Send to monitoring service
    if (notifyMonitoring) {
      await errorMonitor.captureWebhookError(
        error,
        context.webhookType,
        webhookError.details,
        context.eventId
      );
    }

    return webhookError;
  } catch (handlingError) {
    console.error('Error in webhook error handler:', handlingError);

    // Fallback error response
    return {
      type: 'unknown',
      severity: 'high',
      message: 'Error handler failed',
      details: {
        originalError: error instanceof Error ? error.message : String(error),
        handlingError:
          handlingError instanceof Error ? handlingError.message : String(handlingError),
      },
      suggestedActions: ['Contact development team'],
      canRetry: false,
    };
  }
}

// Helper functions
function isDatabaseConnectionError(error: any): boolean {
  const message = error?.message || '';
  return (
    message.includes("Can't reach database server") ||
    message.includes('Connection terminated') ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    error?.code === 'P1001' ||
    error?.code === 'P1008' ||
    error?.code === 'P1017'
  );
}

function isPrismaError(error: any): boolean {
  return error?.code && typeof error.code === 'string' && error.code.startsWith('P');
}

function isNetworkError(error: any): boolean {
  const message = error?.message || '';
  return (
    message.includes('timeout') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ENOTFOUND') ||
    message.includes('Network error')
  );
}

function isValidationError(error: any): boolean {
  const message = error?.message || '';
  return (
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('invalid') ||
    error?.code === 'P2003' || // Foreign key constraint
    error?.code === 'P2002' // Unique constraint
  );
}
