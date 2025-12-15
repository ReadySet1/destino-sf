# Load Testing Guide

This guide covers load testing for Destino SF using [k6](https://k6.io/), a modern load testing tool.

## Overview

Load testing helps ensure the application performs well under expected and peak traffic conditions. Our load tests cover:

- **Product Browsing**: Catalog and category browsing (100 concurrent users)
- **Checkout Flow**: Order processing with concurrency testing (50 concurrent users)
- **API Stress**: Heavy load with spike scenarios (up to 200 concurrent users)
- **Health Checks**: System health endpoint validation
- **Webhook Processing**: Square webhook handling under load

## Prerequisites

### Install k6

k6 is already included as a dev dependency. To install it globally:

```bash
# macOS
brew install k6

# Or via npm (already in package.json)
pnpm add -D k6
```

### Server Requirements

Ensure the development server is running:

```bash
pnpm dev
```

## Running Load Tests

### Quick Start

Run all load tests:

```bash
./scripts/run-load-tests.sh
```

Run a specific test:

```bash
./scripts/run-load-tests.sh -t product-browsing
./scripts/run-load-tests.sh -t checkout-flow
./scripts/run-load-tests.sh -t api-stress
./scripts/run-load-tests.sh -t health-check
./scripts/run-load-tests.sh -t webhook-processing
```

### Test Against Different Environments

```bash
# Local development
./scripts/run-load-tests.sh -u http://localhost:3000

# Staging
./scripts/run-load-tests.sh -u https://staging.destino-sf.com

# Production (use with caution!)
./scripts/run-load-tests.sh -u https://destino-sf.com
```

### Additional Options

```bash
./scripts/run-load-tests.sh --help

Options:
  -h, --help          Show help message
  -u, --url URL       Base URL for testing (default: http://localhost:3000)
  -s, --secret SECRET Webhook secret for testing
  -t, --test TEST     Run specific test only
  --skip-warmup       Skip server warmup
  --skip-checks       Skip pre-flight checks
```

## Test Scenarios

### 1. Product Browsing (`product-browsing.js`)

Tests the product catalog under realistic browsing patterns.

**Scenarios:**
- Browse all products
- Browse products with variants
- Filter by category
- Search products
- Paginated browsing
- Catering product browsing

**Thresholds:**
| Metric | Target |
|--------|--------|
| Concurrent Users | 100 |
| Average Response Time | < 500ms |
| 95th Percentile | < 1000ms |
| Error Rate | < 1% |

**Run:**
```bash
./scripts/run-load-tests.sh -t product-browsing
```

### 2. Checkout Flow (`checkout-flow.js`)

Tests checkout processing with concurrency and duplicate prevention.

**Scenarios:**
- Standard checkout validation
- Duplicate order prevention (idempotency)
- Concurrent checkout attempts
- Validation error handling
- Delivery vs pickup fulfillment

**Thresholds:**
| Metric | Target |
|--------|--------|
| Concurrent Checkouts | 50 |
| Average Response Time | < 3000ms |
| 95th Percentile | < 5000ms |
| Error Rate | < 5% |

**Note:** Uses test data with `loadtest-*@test.destino-sf.com` emails. No real orders are created.

**Run:**
```bash
./scripts/run-load-tests.sh -t checkout-flow
```

### 3. API Stress Test (`api-stress.js`)

Tests API resilience under extreme load with multiple scenarios.

**Scenarios:**
1. **Constant Load**: 50 VUs for 2 minutes
2. **Ramping Load**: 0 → 100 → 150 → 200 → 0 VUs
3. **Spike Test**: Sudden spike from 10 to 200 VUs

**Endpoints Tested:**
- `/api/products` (30% weight)
- `/api/categories` (20% weight)
- `/api/health` (15% weight)
- `/api/catering/*` (20% weight)
- Various filtered product queries

**Thresholds:**
| Metric | Target |
|--------|--------|
| Peak Concurrent Users | 200 |
| 90th Percentile | < 2000ms |
| 99th Percentile | < 5000ms |
| Error Rate | < 10% |

**Run:**
```bash
./scripts/run-load-tests.sh -t api-stress
```

### 4. Health Check (`health-check.js`)

Baseline performance test for health endpoints.

**Run:**
```bash
./scripts/run-load-tests.sh -t health-check
```

### 5. Webhook Processing (`webhook-processing.js`)

Tests Square webhook handling with signature validation.

**Run:**
```bash
./scripts/run-load-tests.sh -t webhook-processing
```

## Understanding Results

### Test Output

Results are saved to `test-results/load-tests/`:

```
test-results/load-tests/
├── product-browsing_20241215_143022.json
├── product-browsing_20241215_143022.log
├── product-browsing_20241215_143022_summary.txt
├── product-browsing_20241215_143022_export.json
└── load_test_report_20241215_143022.md
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| `http_req_duration` | Request latency (avg, min, max, p90, p95, p99) |
| `http_req_failed` | Percentage of failed requests |
| `http_reqs` | Total requests and request rate |
| `vus` | Number of virtual users |
| `iteration_duration` | Time per test iteration |

### Custom Metrics

Our tests track additional metrics:

| Metric | Description |
|--------|-------------|
| `errors` | Custom error rate |
| `rate_limited_requests` | Requests that received 429 |
| `checkout_duration` | Checkout-specific latency |
| `product_list_duration` | Product listing latency |

### Interpreting Results

**Good Performance:**
- `http_req_duration{p(95)}` < threshold
- `http_req_failed` < 1%
- Consistent response times across the test

**Warning Signs:**
- Response times increasing over time (potential memory leak)
- High rate of 429 responses (rate limiting triggered)
- Error rate spikes during load ramps

**Critical Issues:**
- Error rate > 5%
- Response times > 5s
- Timeout errors

## Performance Thresholds

### DES-64 Acceptance Criteria

| Scenario | Concurrent Users | Avg Response | P95 Response | Error Rate |
|----------|------------------|--------------|--------------|------------|
| Product Browsing | 100 | < 500ms | < 1000ms | < 1% |
| Checkout | 50 | < 3000ms | < 5000ms | < 5% |
| API Stress | 200 | < 2000ms | < 5000ms | < 10% |

### Rate Limiting

The application has rate limiting configured:

| Endpoint | Limit |
|----------|-------|
| Checkout | 10 req/min per IP |
| Payment | 5 req/min per IP |
| Webhooks | 50 req/min (production) |
| Standard API | 100 req/min |

Load tests will hit these limits intentionally to verify they work correctly.

## Troubleshooting

### Test Fails to Start

```bash
# Check if k6 is installed
k6 version

# Check if server is running
curl http://localhost:3000/api/health
```

### High Error Rates

1. Check server logs for errors
2. Verify database connection pool isn't exhausted
3. Check Redis/cache availability
4. Review rate limiting configuration

### Slow Response Times

1. Check database query performance
2. Review cache hit rates
3. Monitor memory usage during tests
4. Check for N+1 query problems

### Memory Leaks

Run a longer test to detect memory issues:

```bash
# Run stress test for extended period
k6 run --duration 30m tests/load/api-stress.js
```

Monitor server memory during the test.

## Best Practices

### Before Running Load Tests

1. **Notify team**: Load tests can affect shared environments
2. **Check environment**: Ensure you're testing the right environment
3. **Review thresholds**: Adjust based on expected traffic patterns
4. **Backup data**: For staging/production tests

### During Load Tests

1. **Monitor resources**: Watch CPU, memory, database connections
2. **Check logs**: Look for errors or warnings
3. **Watch metrics**: Real-time k6 output shows current performance

### After Load Tests

1. **Review results**: Check all thresholds passed
2. **Document findings**: Note any bottlenecks or issues
3. **Create tickets**: For any performance issues found
4. **Clean up**: Remove test data if needed

## Scaling Recommendations

Based on load testing results:

### Database
- Connection pool size: 20 (production)
- Consider read replicas for heavy read traffic
- Index frequently queried columns

### Caching
- Redis for session and API response caching
- Cache TTLs: Products (15 min), Categories (1 hour)

### Application
- Vercel auto-scaling handles most traffic
- Function timeout: 60s for checkout, 30s for reads
- Consider edge functions for static data

### Infrastructure
- CDN for static assets
- Database connection pooling via Supabase
- Rate limiting to prevent abuse

## Related Documentation

- [Performance Guidelines](./PERFORMANCE_GUIDELINES.md)
- [Concurrency Patterns](./CONCURRENCY_PATTERNS.md)
- [Testing Guide](./TESTING_GUIDE.md)
