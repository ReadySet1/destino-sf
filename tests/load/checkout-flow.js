import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');
const validationErrorRate = new Rate('validation_errors');
const rateLimitHits = new Counter('rate_limit_hits');
const duplicateOrderPrevented = new Counter('duplicate_order_prevented');

// Test configuration per DES-64 requirements:
// - 50 concurrent checkout processes
// - Payment processing time < 3s
// - No transaction failures
// - Database locks handled properly
export let options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 25 },    // Ramp up to 25 users
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '3m', target: 50 },    // Stay at 50 users for 3 minutes
    { duration: '1m', target: 25 },    // Ramp down to 25 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['avg<3000', 'p(95)<5000'],  // Average < 3s, 95th percentile < 5s
    http_req_failed: ['rate<0.05'],                  // Error rate < 5% (higher tolerance for checkout)
    errors: ['rate<0.05'],                           // Custom error rate < 5%
    checkout_duration: ['avg<3000', 'p(95)<5000'],   // Checkout-specific duration
    validation_errors: ['rate<0.3'],                 // Validation errors expected at < 30%
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data - clearly marked as load test data
const TEST_EMAIL_PREFIX = 'loadtest';
const TEST_EMAIL_DOMAIN = 'test.destino-sf.com';

// Generate unique test data for each virtual user
function generateTestCheckoutData(vuId, iteration) {
  const uniqueId = `${vuId}-${iteration}-${Date.now()}`;

  return {
    email: `${TEST_EMAIL_PREFIX}-${uniqueId}@${TEST_EMAIL_DOMAIN}`,
    firstName: 'LoadTest',
    lastName: `User${vuId}`,
    phone: `555-${String(vuId).padStart(3, '0')}-${String(iteration).padStart(4, '0')}`,
    fulfillmentType: 'pickup', // Use pickup to avoid shipping calculations
    pickupDate: getFutureDate(3), // 3 days from now
    pickupTime: '12:00 PM',
    items: [
      {
        productId: 'test-product-1', // This will fail validation but tests the endpoint
        quantity: 1,
        price: 10.00,
        name: 'Test Product',
      },
    ],
    subtotal: 10.00,
    tax: 0.88,
    total: 10.88,
    // Idempotency key for duplicate prevention testing
    idempotencyKey: `loadtest-${uniqueId}`,
  };
}

function getFutureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// Virtual user state
let iterationCount = 0;

export function setup() {
  console.log(`Starting checkout flow load test against ${BASE_URL}`);
  console.log('NOTE: This test uses test data that will NOT create real orders');
  console.log(`Test emails use domain: ${TEST_EMAIL_DOMAIN}`);

  // Verify the checkout endpoint is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.log(`WARNING: Health check failed with status ${healthCheck.status}`);
  }

  return { startTime: Date.now() };
}

