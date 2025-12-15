import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const rateLimitedRequests = new Counter('rate_limited_requests');
const successfulRequests = new Counter('successful_requests');
const apiResponseTime = new Trend('api_response_time');
const activeConnections = new Gauge('active_connections');

// Test configuration per DES-64 requirements:
// - API endpoints under heavy load
// - Rate limiting working correctly
// - Graceful degradation under stress
// - No memory leaks (long-running test)
export let options = {
  scenarios: {
    // Constant load scenario
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      gracefulStop: '30s',
    },
    // Ramping load scenario
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },   // Ramp up to 100 users
        { duration: '3m', target: 150 },   // Ramp up to 150 users (stress)
        { duration: '2m', target: 200 },   // Peak stress at 200 users
        { duration: '1m', target: 100 },   // Ramp down
        { duration: '30s', target: 0 },    // Cool down
      ],
      gracefulStop: '30s',
      startTime: '2m30s', // Start after constant_load
    },
    // Spike test scenario
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 10 },   // Normal load
        { duration: '10s', target: 200 },  // Spike!
        { duration: '30s', target: 200 },  // Stay at spike
        { duration: '10s', target: 10 },   // Back to normal
        { duration: '30s', target: 10 },   // Recover
      ],
      gracefulStop: '10s',
      startTime: '10m', // Start after ramping_load
    },
  },
  thresholds: {
    http_req_duration: ['p(90)<2000', 'p(99)<5000'],  // 90th < 2s, 99th < 5s
    http_req_failed: ['rate<0.1'],                    // Error rate < 10% under stress
    errors: ['rate<0.1'],
    'http_req_duration{type:read}': ['avg<500'],      // Read operations < 500ms avg
    'http_req_duration{type:health}': ['avg<200'],    // Health checks < 200ms avg
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Endpoint weights (probability of being called)
const ENDPOINTS = [
  { path: '/api/products', weight: 30, type: 'read', name: 'products' },
  { path: '/api/categories', weight: 20, type: 'read', name: 'categories' },
  { path: '/api/health', weight: 15, type: 'health', name: 'health' },
  { path: '/api/health/detailed', weight: 5, type: 'health', name: 'health-detailed' },
  { path: '/api/catering/lunch', weight: 10, type: 'read', name: 'catering-lunch' },
  { path: '/api/catering/appetizers', weight: 5, type: 'read', name: 'catering-appetizers' },
  { path: '/api/catering/buffet', weight: 5, type: 'read', name: 'catering-buffet' },
  { path: '/api/products?includeVariants=true', weight: 5, type: 'read', name: 'products-variants' },
  { path: '/api/products?onlyActive=true', weight: 5, type: 'read', name: 'products-active' },
];

// Calculate cumulative weights for weighted random selection
const totalWeight = ENDPOINTS.reduce((sum, ep) => sum + ep.weight, 0);
let cumulativeWeights = [];
let cumulative = 0;
for (const ep of ENDPOINTS) {
  cumulative += ep.weight;
  cumulativeWeights.push({ ...ep, cumulative });
}

function selectEndpoint() {
  const rand = Math.random() * totalWeight;
  for (const ep of cumulativeWeights) {
    if (rand <= ep.cumulative) {
      return ep;
    }
  }
  return cumulativeWeights[cumulativeWeights.length - 1];
}

export function setup() {
  console.log(`Starting API stress test against ${BASE_URL}`);
  console.log('This test will stress the API with high concurrent load');
  console.log('Expected behaviors:');
  console.log('  - Rate limiting should activate under heavy load');
  console.log('  - Response times may increase under stress');
  console.log('  - System should degrade gracefully, not crash');

  // Warm up the server
  for (let i = 0; i < 5; i++) {
    http.get(`${BASE_URL}/api/health`);
  }

  return {
    startTime: Date.now(),
    initialMemoryCheck: Date.now(),
  };
}

export default function apiStressTest() {
  const endpoint = selectEndpoint();

  group(`API Stress - ${endpoint.name}`, function () {
    const startTime = Date.now();

    const response = http.get(`${BASE_URL}${endpoint.path}`, {
      tags: {
        name: `GET ${endpoint.path}`,
        type: endpoint.type,
        endpoint: endpoint.name,
      },
      timeout: '30s', // Longer timeout for stress testing
    });

    const duration = Date.now() - startTime;
    apiResponseTime.add(duration);

    // Track rate limiting
    if (response.status === 429) {
      rateLimitedRequests.add(1);

      check(response, {
        'rate limit response includes retry-after': r => {
          const retryAfter = r.headers['Retry-After'];
          return retryAfter !== undefined;
        },
        'rate limit response is fast': r => r.timings.duration < 100,
      });

      // Short sleep when rate limited
      const retryAfter = parseInt(response.headers['Retry-After'] || '1', 10);
      sleep(Math.min(retryAfter, 5)); // Max 5 second wait
      return;
    }

    // Track successful requests
    if (response.status === 200) {
      successfulRequests.add(1);
    }

    // Check response validity based on endpoint type
    let success = false;

    if (endpoint.type === 'health') {
      success = check(response, {
        [`${endpoint.name} status is 200`]: r => r.status === 200,
        [`${endpoint.name} responds within 1s`]: r => r.timings.duration < 1000,
        [`${endpoint.name} returns valid JSON`]: r => {
          try {
            JSON.parse(r.body);
            return true;
          } catch {
            return false;
          }
        },
      });
    } else if (endpoint.type === 'read') {
      success = check(response, {
        [`${endpoint.name} status is 200 or 429`]: r => r.status === 200 || r.status === 429,
        [`${endpoint.name} responds within 3s`]: r => r.timings.duration < 3000,
        [`${endpoint.name} returns valid response`]: r => {
          if (r.status === 429) return true; // Rate limiting is expected
          try {
            const body = JSON.parse(r.body);
            return body !== null && typeof body === 'object';
          } catch {
            return false;
          }
        },
      });
    }

    errorRate.add(!success);
  });

  // Variable think time based on current load
  // Shorter pauses create more stress
  const scenario = __ENV.K6_SCENARIO;
  if (scenario === 'spike_test') {
    sleep(Math.random() * 0.2); // Very short for spike test
  } else if (scenario === 'ramping_load') {
    sleep(Math.random() * 0.5 + 0.1); // Short for ramping
  } else {
    sleep(Math.random() * 1 + 0.5); // Normal for constant load
  }
}

// Periodically check system health during stress test
export function healthCheck() {
  group('Periodic Health Check', function () {
    const response = http.get(`${BASE_URL}/api/health/detailed`, {
      tags: { name: 'GET /api/health/detailed (periodic)' },
    });

    check(response, {
      'system still responsive': r => r.status === 200,
      'system health check < 2s': r => r.timings.duration < 2000,
    });

    if (response.status === 200) {
      try {
        const health = JSON.parse(response.body);
        // Log any degradation
        if (health.services) {
          for (const [service, status] of Object.entries(health.services)) {
            if (status !== 'healthy' && status?.status !== 'healthy') {
              console.log(`WARNING: Service ${service} is ${JSON.stringify(status)}`);
            }
          }
        }
      } catch (e) {
        // Ignore parse errors during stress
      }
    }
  });
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\nAPI stress test completed in ${duration.toFixed(2)} seconds`);
  console.log('\nKey observations:');
  console.log('- Check the rate_limited_requests counter to see if rate limiting activated');
  console.log('- Check http_req_duration percentiles for response time degradation');
  console.log('- Check errors rate for system stability under load');
  console.log('\nRecommendations:');
  console.log('- If rate limiting activated heavily, consider scaling or optimizing');
  console.log('- If error rate > 5%, investigate specific failing endpoints');
  console.log('- If p99 response time > 5s, database or cache may be bottlenecks');
}

// Handle summary for custom reporting
export function handleSummary(data) {
  // Calculate key metrics
  const httpReqs = data.metrics.http_reqs?.values?.count || 0;
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const errorRate = data.metrics.http_req_failed?.values?.rate || 0;
  const rateLimited = data.metrics.rate_limited_requests?.values?.count || 0;

  const summary = {
    'Total Requests': httpReqs,
    'Average Response Time (ms)': avgDuration.toFixed(2),
    'P95 Response Time (ms)': p95Duration.toFixed(2),
    'Error Rate (%)': (errorRate * 100).toFixed(2),
    'Rate Limited Requests': rateLimited,
    'Rate Limit Percentage (%)': httpReqs > 0 ? ((rateLimited / httpReqs) * 100).toFixed(2) : '0.00',
  };

  console.log('\n=== API Stress Test Summary ===');
  for (const [key, value] of Object.entries(summary)) {
    console.log(`${key}: ${value}`);
  }

  // Performance grade
  let grade = 'A';
  if (errorRate > 0.1) grade = 'F';
  else if (errorRate > 0.05) grade = 'D';
  else if (p95Duration > 3000) grade = 'C';
  else if (p95Duration > 2000) grade = 'B';

  console.log(`\nPerformance Grade: ${grade}`);

  return {
    stdout: JSON.stringify(summary, null, 2),
  };
}
