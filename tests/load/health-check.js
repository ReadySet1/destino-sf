import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export let options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users for 1 minute
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users for 2 minutes
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be less than 10%
    http_reqs: ['rate>10'],           // Must handle more than 10 requests per second
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Test basic health check
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check returns status': (r) => r.json('status') === 'healthy',
  });

  // Test detailed health check (less frequently)
  if (Math.random() < 0.3) { // 30% of requests
    const detailedResponse = http.get(`${BASE_URL}/api/health/detailed`);
    
    check(detailedResponse, {
      'detailed health check status is 200': (r) => r.status === 200,
      'detailed health check response time < 500ms': (r) => r.timings.duration < 500,
      'detailed health check returns services': (r) => r.json('services') !== undefined,
      'detailed health check shows database': (r) => r.json('services.database') !== undefined,
      'detailed health check shows cache': (r) => r.json('services.cache') !== undefined,
    });
  }

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
}

export function teardown() {
  console.log('Load test completed');
} 