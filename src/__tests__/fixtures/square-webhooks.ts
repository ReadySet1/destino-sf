/**
 * Test Fixtures for Square Webhooks
 *
 * Provides utilities for creating mock webhook requests, payloads,
 * and signatures for comprehensive testing of the webhook system.
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { type SquareWebhookPayload, type SquareEnvironment } from '@/types/webhook';

export interface MockWebhookOptions {
  type?: string;
  environment?: SquareEnvironment;
  secret?: string;
  eventId?: string;
  merchantId?: string;
  timestamp?: string;
  additionalHeaders?: Record<string, string>;
  additionalPayloadData?: Record<string, unknown>;
}

/**
 * Create a mock Square webhook request with proper signature
 */
export function createMockSquareWebhook(options: MockWebhookOptions = {}): {
  request: NextRequest;
  payload: SquareWebhookPayload;
  signature: string;
  body: string;
} {
  const {
    type = 'payment.created',
    environment = 'sandbox',
    secret = 'test-webhook-secret',
    eventId = `test-event-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    merchantId = 'TEST_MERCHANT_123',
    timestamp = new Date().toISOString(),
    additionalHeaders = {},
    additionalPayloadData = {},
  } = options;

  // Create webhook payload
  const payload: SquareWebhookPayload = {
    merchant_id: merchantId,
    type,
    event_id: eventId,
    created_at: timestamp,
    data: {
      type: type.split('.')[0], // e.g., 'payment' from 'payment.created'
      id: `${type.split('.')[0]}_${eventId}`,
      object: {
        id: `${type.split('.')[0]}_${eventId}`,
        ...getDefaultObjectForType(type),
        ...additionalPayloadData,
      },
    },
  };

  const body = JSON.stringify(payload);

  // Generate signature
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64');

  // Create request headers
  const headers: Record<string, string> = {
    'x-square-hmacsha256-signature': signature,
    'square-environment': environment === 'sandbox' ? 'Sandbox' : 'Production',
    'content-type': 'application/json',
    'content-length': body.length.toString(),
    'user-agent': 'Square-Webhook/1.0',
    ...additionalHeaders,
  };

  // Create NextRequest
  const request = new NextRequest('https://example.com/api/webhooks/square', {
    method: 'POST',
    headers,
    body,
  });

  return { request, payload, signature, body };
}

/**
 * Create a mock request with specific headers and body
 */
export function createMockRequest(options: {
  headers?: Record<string, string>;
  body?: string;
  method?: string;
  url?: string;
}): NextRequest {
  const {
    headers = {},
    body = '',
    method = 'POST',
    url = 'https://example.com/api/webhooks/square',
  } = options;

  return new NextRequest(url, {
    method,
    headers,
    body,
  });
}

/**
 * Get default object structure for different webhook types
 */
function getDefaultObjectForType(type: string): Record<string, unknown> {
  switch (type) {
    case 'payment.created':
    case 'payment.updated':
      return {
        amount_money: { amount: 1000, currency: 'USD' },
        status: 'COMPLETED',
        order_id: 'order_test_123',
        location_id: 'location_test_123',
        created_at: new Date().toISOString(),
      };

    case 'order.created':
    case 'order.updated':
      return {
        state: 'OPEN',
        location_id: 'location_test_123',
        total_money: { amount: 1000, currency: 'USD' },
        created_at: new Date().toISOString(),
      };

    case 'order.fulfillment.updated':
      return {
        state: 'PREPARED',
        location_id: 'location_test_123',
        fulfillments: [
          {
            type: 'PICKUP',
            state: 'PREPARED',
          },
        ],
      };

    case 'refund.created':
    case 'refund.updated':
      return {
        status: 'COMPLETED',
        amount_money: { amount: 500, currency: 'USD' },
        payment_id: 'payment_test_123',
        order_id: 'order_test_123',
        location_id: 'location_test_123',
        created_at: new Date().toISOString(),
      };

    default:
      return {
        id: `${type}_test_123`,
        created_at: new Date().toISOString(),
      };
  }
}

/**
 * Create webhook payload with invalid signature
 */
export function createInvalidSignatureWebhook(options: MockWebhookOptions = {}): {
  request: NextRequest;
  payload: SquareWebhookPayload;
} {
  const mockData = createMockSquareWebhook(options);

  // Create request with wrong signature
  const request = new NextRequest('https://example.com/api/webhooks/square', {
    method: 'POST',
    headers: {
      'x-square-hmacsha256-signature': 'definitely-wrong-signature',
      'square-environment': options.environment === 'production' ? 'Production' : 'Sandbox',
      'content-type': 'application/json',
    },
    body: mockData.body,
  });

  return { request, payload: mockData.payload };
}

/**
 * Create webhook payload with missing required fields
 */
export function createInvalidPayloadWebhook(): {
  request: NextRequest;
  body: string;
} {
  const invalidPayload = {
    // Missing required fields like event_id, type, etc.
    merchant_id: 'TEST_MERCHANT',
    some_field: 'some_value',
  };

  const body = JSON.stringify(invalidPayload);
  const signature = crypto.createHmac('sha256', 'test-secret').update(body).digest('base64');

  const request = new NextRequest('https://example.com/api/webhooks/square', {
    method: 'POST',
    headers: {
      'x-square-hmacsha256-signature': signature,
      'square-environment': 'Sandbox',
    },
    body,
  });

  return { request, body };
}

/**
 * Create webhook with old timestamp (for replay attack testing)
 */
export function createOldTimestampWebhook(minutesOld: number = 10): {
  request: NextRequest;
  payload: SquareWebhookPayload;
} {
  const oldTimestamp = new Date(Date.now() - minutesOld * 60 * 1000).toISOString();

  return createMockSquareWebhook({
    type: 'payment.created',
    timestamp: oldTimestamp,
    secret: 'test-webhook-secret',
  });
}

/**
 * Create multiple webhook requests for load testing
 */
export function createWebhookBatch(
  count: number,
  options: MockWebhookOptions = {}
): Array<{
  request: NextRequest;
  payload: SquareWebhookPayload;
}> {
  return Array.from({ length: count }, (_, index) =>
    createMockSquareWebhook({
      ...options,
      eventId: `batch-event-${index}-${Date.now()}`,
      type: options.type || ['payment.created', 'order.updated', 'payment.updated'][index % 3],
    })
  );
}

/**
 * Helper to validate webhook signature manually (for testing the validator)
 */
export function validateSignatureManually(
  body: string,
  secret: string,
  algorithm: 'sha256' | 'sha1' = 'sha256'
): string {
  return crypto.createHmac(algorithm, secret).update(body).digest('base64');
}

/**
 * Create webhook with specific error conditions for testing
 */
export function createErrorConditionWebhook(
  errorType: 'missing_signature' | 'invalid_json' | 'missing_secret'
): NextRequest {
  const payload = createMockSquareWebhook().payload;
  const body = errorType === 'invalid_json' ? '{ invalid }' : JSON.stringify(payload);

  const headers: Record<string, string> = {
    'square-environment': 'Sandbox',
    'content-type': 'application/json',
  };

  // Add signature only if not testing missing signature
  if (errorType !== 'missing_signature') {
    headers['x-square-hmacsha256-signature'] = crypto
      .createHmac('sha256', 'test-secret')
      .update(body)
      .digest('base64');
  }

  return new NextRequest('https://example.com/api/webhooks/square', {
    method: 'POST',
    headers,
    body,
  });
}
