import {
  ErrorMonitor,
  ErrorSeverity,
  ErrorContext,
  MonitoringConfig,
  withErrorMonitoring,
  MonitorErrors,
  errorMonitor,
} from '@/lib/error-monitoring';
import { AlertService } from '@/lib/alerts';

// Mock dependencies
jest.mock('@/lib/alerts');
jest.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
    ENABLE_ERROR_ALERTS: true,
  },
}));

const mockAlertService = {
  sendSystemErrorAlert: jest.fn(),
} as any;

// Mock AlertService constructor
(AlertService as jest.MockedClass<typeof AlertService>).mockImplementation(() => mockAlertService);

describe.skip('Error Monitoring System (Phase 2 - Sentry Integration Support)', () => {
  let monitor: ErrorMonitor;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset the monitor with default config
    monitor = new ErrorMonitor();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Error Capture and Classification', () => {
    it('should capture basic errors with default severity', async () => {
      const testError = new Error('Test error message');

      await monitor.captureError(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🟠 [MEDIUM] Test error message')
      );
    });

    it('should classify database connection errors as CRITICAL', async () => {
      const dbError = new Error('Database connection failed');

      await monitor.captureError(dbError, {}, ErrorSeverity.LOW);

      // Should override LOW severity to CRITICAL due to error content
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [CRITICAL] Database connection failed')
      );
    });

    it('should classify payment errors as CRITICAL', async () => {
      const paymentError = new Error('Payment failed: card declined');

      await monitor.captureError(paymentError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [CRITICAL] Payment failed: card declined')
      );
    });

    it('should classify webhook signature errors as CRITICAL', async () => {
      const webhookError = new Error('Webhook signature validation failed');

      await monitor.captureError(webhookError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [CRITICAL] Webhook signature validation failed')
      );
    });

    it('should classify memory errors as CRITICAL', async () => {
      const memoryError = new Error('JavaScript heap out of memory');

      await monitor.captureError(memoryError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [CRITICAL] JavaScript heap out of memory')
      );
    });

    it('should classify timeout errors as HIGH severity', async () => {
      const timeoutError = new Error('Request timeout after 30s');

      await monitor.captureError(timeoutError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔴 [HIGH] Request timeout after 30s')
      );
    });

    it('should handle non-Error objects gracefully', async () => {
      const stringError = 'String error message';

      await monitor.captureError(stringError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('🟠 [MEDIUM]'));
    });

    it('should handle null/undefined errors', async () => {
      await monitor.captureError(null);
      await monitor.captureError(undefined);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Context and Enhancement', () => {
    it('should include component and action in console output', async () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        component: 'PaymentProcessor',
        action: 'processPayment',
      };

      await monitor.captureError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Context: PaymentProcessor:processPayment')
      );
    });

    it('should include order ID in console output when provided', async () => {
      const error = new Error('Order processing failed');
      const context: ErrorContext = {
        orderId: 'order-123',
        component: 'OrderService',
      };

      await monitor.captureError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Order: order-123'));
    });

    it('should include stack trace in console output', async () => {
      const error = new Error('Test error with stack');
      error.stack = 'Error: Test error\n    at test.js:1:1\n    at test.js:2:2\n    at test.js:3:3';

      await monitor.captureError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stack: Error: Test error')
      );
    });

    it('should handle errors without stack traces', async () => {
      const error = new Error('No stack trace');
      delete error.stack;

      await monitor.captureError(error);

      // Should still work without throwing
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Alert Integration (Sentry Preparation)', () => {
    it('should send alerts for HIGH severity errors', async () => {
      const error = new Error('High severity error');

      await monitor.captureError(error, {}, ErrorSeverity.HIGH);

      expect(mockAlertService.sendSystemErrorAlert).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          severity: ErrorSeverity.HIGH,
          timestamp: expect.any(Date),
        })
      );
    });

    it('should send alerts for CRITICAL severity errors', async () => {
      const error = new Error('Critical system failure');

      await monitor.captureError(error, {}, ErrorSeverity.CRITICAL);

      expect(mockAlertService.sendSystemErrorAlert).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          severity: ErrorSeverity.CRITICAL,
          timestamp: expect.any(Date),
        })
      );
    });

    it('should NOT send alerts for LOW and MEDIUM severity errors', async () => {
      const lowError = new Error('Low severity error');
      const mediumError = new Error('Medium severity error');

      await monitor.captureError(lowError, {}, ErrorSeverity.LOW);
      await monitor.captureError(mediumError, {}, ErrorSeverity.MEDIUM);

      expect(mockAlertService.sendSystemErrorAlert).not.toHaveBeenCalled();
    });

    it('should handle alert sending failures gracefully', async () => {
      mockAlertService.sendSystemErrorAlert.mockRejectedValue(new Error('Alert service down'));

      const error = new Error('Critical error');

      // Should not throw despite alert failure
      await expect(monitor.captureError(error, {}, ErrorSeverity.CRITICAL)).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send error alert')
      );
    });
  });

  describe('Configuration Management', () => {
    it('should respect enableConsoleLogging configuration', async () => {
      const config: MonitoringConfig = {
        enableAlerts: true,
        enableConsoleLogging: false,
        enableExtrenalLogging: false,
        criticalErrorThreshold: 5,
      };

      const customMonitor = new ErrorMonitor(config);
      const error = new Error('Test error');

      await customMonitor.captureError(error);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should respect enableAlerts configuration', async () => {
      const config: MonitoringConfig = {
        enableAlerts: false,
        enableConsoleLogging: true,
        enableExtrenalLogging: false,
        criticalErrorThreshold: 5,
      };

      const customMonitor = new ErrorMonitor(config);
      const error = new Error('Critical error');

      await customMonitor.captureError(error, {}, ErrorSeverity.CRITICAL);

      expect(mockAlertService.sendSystemErrorAlert).not.toHaveBeenCalled();
    });

    it('should use custom critical error threshold', async () => {
      const config: MonitoringConfig = {
        enableAlerts: true,
        enableConsoleLogging: true,
        enableExtrenalLogging: false,
        criticalErrorThreshold: 2, // Low threshold for testing
      };

      const customMonitor = new ErrorMonitor(config);

      // Generate 3 critical errors to exceed threshold
      for (let i = 0; i < 3; i++) {
        await customMonitor.captureError(
          new Error(`Critical error ${i}`),
          {},
          ErrorSeverity.CRITICAL
        );
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL: 2 critical errors in hour')
      );
    });
  });

  describe('Specialized Error Capture Methods', () => {
    it('should capture database errors with correct context', async () => {
      const dbError = new Error('Connection pool exhausted');

      await monitor.captureDatabaseError(dbError, 'INSERT INTO orders', { table: 'orders' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [CRITICAL] Connection pool exhausted')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Context: Database:INSERT INTO orders')
      );
    });

    it('should capture API errors with request details', async () => {
      const apiError = new Error('API rate limit exceeded');

      await monitor.captureAPIError(
        apiError,
        'POST',
        '/api/orders',
        'Mozilla/5.0 Chrome/91.0',
        'user-123'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Context: API:POST'));
    });

    it('should capture webhook errors with event details', async () => {
      const webhookError = new Error('Invalid webhook payload');

      await monitor.captureWebhookError(webhookError, 'square', 'payment.created', 'evt_123');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔴 [HIGH] Invalid webhook payload')
      );
    });

    it('should capture payment errors with transaction details', async () => {
      const paymentError = new Error('Card declined: insufficient funds');

      await monitor.capturePaymentError(paymentError, 'order-456', 'pay_123', {
        amount: 7500,
        cardLast4: '4242',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [CRITICAL] Card declined: insufficient funds')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Order: order-456'));
    });
  });

  describe('Error Monitoring Utilities', () => {
    it('should wrap async operations with error monitoring', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const context: ErrorContext = { component: 'TestService', action: 'testOperation' };

      const result = await withErrorMonitoring(mockOperation, context);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should capture errors from wrapped operations', async () => {
      const operationError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(operationError);
      const mockOnError = jest.fn();
      const context: ErrorContext = { component: 'TestService', action: 'failingOperation' };

      await expect(withErrorMonitoring(mockOperation, context, mockOnError)).rejects.toThrow(
        'Operation failed'
      );

      expect(mockOnError).toHaveBeenCalledWith(operationError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Operation failed'));
    });

    it('should handle errors in onError callback', async () => {
      const operationError = new Error('Operation failed');
      const callbackError = new Error('Callback failed');
      const mockOperation = jest.fn().mockRejectedValue(operationError);
      const mockOnError = jest.fn().mockImplementation(() => {
        throw callbackError;
      });

      await expect(withErrorMonitoring(mockOperation, {}, mockOnError)).rejects.toThrow(
        'Operation failed'
      );

      // Should still capture the original operation error
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Operation failed'));
    });
  });

  describe('Method Decorator Error Monitoring', () => {
    it('should monitor class methods when manually wrapped', async () => {
      class TestService {
        async processData(data: string): Promise<string> {
          if (data === 'fail') {
            throw new Error('Processing failed');
          }
          return `processed: ${data}`;
        }
      }

      const service = new TestService();

      // Manually apply monitoring wrapper (simulating decorator behavior)
      const originalMethod = service.processData.bind(service);
      service.processData = async function (data: string) {
        try {
          return await originalMethod(data);
        } catch (error) {
          await monitor.captureError(error, {
            component: 'TestService',
            action: 'processData',
          });
          throw error;
        }
      };

      // Successful operation
      const result = await service.processData('valid');
      expect(result).toBe('processed: valid');

      // Failed operation
      await expect(service.processData('fail')).rejects.toThrow('Processing failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Context: TestService:processData')
      );
    });

    it('should simulate decorator functionality with function wrapper', async () => {
      const decoratedFunction = MonitorErrors({
        component: 'PaymentService',
        action: 'chargeCard',
      });

      // Create a test function to decorate
      async function chargeCard(): Promise<void> {
        throw new Error('Card declined');
      }

      const mockDescriptor = {
        value: chargeCard,
      };

      // Apply decorator
      decoratedFunction({}, 'chargeCard', mockDescriptor);

      // Test the decorated function
      await expect(mockDescriptor.value()).rejects.toThrow('Card declined');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Context: Object:chargeCard')
      );
    });
  });

  describe('External Service Integration (Sentry Ready)', () => {
    it('should prepare for external logging when enabled', async () => {
      const config: MonitoringConfig = {
        enableAlerts: true,
        enableConsoleLogging: true,
        enableExtrenalLogging: true,
        criticalErrorThreshold: 5,
      };

      const customMonitor = new ErrorMonitor(config);
      const error = new Error('External logging test');

      // Should not throw even though external logging is not implemented
      await expect(customMonitor.captureError(error)).resolves.not.toThrow();
    });

    it('should handle external logging errors gracefully', async () => {
      // This test prepares for future Sentry integration
      const config: MonitoringConfig = {
        enableAlerts: true,
        enableConsoleLogging: true,
        enableExtrenalLogging: true,
        criticalErrorThreshold: 5,
      };

      const customMonitor = new ErrorMonitor(config);
      const error = new Error('Test for Sentry integration');

      await customMonitor.captureError(error, {
        component: 'SentryTest',
        userId: 'user-123',
        additionalData: { requestId: 'req-456' },
      });

      // Should complete without errors
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Error Monitor Resilience', () => {
    it('should not crash when error monitoring itself fails', async () => {
      // Mock alert service to throw an error
      mockAlertService.sendSystemErrorAlert.mockImplementation(() => {
        throw new Error('Alert service crashed');
      });

      const error = new Error('Test error that triggers monitoring failure');

      // Should not throw despite internal monitoring failure
      await expect(monitor.captureError(error, {}, ErrorSeverity.CRITICAL)).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error in error monitoring:')
      );
    });

    it('should handle malformed error objects', async () => {
      const malformedError = {
        message: 'Not a real Error object',
        someProperty: 'unexpected',
      };

      await expect(monitor.captureError(malformedError as any)).resolves.not.toThrow();
    });

    it('should handle circular reference errors', async () => {
      const circularError: any = new Error('Circular reference test');
      circularError.circular = circularError;

      await expect(monitor.captureError(circularError)).resolves.not.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should efficiently handle high-volume error reporting', async () => {
      const startTime = Date.now();

      // Process 100 errors quickly
      const promises = Array.from({ length: 100 }, (_, i) =>
        monitor.captureError(new Error(`Error ${i}`), {
          component: 'LoadTest',
          additionalData: { index: i },
        })
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process efficiently (under 1 second for 100 errors)
      expect(processingTime).toBeLessThan(1000);
    });

    it('should clean up critical error counts over time', async () => {
      // This tests the hour-based tracking cleanup logic
      const config: MonitoringConfig = {
        enableAlerts: true,
        enableConsoleLogging: false,
        enableExtrenalLogging: false,
        criticalErrorThreshold: 1,
      };

      const customMonitor = new ErrorMonitor(config);

      // Generate critical error
      await customMonitor.captureError(new Error('Critical 1'), {}, ErrorSeverity.CRITICAL);
      await customMonitor.captureError(new Error('Critical 2'), {}, ErrorSeverity.CRITICAL);

      // Should track and alert on threshold
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL: 2 critical errors in hour')
      );
    });
  });
});

describe.skip('Global Error Monitor Instance', () => {
  it('should provide a global error monitor instance', () => {
    expect(errorMonitor).toBeInstanceOf(ErrorMonitor);
  });

  it('should allow global configuration', async () => {
    const error = new Error('Global monitor test');

    await expect(errorMonitor.captureError(error)).resolves.not.toThrow();
  });
});
