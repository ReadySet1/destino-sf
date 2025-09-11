/**
 * Integration Tests for Square Webhook API Route
 * 
 * Tests the complete webhook processing flow including validation,
 * logging, queuing, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import { createMockSquareWebhook, createMockRequest } from '@/test/fixtures/square-webhooks';

// Mock dependencies
vi.mock('@/lib/db/queries/webhooks', () => ({
  logWebhook: vi.fn().mockResolvedValue({
    id: 'log-123',
    webhookId: 'webhook-123',
    eventType: 'payment.created',
    signatureValid: true,
    createdAt: new Date()
  }),
  checkDuplicateWebhook: vi.fn().mockResolvedValue({ isDuplicate: false })
}));

vi.mock('@/lib/monitoring/webhook-metrics', () => ({
  trackMetric: vi.fn().mockResolvedValue(undefined),
  sendWebhookAlert: vi.fn().mockResolvedValue(undefined),
  checkAlertThresholds: vi.fn().mockReturnValue([])
}));

vi.mock('@/lib/webhook-queue-fix', () => ({
  queueWebhook: vi.fn().mockResolvedValue(undefined)
}));

describe('Square Webhook API Route', () => {
  beforeEach(() => {
    process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = 'test-sandbox-secret';
    process.env.SQUARE_WEBHOOK_SECRET = 'test-production-secret';
    process.env.NODE_ENV = 'test';
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
    delete process.env.SQUARE_WEBHOOK_SECRET;
  });

  describe('POST /api/webhooks/square', () => {
    it('processes valid sandbox webhook successfully', async () => {
      const { request, payload } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'test-sandbox-secret'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.eventId).toBe(payload.event_id);
      expect(data.type).toBe('payment.created');
      expect(data.environment).toBe('sandbox');
      expect(data.processingTimeMs).toBeGreaterThan(0);
    });

    it('processes valid production webhook successfully', async () => {
      const { request, payload } = createMockSquareWebhook({
        type: 'order.updated',
        environment: 'production',
        secret: 'test-production-secret'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.eventId).toBe(payload.event_id);
      expect(data.environment).toBe('production');
    });

    it('rejects webhook with invalid signature', async () => {
      const { request } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'wrong-secret' // Wrong secret will generate invalid signature
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
      expect(data.details).toBeDefined();
    });

    it('rejects webhook with missing signature header', async () => {
      const { request } = createMockRequest({
        headers: {
          'square-environment': 'Sandbox',
          'content-type': 'application/json'
        },
        body: JSON.stringify(createMockSquareWebhook({ type: 'payment.created' }).payload)
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('handles malformed JSON payload', async () => {
      const request = createMockRequest({
        headers: {
          'x-square-hmacsha256-signature': 'some-signature',
          'square-environment': 'Sandbox'
        },
        body: '{ invalid json }'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('handles duplicate webhook events', async () => {
      // Mock duplicate detection
      const { logWebhook, checkDuplicateWebhook } = await import('@/lib/db/queries/webhooks');
      vi.mocked(checkDuplicateWebhook).mockResolvedValueOnce({
        isDuplicate: true,
        existingId: 'existing-webhook-123'
      });

      const { request, payload } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'test-sandbox-secret'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duplicate).toBe(true);
      expect(data.existingId).toBe('existing-webhook-123');
    });

    it('handles queue failures gracefully', async () => {
      // Mock queue failure
      const { queueWebhook } = await import('@/lib/webhook-queue-fix');
      vi.mocked(queueWebhook).mockRejectedValueOnce(new Error('Queue connection failed'));

      const { request, payload } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'test-sandbox-secret'
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still acknowledge even if queuing fails
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.eventId).toBe(payload.event_id);
    });

    it('handles security validation failures', async () => {
      const request = createMockRequest({
        headers: {
          'x-square-hmacsha256-signature': 'signature',
          'content-length': (2 * 1024 * 1024).toString() // Too large
        },
        body: mockBody
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Security validation failed');
    });

    it('returns 200 for internal errors to prevent Square retries', async () => {
      // Mock an unexpected error in validation
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Mock validation to throw
      vi.doMock('@/lib/square/webhook-validator', () => ({
        validateWebhookSignature: vi.fn().mockRejectedValue(new Error('Unexpected error')),
        validateWebhookSecurity: vi.fn().mockResolvedValue({ valid: true })
      }));

      const { request } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'test-sandbox-secret'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Important: 200 to prevent retries
      expect(data.received).toBe(true);
      expect(data.error).toBe(true);

      console.error = originalConsoleError;
    });

    it('measures and reports processing time accurately', async () => {
      const { request } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'test-sandbox-secret'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processingTimeMs).toBeTypeOf('number');
      expect(data.processingTimeMs).toBeGreaterThan(0);
      expect(data.processingTimeMs).toBeLessThan(1000); // Should be fast
    });
  });

  describe('GET /api/webhooks/square', () => {
    it('returns webhook health status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.webhook_endpoint).toBe('square');
      expect(data.environment).toBeDefined();
      expect(data.configuration).toBeDefined();
      expect(data.fixes_applied).toBeInstanceOf(Array);
      expect(data.version).toBe('2.0.0');
    });

    it('reports environment configuration correctly', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment.has_production_secret).toBe(true);
      expect(data.environment.has_sandbox_secret).toBe(true);
      expect(data.configuration.production_ready).toBe(true);
      expect(data.configuration.sandbox_ready).toBe(true);
      expect(data.configuration.both_environments_ready).toBe(true);
    });

    it('handles missing webhook secrets', async () => {
      delete process.env.SQUARE_WEBHOOK_SECRET;
      delete process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;

      const response = await GET();
      const data = await response.json();

      expect(data.configuration.production_ready).toBe(false);
      expect(data.configuration.sandbox_ready).toBe(false);
      expect(data.configuration.recommendation).toContain('Configure both');
    });

    it('includes recent metrics and activity', async () => {
      // Mock recent logs
      const { getRecentWebhookLogs } = await import('@/lib/db/queries/webhooks');
      vi.mocked(getRecentWebhookLogs).mockResolvedValueOnce([
        {
          id: 'log-1',
          webhookId: 'webhook-1',
          eventType: 'payment.created',
          environment: 'sandbox',
          signatureValid: true,
          processingTimeMs: 45,
          createdAt: new Date(),
          // ... other required fields
        } as any
      ]);

      const response = await GET();
      const data = await response.json();

      expect(data.recent_activity).toBeDefined();
      expect(data.recent_activity.last_5_webhooks).toBeInstanceOf(Array);
    });

    it('handles health check errors gracefully', async () => {
      // Mock database error
      const { getRecentWebhookLogs } = await import('@/lib/db/queries/webhooks');
      vi.mocked(getRecentWebhookLogs).mockRejectedValueOnce(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.error).toBe('Health check failed');
    });
  });

  describe('Webhook Logging Integration', () => {
    it('logs successful webhook validation', async () => {
      const { logWebhook } = await import('@/lib/db/queries/webhooks');
      
      const { request, payload } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'test-sandbox-secret'
      });

      await POST(request);

      expect(vi.mocked(logWebhook)).toHaveBeenCalledWith({
        payload,
        headers: expect.any(Object),
        signatureValid: true,
        validationError: undefined,
        environment: 'sandbox',
        processingTimeMs: expect.any(Number),
        webhookId: expect.any(String)
      });
    });

    it('logs failed webhook validation', async () => {
      const { logWebhook } = await import('@/lib/db/queries/webhooks');
      
      const { request, payload } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'wrong-secret'
      });

      await POST(request);

      expect(vi.mocked(logWebhook)).toHaveBeenCalledWith({
        payload,
        headers: expect.any(Object),
        signatureValid: false,
        validationError: expect.objectContaining({
          type: 'INVALID_SIGNATURE'
        }),
        environment: 'sandbox',
        processingTimeMs: expect.any(Number),
        webhookId: expect.any(String)
      });
    });
  });

  describe('Metrics Integration', () => {
    it('tracks webhook received metrics', async () => {
      const { trackMetric } = await import('@/lib/monitoring/webhook-metrics');
      
      const { request } = createMockSquareWebhook({
        type: 'payment.created',
        environment: 'sandbox',
        secret: 'test-sandbox-secret'
      });

      await POST(request);

      expect(vi.mocked(trackMetric)).toHaveBeenCalledWith({
        type: 'webhook_received',
        environment: 'sandbox',
        valid: true,
        eventType: 'payment.created',
        duration: expect.any(Number)
      });
    });

    it('tracks webhook processing metrics', async () => {
      const { trackMetric } = await import('@/lib/monitoring/webhook-metrics');
      
      const { request } = createMockSquareWebhook({
        type: 'order.updated',
        environment: 'production',
        secret: 'test-production-secret'
      });

      await POST(request);

      expect(vi.mocked(trackMetric)).toHaveBeenCalledWith({
        type: 'webhook_processed',
        environment: 'production',
        valid: true,
        eventType: 'order.updated'
      });
    });
  });
});