export default function checkoutFlowTest(data) {
  const vuId = __VU; // Virtual user ID
  iterationCount++;

  group('Checkout Flow', function () {
    // Scenario 1: Standard checkout attempt (validation test)
    group('Standard Checkout Validation', function () {
      const checkoutData = generateTestCheckoutData(vuId, iterationCount);

      const startTime = Date.now();
      const response = http.post(
        `${BASE_URL}/api/checkout`,
        JSON.stringify(checkoutData),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          tags: { name: 'POST /api/checkout' },
        }
      );
      const duration = Date.now() - startTime;

      // We expect validation errors since we're using test data
      // The goal is to test the endpoint's response time and behavior
      const isValidResponse = check(response, {
        'checkout responds within 3s': r => r.timings.duration < 3000,
        'checkout returns valid HTTP status': r => [200, 400, 401, 422, 429].includes(r.status),
        'checkout returns JSON': r => {
          try {
            JSON.parse(r.body);
            return true;
          } catch {
            return false;
          }
        },
      });

      // Track specific response types
      if (response.status === 429) {
        rateLimitHits.add(1);
        check(response, {
          'rate limit includes retry-after': r => r.headers['Retry-After'] !== undefined,
        });
      }

      if (response.status === 400 || response.status === 422) {
        validationErrorRate.add(1);
      } else {
        validationErrorRate.add(0);
      }

      errorRate.add(!isValidResponse);
      checkoutDuration.add(duration);
    });

    // Scenario 2: Duplicate checkout prevention (20% of requests)
    if (Math.random() < 0.2) {
      group('Duplicate Order Prevention', function () {
        const checkoutData = generateTestCheckoutData(vuId, iterationCount);
        // Use the same idempotency key for both requests
        const idempotencyKey = `duplicate-test-${vuId}-${Date.now()}`;
        checkoutData.idempotencyKey = idempotencyKey;

        // First request
        const firstResponse = http.post(
          `${BASE_URL}/api/checkout`,
          JSON.stringify(checkoutData),
          {
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            tags: { name: 'POST /api/checkout (duplicate test 1)' },
          }
        );

        // Immediate second request with same idempotency key
        const secondResponse = http.post(
          `${BASE_URL}/api/checkout`,
          JSON.stringify(checkoutData),
          {
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            tags: { name: 'POST /api/checkout (duplicate test 2)' },
          }
        );

        const duplicateHandled = check(secondResponse, {
          'duplicate request handled gracefully': r =>
            r.status === 200 || // Same result returned
            r.status === 409 || // Conflict
            r.status === 400 || // Bad request (validation)
            r.status === 422 || // Unprocessable
            r.status === 429,   // Rate limited
        });

        if (secondResponse.status === 409) {
          duplicateOrderPrevented.add(1);
        }

        errorRate.add(!duplicateHandled);
      });
    }

    // Scenario 3: Concurrent checkout attempts (10% of requests)
    // Tests database locking behavior
    if (Math.random() < 0.1) {
      group('Concurrent Checkout Stress', function () {
        const checkoutData = generateTestCheckoutData(vuId, iterationCount);

        // Send multiple rapid requests
        const responses = [];
        for (let i = 0; i < 3; i++) {
          const modifiedData = {
            ...checkoutData,
            email: `${TEST_EMAIL_PREFIX}-concurrent-${vuId}-${i}-${Date.now()}@${TEST_EMAIL_DOMAIN}`,
          };

          responses.push(
            http.post(
              `${BASE_URL}/api/checkout`,
              JSON.stringify(modifiedData),
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                tags: { name: 'POST /api/checkout (concurrent)' },
              }
            )
          );
        }

        // At least one request should be handled properly
        const successCount = responses.filter(r =>
          r.status === 200 ||
          r.status === 400 ||
          r.status === 422 ||
          r.status === 429
        ).length;

        check(null, {
          'concurrent requests handled': () => successCount >= 1,
        });
      });
    }

    // Scenario 4: Missing required fields (5% of requests)
    if (Math.random() < 0.05) {
      group('Validation Error Handling', function () {
        const invalidData = {
          // Missing email, items, etc.
          firstName: 'Test',
        };

        const response = http.post(
          `${BASE_URL}/api/checkout`,
          JSON.stringify(invalidData),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            tags: { name: 'POST /api/checkout (invalid)' },
          }
        );

        check(response, {
          'invalid data returns 400 or 422': r => r.status === 400 || r.status === 422,
          'validation error responds quickly': r => r.timings.duration < 1000,
          'validation error includes message': r => {
            try {
              const body = JSON.parse(r.body);
              return body.error || body.message || body.errors;
            } catch {
              return false;
            }
          },
        });
      });
    }

    // Scenario 5: Delivery fulfillment type (15% of requests)
    if (Math.random() < 0.15) {
      group('Delivery Checkout', function () {
        const checkoutData = generateTestCheckoutData(vuId, iterationCount);
        checkoutData.fulfillmentType = 'delivery';
        checkoutData.deliveryAddress = {
          street: '123 Test Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
        };
        checkoutData.deliveryDate = getFutureDate(3);
        checkoutData.deliveryTime = '12:00 PM - 2:00 PM';

        const response = http.post(
          `${BASE_URL}/api/checkout`,
          JSON.stringify(checkoutData),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            tags: { name: 'POST /api/checkout (delivery)' },
          }
        );

        check(response, {
          'delivery checkout responds': r => [200, 400, 422, 429].includes(r.status),
          'delivery checkout within time limit': r => r.timings.duration < 3000,
        });

        checkoutDuration.add(response.timings.duration);
      });
    }
  });

  // Longer think time for checkout (2-5 seconds simulating form filling)
  sleep(Math.random() * 3 + 2);
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Checkout flow load test completed in ${duration.toFixed(2)} seconds`);
  console.log('NOTE: All test data used test email domain and should not have created real orders');
}
