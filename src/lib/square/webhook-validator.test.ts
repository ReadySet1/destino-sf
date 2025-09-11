/**
 * Unit Tests for Webhook Signature Validation
 * 
 * Comprehensive test suite for the enhanced webhook validator including
 * signature validation, environment variable handling, and error cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { 
  validateWebhookSignature,
  quickSignatureValidation,
  validateWebhookSecurity
} from './webhook-validator';
import { type SquareWebhookPayload } from '@/types/webhook';

// Mock payload for testing
const mockPayload: SquareWebhookPayload = {
  merchant_id: 'TEST_MERCHANT_123',
  type: 'payment.created',
  event_id: 'test-event-123',
  created_at: new Date().toISOString(),
  data: {
    type: 'payment',
    id: 'payment_test_123',
    object: {
      id: 'payment_test_123',
      amount_money: { amount: 1000, currency: 'USD' },
      status: 'COMPLETED'
    }
  }
};

const mockSecret = 'test-webhook-secret-key';
const mockBody = JSON.stringify(mockPayload);

describe('Webhook Signature Validation', () => {
  beforeEach(() => {
    // Set up clean environment variables
    process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = mockSecret;
    process.env.SQUARE_WEBHOOK_SECRET = mockSecret;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
    delete process.env.SQUARE_WEBHOOK_SECRET;
    vi.clearAllMocks();
  });

  describe('validateWebhookSignature', () => {
    it('validates correct SHA256 signature for sandbox environment', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox',
          'content-type': 'application/json'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(true);
      expect(result.environment).toBe('sandbox');
      expect(result.metadata?.algorithm).toBe('sha256');
      expect(result.metadata?.secretUsed).toBe('sandbox');
      expect(result.error).toBeUndefined();
    });

    it('validates correct SHA256 signature for production environment', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Production',
          'content-type': 'application/json'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(true);
      expect(result.environment).toBe('production');
      expect(result.metadata?.algorithm).toBe('sha256');
      expect(result.metadata?.secretUsed).toBe('production');
    });

    it('rejects invalid signature', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': 'invalid-signature-base64',
          'square-environment': 'Sandbox',
          'content-type': 'application/json'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('INVALID_SIGNATURE');
      expect(result.error).toHaveProperty('expected');
      expect(result.error).toHaveProperty('received');
    });

    it('handles missing signature header', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'square-environment': 'Sandbox',
          'content-type': 'application/json'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('MISSING_SIGNATURE');
      expect(result.error).toHaveProperty('headers');
    });

    it('handles missing webhook secret', async () => {
      // Remove environment variables
      delete process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
      delete process.env.SQUARE_WEBHOOK_SECRET;

      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('MISSING_SECRET');
      expect(result.error).toHaveProperty('environment');
    });

    it('handles newline in webhook secret (critical fix)', async () => {
      // Add newline to secret (the main issue we're fixing)
      process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = mockSecret + '\n';
      
      const signature = crypto
        .createHmac('sha256', mockSecret) // Use clean secret for signature
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      // Should work because validator trims the secret
      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(true);
      expect(result.environment).toBe('sandbox');
    });

    it('validates old timestamp events', async () => {
      // Create payload with old timestamp
      const oldPayload = {
        ...mockPayload,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
      };
      const oldBody = JSON.stringify(oldPayload);
      
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(oldBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: oldBody
      });

      const result = await validateWebhookSignature(request, oldBody);
      
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('EVENT_TOO_OLD');
    });

    it('handles malformed JSON payload', async () => {
      const malformedBody = '{ invalid json }';
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(malformedBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: malformedBody
      });

      const result = await validateWebhookSignature(request, malformedBody);
      
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('MALFORMED_BODY');
    });

    it('handles invalid payload structure', async () => {
      const invalidPayload = { missing: 'required_fields' };
      const invalidBody = JSON.stringify(invalidPayload);
      
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(invalidBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: invalidBody
      });

      const result = await validateWebhookSignature(request, invalidBody);
      
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('INVALID_PAYLOAD');
    });

    it('supports SHA1 signature fallback', async () => {
      const signature = crypto
        .createHmac('sha1', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha1-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(true);
      expect(result.metadata?.algorithm).toBe('sha1');
    });

    it('measures processing time accurately', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.metadata?.processingTimeMs).toBeGreaterThan(0);
      expect(result.metadata?.processingTimeMs).toBeLessThan(1000);
    });
  });

  describe('quickSignatureValidation', () => {
    it('validates signature quickly for fast acknowledgment', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const startTime = performance.now();
      const isValid = await quickSignatureValidation(request, mockBody);
      const duration = performance.now() - startTime;
      
      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('rejects invalid signature quickly', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': 'invalid-signature',
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const isValid = await quickSignatureValidation(request, mockBody);
      expect(isValid).toBe(false);
    });

    it('handles environment variable cleaning', async () => {
      // Add various whitespace characters to the secret
      process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = mockSecret + '\n\r\t ';
      
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const isValid = await quickSignatureValidation(request, mockBody);
      expect(isValid).toBe(true);
    });
  });

  describe('validateWebhookSecurity', () => {
    it('accepts valid webhook requests', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': 'some-signature',
          'square-environment': 'Sandbox',
          'content-length': '500',
          'user-agent': 'Square/1.0'
        },
        body: mockBody
      });

      const result = await validateWebhookSecurity(request);
      expect(result.valid).toBe(true);
    });

    it('rejects requests with oversized body', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': 'some-signature',
          'content-length': (2 * 1024 * 1024).toString() // 2MB
        },
        body: mockBody
      });

      const result = await validateWebhookSecurity(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('rejects requests without signature headers', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSecurity(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing signature headers');
    });
  });

  describe('Environment Detection', () => {
    it('correctly detects sandbox environment', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      expect(result.environment).toBe('sandbox');
    });

    it('defaults to production environment when not specified', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature
          // No square-environment header
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      expect(result.environment).toBe('production');
    });

    it('uses production secret when sandbox secret is not available', async () => {
      delete process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
      
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      expect(result.valid).toBe(true);
      expect(result.metadata?.secretUsed).toBe('sandbox'); // Still reports as sandbox usage
    });
  });

  describe('Error Handling', () => {
    it('handles crypto timing attack protection', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      // Mock crypto.timingSafeEqual to throw (test fallback)
      const originalTimingSafeEqual = crypto.timingSafeEqual;
      crypto.timingSafeEqual = vi.fn().mockImplementation(() => {
        throw new Error('Timing safe equal failed');
      });

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      // Should fall back to string comparison and still work
      expect(result.valid).toBe(true);
      
      // Restore original function
      crypto.timingSafeEqual = originalTimingSafeEqual;
    });

    it('handles unexpected validation errors gracefully', async () => {
      // Mock JSON.parse to throw
      const originalParse = JSON.parse;
      JSON.parse = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected JSON error');
      });

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': 'some-signature',
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('MALFORMED_BODY');
      
      // Restore original function
      JSON.parse = originalParse;
    });
  });

  describe('Performance Requirements', () => {
    it('completes validation within performance budget', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const startTime = performance.now();
      const result = await validateWebhookSignature(request, mockBody);
      const duration = performance.now() - startTime;
      
      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(50); // Performance budget: < 50ms
    });

    it('quick validation is faster than full validation', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      // Time both validations
      const quickStart = performance.now();
      const quickResult = await quickSignatureValidation(request, mockBody);
      const quickDuration = performance.now() - quickStart;

      const fullStart = performance.now();
      const fullResult = await validateWebhookSignature(request, mockBody);
      const fullDuration = performance.now() - fullStart;

      expect(quickResult).toBe(true);
      expect(fullResult.valid).toBe(true);
      expect(quickDuration).toBeLessThan(fullDuration);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty body', async () => {
      const emptyBody = '';
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(emptyBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: emptyBody
      });

      const result = await validateWebhookSignature(request, emptyBody);
      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe('MALFORMED_BODY');
    });

    it('handles special characters in webhook secret', async () => {
      const specialSecret = 'secret-with-special-chars!@#$%^&*()';
      process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = specialSecret;
      
      const signature = crypto
        .createHmac('sha256', specialSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'Sandbox'
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      expect(result.valid).toBe(true);
    });

    it('handles case-insensitive environment headers', async () => {
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockBody)
        .digest('base64');

      const request = new NextRequest('https://example.com/api/webhooks/square', {
        method: 'POST',
        headers: {
          'x-square-hmacsha256-signature': signature,
          'square-environment': 'sandbox' // lowercase
        },
        body: mockBody
      });

      const result = await validateWebhookSignature(request, mockBody);
      expect(result.environment).toBe('sandbox');
    });
  });
});
