/**
 * Square Webhooks API Contract Tests
 *
 * Tests to ensure Square Webhook payloads conform to expected schemas.
 * These tests validate webhook structure, validation, processing, and monitoring.
 */

import { describe, it, expect } from '@jest/globals';
import {
  SquareEnvironmentSchema,
  SupportedWebhookEventSchema,
  SquareWebhookPayloadSchema,
  WebhookHeadersSchema,
  WebhookValidationResultSchema,
  WebhookValidationErrorSchema,
  WebhookProcessingResultSchema,
  WebhookQueueItemSchema,
  WebhookMetricsSchema,
  WebhookAlertSchema,
  WebhookStatusSchema,
  WebhookSecurityValidationSchema,
  WebhookConfigSchema,
  WebhookLogEntrySchema,
  WebhookProcessingResponseSchema,
  WebhookMetricsResponseSchema,
  WebhookStatusResponseSchema,
} from '@/lib/api/schemas/external/square/webhooks';
import { matchesSchema, getValidationErrors, mockData } from '../../setup';

describe('Square Webhooks API Contract Tests', () => {
  // ============================================================
  // Enums
  // ============================================================

  describe('SquareEnvironmentSchema', () => {
    it('should validate environments', () => {
      expect(matchesSchema(SquareEnvironmentSchema, 'sandbox')).toBe(true);
      expect(matchesSchema(SquareEnvironmentSchema, 'production')).toBe(true);
    });

    it('should reject invalid environment', () => {
      expect(matchesSchema(SquareEnvironmentSchema, 'invalid')).toBe(false);
    });
  });

  describe('SupportedWebhookEventSchema', () => {
    it('should validate all supported events', () => {
      const events = [
        'payment.created',
        'payment.updated',
        'order.created',
        'order.updated',
        'order.fulfillment.updated',
        'refund.created',
        'refund.updated',
      ];
      events.forEach(event => {
        expect(matchesSchema(SupportedWebhookEventSchema, event)).toBe(true);
      });
    });

    it('should reject unsupported event', () => {
      expect(matchesSchema(SupportedWebhookEventSchema, 'catalog.updated')).toBe(false);
    });
  });

  // ============================================================
  // Webhook Payload
  // ============================================================

  describe('SquareWebhookPayloadSchema', () => {
    it('should validate complete webhook payload', () => {
      const payload = {
        merchant_id: 'MERCHANT123',
        type: 'payment.created',
        event_id: mockData.uuid(),
        created_at: '2025-01-15T12:00:00Z',
        data: {
          type: 'payment',
          id: mockData.uuid(),
          object: {
            payment: {
              id: mockData.uuid(),
              amount_money: { amount: 1599, currency: 'USD' },
              status: 'COMPLETED',
            },
          },
        },
      };
      expect(matchesSchema(SquareWebhookPayloadSchema, payload)).toBe(true);
    });

    it('should validate order webhook payload', () => {
      const payload = {
        merchant_id: 'MERCHANT123',
        type: 'order.created',
        event_id: mockData.uuid(),
        created_at: '2025-01-15T12:00:00Z',
        data: {
          type: 'order',
          id: mockData.uuid(),
          object: {
            order: {
              id: mockData.uuid(),
              location_id: mockData.uuid(),
              state: 'OPEN',
            },
          },
        },
      };
      expect(matchesSchema(SquareWebhookPayloadSchema, payload)).toBe(true);
    });
  });

  describe('WebhookHeadersSchema', () => {
    it('should validate complete headers', () => {
      const headers = {
        'x-square-hmacsha256-signature': 'sha256signature',
        'x-square-hmacsha1-signature': 'sha1signature',
        'square-environment': 'Production' as const,
        'content-type': 'application/json',
        'user-agent': 'Square/1.0',
      };
      expect(matchesSchema(WebhookHeadersSchema, headers)).toBe(true);
    });

    it('should validate minimal headers', () => {
      const headers = {};
      expect(matchesSchema(WebhookHeadersSchema, headers)).toBe(true);
    });
  });

  // ============================================================
  // Webhook Validation
  // ============================================================

  describe('WebhookValidationErrorSchema', () => {
    it('should validate missing signature error', () => {
      const error = {
        type: 'MISSING_SIGNATURE' as const,
        headers: ['x-square-hmacsha256-signature'],
      };
      expect(matchesSchema(WebhookValidationErrorSchema, error)).toBe(true);
    });

    it('should validate invalid signature error', () => {
      const error = {
        type: 'INVALID_SIGNATURE' as const,
        expected: 'expected_sig',
        received: 'received_sig',
      };
      expect(matchesSchema(WebhookValidationErrorSchema, error)).toBe(true);
    });

    it('should validate duplicate event error', () => {
      const error = {
        type: 'DUPLICATE_EVENT' as const,
        eventId: mockData.uuid(),
        existingId: mockData.uuid(),
      };
      expect(matchesSchema(WebhookValidationErrorSchema, error)).toBe(true);
    });

    it('should validate rate limit error', () => {
      const error = {
        type: 'RATE_LIMIT_EXCEEDED' as const,
        clientIp: '192.168.1.1',
        limit: 100,
      };
      expect(matchesSchema(WebhookValidationErrorSchema, error)).toBe(true);
    });
  });

  describe('WebhookValidationResultSchema', () => {
    it('should validate successful validation', () => {
      const result = {
        valid: true,
        environment: 'production' as const,
        metadata: {
          signature: 'sha256signature',
          algorithm: 'sha256' as const,
          secretUsed: 'production' as const,
          processingTimeMs: 45,
          webhookId: mockData.uuid(),
        },
      };
      expect(matchesSchema(WebhookValidationResultSchema, result)).toBe(true);
    });

    it('should validate failed validation', () => {
      const result = {
        valid: false,
        environment: 'sandbox' as const,
        error: {
          type: 'INVALID_SIGNATURE' as const,
          expected: 'expected',
          received: 'received',
        },
      };
      expect(matchesSchema(WebhookValidationResultSchema, result)).toBe(true);
    });
  });

  // ============================================================
  // Webhook Processing
  // ============================================================

  describe('WebhookProcessingResultSchema', () => {
    it('should validate successful processing', () => {
      const result = {
        success: true,
        eventId: mockData.uuid(),
        processingTimeMs: 150,
        actions: [
          {
            type: 'PAYMENT_UPDATE' as const,
            success: true,
            details: { orderId: mockData.uuid() },
          },
          {
            type: 'DATABASE_UPDATE' as const,
            success: true,
          },
        ],
        shouldRetry: false,
      };
      expect(matchesSchema(WebhookProcessingResultSchema, result)).toBe(true);
    });

    it('should validate failed processing with retry', () => {
      const result = {
        success: false,
        eventId: mockData.uuid(),
        processingTimeMs: 200,
        actions: [
          {
            type: 'ORDER_UPDATE' as const,
            success: false,
            error: 'Database connection timeout',
          },
        ],
        shouldRetry: true,
        retryAfter: 30000,
      };
      expect(matchesSchema(WebhookProcessingResultSchema, result)).toBe(true);
    });
  });

  describe('WebhookQueueItemSchema', () => {
    it('should validate pending queue item', () => {
      const item = {
        id: mockData.uuid(),
        eventId: mockData.uuid(),
        eventType: 'payment.created',
        payload: {
          merchant_id: 'MERCHANT123',
          type: 'payment.created',
          event_id: mockData.uuid(),
          created_at: '2025-01-15T12:00:00Z',
          data: {
            type: 'payment',
            id: mockData.uuid(),
            object: {},
          },
        },
        status: 'PENDING' as const,
        attempts: 0,
        createdAt: new Date(),
      };
      expect(matchesSchema(WebhookQueueItemSchema, item)).toBe(true);
    });

    it('should validate failed queue item', () => {
      const item = {
        id: mockData.uuid(),
        eventId: mockData.uuid(),
        eventType: 'order.updated',
        payload: {
          merchant_id: 'MERCHANT123',
          type: 'order.updated',
          event_id: mockData.uuid(),
          created_at: '2025-01-15T12:00:00Z',
          data: { type: 'order', id: mockData.uuid(), object: {} },
        },
        status: 'FAILED' as const,
        attempts: 3,
        lastAttemptAt: new Date(),
        errorMessage: 'Processing failed',
        createdAt: new Date(),
      };
      expect(matchesSchema(WebhookQueueItemSchema, item)).toBe(true);
    });
  });

  // ============================================================
  // Webhook Monitoring
  // ============================================================

  describe('WebhookMetricsSchema', () => {
    it('should validate complete metrics', () => {
      const metrics = {
        totalWebhooks: 1000,
        successfulWebhooks: 950,
        failedWebhooks: 50,
        successRate: 0.95,
        averageProcessingTime: 125.5,
        failuresByType: {
          INVALID_SIGNATURE: 10,
          RATE_LIMIT_EXCEEDED: 5,
          DATABASE_ERROR: 35,
        },
        environmentBreakdown: {
          sandbox: { total: 200, successful: 190 },
          production: { total: 800, successful: 760 },
        },
        hourlyVolume: [
          { hour: '2025-01-15T12:00:00Z', count: 45 },
          { hour: '2025-01-15T13:00:00Z', count: 67 },
        ],
      };
      expect(matchesSchema(WebhookMetricsSchema, metrics)).toBe(true);
    });
  });

  describe('WebhookAlertSchema', () => {
    it('should validate critical alert', () => {
      const alert = {
        id: mockData.uuid(),
        severity: 'critical' as const,
        title: 'High Failure Rate',
        message: 'Webhook failure rate exceeded 10%',
        details: { currentRate: 0.15, threshold: 0.1 },
        createdAt: new Date(),
        environment: 'production' as const,
      };
      expect(matchesSchema(WebhookAlertSchema, alert)).toBe(true);
    });

    it('should validate resolved alert', () => {
      const alert = {
        id: mockData.uuid(),
        severity: 'medium' as const,
        title: 'Database Latency',
        message: 'Database response time increased',
        createdAt: new Date(),
        resolvedAt: new Date(),
      };
      expect(matchesSchema(WebhookAlertSchema, alert)).toBe(true);
    });
  });

  describe('WebhookStatusSchema', () => {
    it('should validate healthy status', () => {
      const status = {
        isHealthy: true,
        lastWebhookTime: new Date(),
        successRate: 0.98,
        averageLatency: 85.3,
        recentWebhooks: [
          {
            id: mockData.uuid(),
            eventType: 'payment.created',
            environment: 'production' as const,
            success: true,
            processingTime: 95,
            timestamp: new Date(),
          },
        ],
        alerts: [],
      };
      expect(matchesSchema(WebhookStatusSchema, status)).toBe(true);
    });

    it('should validate unhealthy status', () => {
      const status = {
        isHealthy: false,
        lastWebhookTime: null,
        successRate: 0.65,
        averageLatency: 250.5,
        recentWebhooks: [],
        alerts: [
          {
            id: mockData.uuid(),
            severity: 'high' as const,
            title: 'No Recent Webhooks',
            message: 'No webhooks received in 30 minutes',
            createdAt: new Date(),
          },
        ],
      };
      expect(matchesSchema(WebhookStatusSchema, status)).toBe(true);
    });
  });

  // ============================================================
  // Webhook Security
  // ============================================================

  describe('WebhookSecurityValidationSchema', () => {
    it('should validate successful security check', () => {
      const validation = {
        rateLimitOk: true,
        ipValidationOk: true,
        duplicateCheckOk: true,
        timestampValidationOk: true,
        errors: [],
      };
      expect(matchesSchema(WebhookSecurityValidationSchema, validation)).toBe(true);
    });

    it('should validate failed security check', () => {
      const validation = {
        rateLimitOk: false,
        ipValidationOk: true,
        duplicateCheckOk: true,
        timestampValidationOk: false,
        errors: ['Rate limit exceeded', 'Event too old'],
      };
      expect(matchesSchema(WebhookSecurityValidationSchema, validation)).toBe(true);
    });
  });

  // ============================================================
  // Webhook Configuration
  // ============================================================

  describe('WebhookConfigSchema', () => {
    it('should validate production config', () => {
      const config = {
        environment: 'production' as const,
        webhookSecret: 'secret_prod_123',
        maxRetries: 3,
        retryDelayMs: 5000,
        timeoutMs: 30000,
        enableRateLimiting: true,
        enableIpValidation: true,
        enableReplayProtection: true,
        maxEventAge: 300000,
      };
      expect(matchesSchema(WebhookConfigSchema, config)).toBe(true);
    });

    it('should validate sandbox config', () => {
      const config = {
        environment: 'sandbox' as const,
        webhookSecret: 'secret_sandbox_456',
        maxRetries: 1,
        retryDelayMs: 1000,
        timeoutMs: 10000,
        enableRateLimiting: false,
        enableIpValidation: false,
        enableReplayProtection: false,
        maxEventAge: 600000,
      };
      expect(matchesSchema(WebhookConfigSchema, config)).toBe(true);
    });
  });

  // ============================================================
  // Webhook Logging
  // ============================================================

  describe('WebhookLogEntrySchema', () => {
    it('should validate successful log entry', () => {
      const logEntry = {
        id: mockData.uuid(),
        webhookId: mockData.uuid(),
        eventType: 'payment.created',
        merchantId: 'MERCHANT123',
        environment: 'production' as const,
        signatureValid: true,
        payload: {
          merchant_id: 'MERCHANT123',
          type: 'payment.created',
          event_id: mockData.uuid(),
          created_at: '2025-01-15T12:00:00Z',
          data: { type: 'payment', id: mockData.uuid(), object: {} },
        },
        headers: {
          'x-square-hmacsha256-signature': 'signature',
          'content-type': 'application/json',
        },
        processingTimeMs: 125,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(matchesSchema(WebhookLogEntrySchema, logEntry)).toBe(true);
    });

    it('should validate failed log entry', () => {
      const logEntry = {
        id: mockData.uuid(),
        webhookId: mockData.uuid(),
        eventType: 'order.updated',
        signatureValid: false,
        validationError: {
          type: 'INVALID_SIGNATURE' as const,
          expected: 'expected',
          received: 'received',
        },
        payload: {
          merchant_id: 'MERCHANT123',
          type: 'order.updated',
          event_id: mockData.uuid(),
          created_at: '2025-01-15T12:00:00Z',
          data: { type: 'order', id: mockData.uuid(), object: {} },
        },
        headers: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(matchesSchema(WebhookLogEntrySchema, logEntry)).toBe(true);
    });
  });

  // ============================================================
  // API Responses
  // ============================================================

  describe('WebhookProcessingResponseSchema', () => {
    it('should validate successful response', () => {
      const response = {
        success: true,
        eventId: mockData.uuid(),
        message: 'Webhook processed successfully',
        processingResult: {
          success: true,
          eventId: mockData.uuid(),
          processingTimeMs: 100,
          actions: [{ type: 'PAYMENT_UPDATE' as const, success: true }],
          shouldRetry: false,
        },
      };
      expect(matchesSchema(WebhookProcessingResponseSchema, response)).toBe(true);
    });

    it('should validate error response', () => {
      const response = {
        success: false,
        eventId: mockData.uuid(),
        errors: ['Invalid signature', 'Webhook processing failed'],
      };
      expect(matchesSchema(WebhookProcessingResponseSchema, response)).toBe(true);
    });
  });

  describe('WebhookMetricsResponseSchema', () => {
    it('should validate metrics response', () => {
      const response = {
        success: true,
        metrics: {
          totalWebhooks: 500,
          successfulWebhooks: 475,
          failedWebhooks: 25,
          successRate: 0.95,
          averageProcessingTime: 110.5,
          failuresByType: {},
          environmentBreakdown: {
            sandbox: { total: 100, successful: 95 },
            production: { total: 400, successful: 380 },
          },
          hourlyVolume: [],
        },
      };
      expect(matchesSchema(WebhookMetricsResponseSchema, response)).toBe(true);
    });
  });

  describe('WebhookStatusResponseSchema', () => {
    it('should validate status response', () => {
      const response = {
        success: true,
        status: {
          isHealthy: true,
          lastWebhookTime: new Date(),
          successRate: 0.97,
          averageLatency: 95.2,
          recentWebhooks: [],
          alerts: [],
        },
      };
      expect(matchesSchema(WebhookStatusResponseSchema, response)).toBe(true);
    });
  });
});
