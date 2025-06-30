import { AlertService } from '@/lib/alerts';
import { env } from '@/env';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Error context interface
 */
export interface ErrorContext {
  // Request context
  method?: string;
  url?: string;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  
  // Application context
  component?: string;
  action?: string;
  orderId?: string;
  paymentId?: string;
  
  // Additional data
  additionalData?: Record<string, any>;
  stackTrace?: string;
  timestamp?: Date;
}

/**
 * Error monitoring configuration
 */
export interface MonitoringConfig {
  enableAlerts: boolean;
  enableConsoleLogging: boolean;
  enableExtrenalLogging: boolean;
  criticalErrorThreshold: number; // Max critical errors per hour before escalation
}

const DEFAULT_CONFIG: MonitoringConfig = {
  enableAlerts: true,
  enableConsoleLogging: true,
  enableExtrenalLogging: false,
  criticalErrorThreshold: 5,
};

/**
 * Enhanced Error Monitoring Service
 * Captures, categorizes, and alerts on system errors
 */
export class ErrorMonitor {
  private alertService: AlertService;
  private config: MonitoringConfig;
  private criticalErrorCount: Map<string, number> = new Map(); // hour -> count

  constructor(config: MonitoringConfig = DEFAULT_CONFIG) {
    this.alertService = new AlertService();
    this.config = config;
  }

  /**
   * Capture and process any error
   */
  async captureError(
    error: Error | unknown, 
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<void> {
    try {
      const enhancedError = this.enhanceError(error, context);
      const errorSeverity = this.determineSeverity(enhancedError, severity);
      
      // Always log to console if enabled
      if (this.config.enableConsoleLogging) {
        this.logToConsole(enhancedError, errorSeverity, context);
      }

      // Send alerts for medium+ severity errors
      if (this.config.enableAlerts && this.shouldSendAlert(errorSeverity)) {
        await this.sendErrorAlert(enhancedError, context, errorSeverity);
      }

      // Track critical errors for escalation
      if (errorSeverity === ErrorSeverity.CRITICAL) {
        this.trackCriticalError();
      }

      // Log to external service if configured
      if (this.config.enableExtrenalLogging) {
        await this.logToExternalService(enhancedError, context, errorSeverity);
      }

    } catch (monitoringError) {
      // Ensure monitoring doesn't break the application
      console.error('❌ Error in error monitoring:', monitoringError);
    }
  }

  /**
   * Capture payment-specific errors
   */
  async capturePaymentError(
    error: Error | unknown,
    orderId?: string,
    paymentId?: string,
    additionalContext?: Record<string, any>
  ): Promise<void> {
    const context: ErrorContext = {
      component: 'PaymentService',
      action: 'processPayment',
      orderId,
      paymentId,
      additionalData: additionalContext,
    };

    await this.captureError(error, context, ErrorSeverity.HIGH);
  }

  /**
   * Capture Square webhook errors
   */
  async captureWebhookError(
    error: Error | unknown,
    webhookType: string,
    payload?: any,
    eventId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      component: 'SquareWebhooks',
      action: `webhook_${webhookType}`,
      additionalData: {
        webhookType,
        eventId,
        payload: payload ? JSON.stringify(payload).slice(0, 1000) : undefined, // Truncate large payloads
      },
    };

    await this.captureError(error, context, ErrorSeverity.HIGH);
  }

  /**
   * Capture database errors
   */
  async captureDatabaseError(
    error: Error | unknown,
    operation: string,
    additionalContext?: Record<string, any>
  ): Promise<void> {
    const context: ErrorContext = {
      component: 'Database',
      action: operation,
      additionalData: additionalContext,
    };

    await this.captureError(error, context, ErrorSeverity.CRITICAL);
  }

  /**
   * Capture API errors
   */
  async captureAPIError(
    error: Error | unknown,
    method: string,
    url: string,
    userAgent?: string,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      component: 'API',
      method,
      url,
      userAgent,
      userId,
    };

