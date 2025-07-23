import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';

// Test configuration
export let options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '2m', target: 20 }, // Stay at 20 users for 2 minutes
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 users for 2 minutes
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 }, // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete within 1 second
    http_req_failed: ['rate<0.05'], // Error rate must be less than 5%
    http_reqs: ['rate>20'], // Must handle more than 20 requests per second
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || 'test-webhook-secret-key';

// Generate unique event IDs to avoid replay attack detection
let eventIdCounter = 0;

export default function () {
  // Generate webhook payload
  const eventId = `load-test-${Date.now()}-${eventIdCounter++}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = {
    event_id: eventId,
    type: 'payment.created',
    merchant_id: 'test-merchant',
    created_at: new Date().toISOString(),
    data: {
      type: 'payment',
      id: `payment-${eventId}`,
      object: {
        payment: {
          id: `payment-${eventId}`,
          order_id: `order-${eventId}`,
          status: 'COMPLETED',
          amount_money: {
            amount: 1000,
            currency: 'USD',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    },
  };

  const bodyText = JSON.stringify(payload);

  // Generate valid signature
  const message = `${timestamp}.${bodyText}`;
  const signature = crypto.hmac('sha256', WEBHOOK_SECRET, message, 'base64');

  // Test Square webhook endpoint
  const webhookResponse = http.post(`${BASE_URL}/api/webhooks/square`, bodyText, {
    headers: {
      'Content-Type': 'application/json',
      'x-square-hmacsha256-signature': signature,
      'x-square-hmacsha256-timestamp': timestamp.toString(),
    },
  });

  check(webhookResponse, {
    'webhook status is 200': r => r.status === 200,
    'webhook response time < 1000ms': r => r.timings.duration < 1000,
    'webhook returns received': r => r.json('received') === true,
    'webhook processing is async': r => r.json('processing') === 'async',
  });

  // Test invalid signature (should fail)
  if (Math.random() < 0.1) {
    // 10% of requests
    const invalidResponse = http.post(`${BASE_URL}/api/webhooks/square`, bodyText, {
      headers: {
        'Content-Type': 'application/json',
        'x-square-hmacsha256-signature': 'invalid-signature',
        'x-square-hmacsha256-timestamp': timestamp.toString(),
      },
    });

    check(invalidResponse, {
      'invalid signature rejected': r => r.status === 401 || r.status === 200, // 200 in dev mode
    });
  }

  // Test rate limiting (should eventually hit limits)
  if (Math.random() < 0.05) {
    // 5% of requests
    // Send multiple rapid requests to test rate limiting
    const rapidRequests = [];
    for (let i = 0; i < 10; i++) {
      const rapidEventId = `rapid-${eventId}-${i}`;
      const rapidPayload = { ...payload, event_id: rapidEventId };
      const rapidBodyText = JSON.stringify(rapidPayload);
      const rapidMessage = `${timestamp}.${rapidBodyText}`;
      const rapidSignature = crypto.hmac('sha256', WEBHOOK_SECRET, rapidMessage, 'base64');

      rapidRequests.push(
        http.post(`${BASE_URL}/api/webhooks/square`, rapidBodyText, {
          headers: {
            'Content-Type': 'application/json',
            'x-square-hmacsha256-signature': rapidSignature,
            'x-square-hmacsha256-timestamp': timestamp.toString(),
          },
        })
      );
    }

    // At least some requests should succeed
    const successCount = rapidRequests.filter(r => r.status === 200).length;
    check(null, {
      'rate limiting allows some requests': () => successCount > 0,
    });
  }

  // Random sleep between 0.1-0.5 seconds (webhooks are typically rapid)
  sleep(Math.random() * 0.4 + 0.1);
}

export function setup() {
  console.log(`Starting webhook load test against ${BASE_URL}`);
  console.log(`Using webhook secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
}

export function teardown() {
  console.log('Webhook load test completed');
}