    await this.captureError(error, context, ErrorSeverity.MEDIUM);
  }

  /**
   * Enhanced error with additional context
   */
  private enhanceError(error: Error | unknown, context: ErrorContext): Error {
    let enhancedError: Error;

    if (error instanceof Error) {
      enhancedError = error;
    } else {
      enhancedError = new Error(String(error));
    }

    // Add context to error message if not already there
    if (context.component || context.action) {
      const contextStr = `[${context.component || 'Unknown'}:${context.action || 'Unknown'}]`;
      if (!enhancedError.message.includes(contextStr)) {
        enhancedError.message = `${contextStr} ${enhancedError.message}`;
      }
    }

    return enhancedError;
  }

  /**
   * Determine error severity based on context and content
   */
  private determineSeverity(error: Error, providedSeverity: ErrorSeverity): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    // Critical patterns
    if (
      message.includes('database') && (message.includes('connection') || message.includes('timeout')) ||
      message.includes('payment') && message.includes('failed') ||
      message.includes('webhook') && message.includes('signature') ||
      message.includes('out of memory') ||
      message.includes('segmentation fault')
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // High patterns
    if (
      message.includes('payment') ||
      message.includes('order') && message.includes('failed') ||
      message.includes('webhook') ||
      message.includes('timeout')
    ) {
      return ErrorSeverity.HIGH;
    }

    // Use provided severity as fallback
    return providedSeverity;
  }

  /**
   * Should send alert based on severity
   */
  private shouldSendAlert(severity: ErrorSeverity): boolean {
    return [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(severity);
  }

  /**
   * Send error alert to admin
   */
  private async sendErrorAlert(
    error: Error, 
    context: ErrorContext, 
    severity: ErrorSeverity
  ): Promise<void> {
    try {
      await this.alertService.sendSystemErrorAlert(error, {
        ...context,
        severity,
        timestamp: new Date(),
      });
    } catch (alertError) {
      console.error('Failed to send error alert:', alertError);
    }
  }

  /**
   * Log error to console with formatting
   */
  private logToConsole(error: Error, severity: ErrorSeverity, context: ErrorContext): void {
    const emoji = {
      [ErrorSeverity.LOW]: '🟡',
      [ErrorSeverity.MEDIUM]: '🟠',
      [ErrorSeverity.HIGH]: '🔴',
      [ErrorSeverity.CRITICAL]: '🚨',
    }[severity];

    console.error(`${emoji} [${severity}] ${error.message}`);
    
    if (context.component || context.action) {
      console.error(`   Context: ${context.component}:${context.action}`);
    }
    
    if (context.orderId) {
      console.error(`   Order: ${context.orderId}`);
    }
    
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }

  /**
   * Track critical errors for escalation
   */
  private trackCriticalError(): void {
    const currentHour = new Date().getHours().toString();
    const currentCount = this.criticalErrorCount.get(currentHour) || 0;
    this.criticalErrorCount.set(currentHour, currentCount + 1);

    // Check if we've exceeded the threshold
    if (currentCount + 1 >= this.config.criticalErrorThreshold) {
      console.error(`🚨 CRITICAL: ${currentCount + 1} critical errors in hour ${currentHour}`);
      // Could trigger additional escalation here (SMS, Slack, etc.)
    }
  }

  /**
   * Log to external service (placeholder for future integration)
   */
  private async logToExternalService(
    error: Error, 
    context: ErrorContext, 
    severity: ErrorSeverity
  ): Promise<void> {
    // Placeholder for services like Sentry, LogRocket, etc.
    // await sentry.captureException(error, { contexts: { custom: context }, level: severity });
  }

  /**
   * Get error statistics
   */
  getCriticalErrorStats(): Record<string, number> {
    return Object.fromEntries(this.criticalErrorCount);
  }

  /**
   * Reset error tracking (useful for testing)
   */
  reset(): void {
    this.criticalErrorCount.clear();
  }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor();

/**
 * Wrapper function for async operations with error monitoring
 */
export async function withErrorMonitoring<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  onError?: (error: Error) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await errorMonitor.captureError(error, context);
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
    throw error;
  }
}

/**
 * Decorator for monitoring class methods
 */
export function MonitorErrors(context: Partial<ErrorContext> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        await errorMonitor.captureError(error, {
          component: target.constructor.name,
          action: propertyName,
          ...context,
        });
        throw error;
      }
    };
  };
} 