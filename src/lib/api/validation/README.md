# External API Validation Infrastructure

This directory contains the runtime validation infrastructure for external API responses (Square and Shippo).

## Overview

The validation infrastructure provides:

- **Runtime schema validation** using Zod schemas
- **Non-blocking validation** - failures are logged but don't break requests
- **Monitoring and metrics** - track validation success/failure rates
- **Type-safe wrappers** - maintain TypeScript types while validating at runtime

## Quick Start

### Basic Usage

```typescript
import { validateExternalApiResponse } from '@/lib/api/validation/external-api-validator';
import { CreatePaymentResponseSchema } from '@/lib/api/schemas/external/square/payments';

// Make API call
const response = await squareClient.paymentsApi.createPayment(request);

// Validate response
const validation = validateExternalApiResponse(response.result, CreatePaymentResponseSchema, {
  apiName: 'Square Payments API',
  operation: 'createPayment',
  requestId: response.headers?.['square-request-id'],
});

// Use validated data (or original data if validation failed)
const payment = validation.data || response.result;
```

### Async API Call Wrapper

```typescript
import { validateExternalApiCall } from '@/lib/api/validation/external-api-validator';
import { ShippoShipmentResponseSchema } from '@/lib/api/schemas/external/shippo';

// Validate entire API call (including error handling)
const validation = await validateExternalApiCall(
  async () => {
    const response = await shippoClient.shipment.create(request);
    return response;
  },
  ShippoShipmentResponseSchema,
  {
    apiName: 'Shippo Shipments API',
    operation: 'createShipment',
  }
);

if (validation.success) {
  console.log('Shipment created:', validation.data);
} else {
  console.warn('Validation failed, but shipment may have been created');
}
```

## Architecture

### Non-Blocking Design

Validation failures **never block requests**. When validation fails:

1. The error is logged to the monitoring system
2. Statistics are updated
3. The original (unvalidated) data is returned
4. Execution continues normally

This ensures:

- **Production stability** - Breaking API changes don't cause outages
- **Gradual migration** - Add validation incrementally without risk
- **Observability** - Get alerts about API changes without service disruption

### Validation Flow

```
┌─────────────────┐
│  API Response   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Validate with Schema   │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │ Success?│
    └────┬────┘
         │
    ┌────┴────┐
    │   YES   │──────────────────┐
    └─────────┘                  │
         │                       │
         ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│ Return Validated│   │  Return Valid   │
│      Data       │   │      Data       │
└─────────────────┘   └─────────────────┘
         │
    ┌────┴────┐
    │   NO    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│  Log Failure    │
│  + Update Stats │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Original │
│  (Unvalidated)  │
└─────────────────┘
```

## Files

### Core Infrastructure

- **`external-api-validator.ts`** - Main validation utilities
  - `validateExternalApiResponse()` - Validate synchronous responses
  - `validateExternalApiCall()` - Validate async API calls
  - `validateBatch()` - Validate arrays of items
  - `getValidationStats()` - Get monitoring statistics

- **`integration-examples.ts`** - Integration examples
  - Example integrations for Square APIs
  - Example integrations for Shippo APIs
  - Wrapper patterns for consistent validation

- **`README.md`** - This documentation file

### Schema Files

Zod schemas are organized by API:

**Square APIs:**

- `@/lib/api/schemas/external/square/catalog` - Catalog objects, items, variations
- `@/lib/api/schemas/external/square/payments` - Payments, refunds, cards
- `@/lib/api/schemas/external/square/orders` - Orders, fulfillments, line items
- `@/lib/api/schemas/external/square/webhooks` - Webhook payloads and validation

**Shippo APIs:**

- `@/lib/api/schemas/external/shippo` - All Shippo schemas (addresses, shipments, transactions, tracking, customs)

## Integration Patterns

### Pattern 1: Inline Validation

Validate responses at the call site:

```typescript
async function syncSquareCatalog() {
  const response = await squareClient.catalogApi.listCatalog();

  const validation = validateExternalApiResponse(response.result, SquareCatalogApiResponseSchema, {
    apiName: 'Square Catalog API',
    operation: 'listCatalog',
  });

  // Use validated data if available, fall back to original
  const catalogData = validation.data || response.result;
  return catalogData;
}
```

### Pattern 2: API Client Wrapper

Create validated wrappers for API clients:

```typescript
import { createSquareApiWrapper } from '@/lib/api/validation/integration-examples';

const validatedSquare = createSquareApiWrapper(squareClient);

// All calls automatically validated
const payment = await validatedSquare.payments.create(request);
const catalog = await validatedSquare.catalog.list();
```

### Pattern 3: Service Layer Integration

Add validation at the service layer:

```typescript
// src/lib/square/payments-api.ts
import { validateExternalApiResponse } from '@/lib/api/validation/external-api-validator';
import { CreatePaymentResponseSchema } from '@/lib/api/schemas/external/square/payments';

export async function createSquarePayment(request: CreatePaymentRequest) {
  const response = await squareClient.paymentsApi.createPayment(request);

  const validation = validateExternalApiResponse(response.result, CreatePaymentResponseSchema, {
    apiName: 'Square Payments API',
    operation: 'createPayment',
    context: { amount: request.amountMoney?.amount },
  });

  return validation.data || response.result;
}
```

## Monitoring

### View Statistics

```typescript
import { getValidationStats } from '@/lib/api/validation/external-api-validator';

const stats = getValidationStats();
console.log({
  total: stats.totalValidations,
  successRate: (stats.successCount / stats.totalValidations) * 100,
  failures: stats.failuresByApi,
});
```

### Error Logging

Validation failures are automatically logged to the error monitoring system with:

- API name and operation
- Validation error details
- Sample of the data (truncated for safety)
- Success rate statistics
- Request context

### Alerts

Set up alerts based on validation failure rates:

- Alert if validation failure rate > 5% for any API
- Alert if Square/Shippo API schema changes detected
- Alert if validation failures spike suddenly

## Migration Guide

### Step 1: Start with Read Operations

Add validation to read-only operations first (safest):

```typescript
// Low risk - just reading data
const order = await squareClient.ordersApi.retrieveOrder(orderId);
validateExternalApiResponse(order.result, RetrieveOrderResponseSchema, {
  apiName: 'Square Orders API',
  operation: 'retrieveOrder',
});
```

### Step 2: Add to Create/Update Operations

Once confident, add to write operations:

```typescript
// Higher risk - creating data
const payment = await squareClient.paymentsApi.createPayment(request);
validateExternalApiResponse(payment.result, CreatePaymentResponseSchema, {
  apiName: 'Square Payments API',
  operation: 'createPayment',
});
```

### Step 3: Monitor and Iterate

1. Deploy with validation enabled
2. Monitor validation failure rates
3. Fix any false positives in schemas
4. Gradually add more validations

## Testing

### Unit Tests

Test validation logic:

```typescript
import { validateExternalApiResponse } from '@/lib/api/validation/external-api-validator';
import { CreatePaymentResponseSchema } from '@/lib/api/schemas/external/square/payments';

it('should validate valid payment response', () => {
  const mockResponse = {
    payment: {
      id: 'test-id',
      status: 'COMPLETED',
      amount_money: { amount: 1000, currency: 'USD' },
    },
  };

  const result = validateExternalApiResponse(mockResponse, CreatePaymentResponseSchema, {
    apiName: 'Test',
    operation: 'test',
  });

  expect(result.success).toBe(true);
  expect(result.data).toEqual(mockResponse);
});
```

### Contract Tests

See `/src/__tests__/contracts/external/` for comprehensive contract tests:

- `square/catalog-api.test.ts` - 25 tests
- `square/payments-api.test.ts` - 30 tests
- `square/orders-api.test.ts` - 27 tests
- `square/webhooks-api.test.ts` - 20 tests
- `shippo/shipments-api.test.ts` - 29 tests
- `shippo/transactions-api.test.ts` - 18 tests
- `shippo/tracking-customs-api.test.ts` - 29 tests

## Best Practices

### DO ✅

- **Validate all external API responses** - Catch breaking changes early
- **Use descriptive metadata** - Include request IDs, amounts, etc. for debugging
- **Monitor validation statistics** - Set up alerts for high failure rates
- **Keep schemas up to date** - Review when APIs publish updates
- **Log context** - Include relevant request data (amounts, IDs, counts)

### DON'T ❌

- **Don't block on validation failures** - Always return data (validated or not)
- **Don't log sensitive data** - Use truncation and sanitization
- **Don't over-validate** - Focus on critical API responses
- **Don't ignore validation failures** - Investigate and fix schema mismatches
- **Don't skip error handling** - Validation doesn't replace proper error handling

## Troubleshooting

### High Validation Failure Rate

If seeing high failure rates:

1. **Check API version** - Did Square/Shippo update their API?
2. **Review error logs** - What fields are failing validation?
3. **Update schemas** - Adjust Zod schemas to match new API response structure
4. **Check data types** - BigInt vs Number, String vs Number mismatches

### Schema Too Strict

If schemas reject valid responses:

1. **Make fields optional** - Use `.optional()` for non-required fields
2. **Broaden types** - Use unions (`z.union([...])`) for flexible fields
3. **Use `z.unknown()`** - For dynamic/unpredictable fields
4. **Review API docs** - Ensure schema matches documented API contract

### Performance Concerns

If validation impacts performance:

1. **Sample validation** - Only validate a % of requests
2. **Async logging** - Don't wait for logs to complete
3. **Reduce context** - Log less data for each validation
4. **Cache validated schemas** - Reuse parsed schemas

## Advanced Features

### Sampling Configuration

Control validation sampling rates per environment to reduce overhead in production:

```typescript
// Automatic based on NODE_ENV
// - Test: 100% sampling
// - Production: 10% sampling (configurable via VALIDATION_SAMPLE_RATE env var)
// - Development: 100% sampling

// Override via environment variable
process.env.VALIDATION_SAMPLE_RATE = '0.25'; // 25% sampling
```

Configuration options in `validation-config.ts`:

- `enabled`: Whether validation is enabled
- `sampleRate`: Percentage of requests to validate (0.0 to 1.0)
- `logToConsole`: Log failures to console (dev mode)
- `sendToErrorMonitoring`: Send failures to monitoring service
- `errorLogRateLimit`: Max errors logged per minute per API

### Rate Limiting

Validation error logging is rate-limited to prevent log spam:

```typescript
// Production: Max 10 errors/minute per API
// Development: Max 50 errors/minute per API
// Test: Max 1000 errors/minute per API
```

Rate limiting ensures that sudden API changes don't flood your monitoring system.

### Schema Versioning

Track schema versions to monitor API evolution:

```typescript
import { schemaVersionRegistry, SCHEMA_VERSIONS } from '@/lib/api/schemas/schema-version';

// Get all schema versions
const versions = schemaVersionRegistry.getAll();

// Check if schema needs review (older than 90 days)
const needsReview = schemaVersionRegistry.needsReview('SQUARE_CATALOG', 90);

// Get specific version
const catalogVersion = SCHEMA_VERSIONS.SQUARE_CATALOG;
console.log(`Catalog schema v${catalogVersion.version}, updated ${catalogVersion.lastUpdated}`);
```

Schema versions use semantic versioning (MAJOR.MINOR.PATCH) and track:

- `version`: Schema version number
- `lastUpdated`: Date of last update
- `changelog`: Description of changes

### Validation Trends

Track validation metrics over time to identify API drift:

```typescript
import { validationTrendsTracker } from '@/lib/api/validation/validation-trends';

// Get trends for specific API
const trends = validationTrendsTracker.getTrends('Square Payments API');
console.log({
  currentSuccessRate: trends.currentSuccessRate,
  averageSuccessRate: trends.averageSuccessRate,
  trendDirection: trends.trendDirection, // 'improving' | 'declining' | 'stable'
  hourly: trends.hourly, // Hourly aggregated data
  daily: trends.daily, // Daily aggregated data
});

// Check for alerts
const alerts = validationTrendsTracker.checkAlerts();
alerts.forEach(alert => {
  console.warn(`[${alert.severity}] ${alert.apiName}: ${alert.message}`);
});
```

Alerts are triggered when:

- Success rate drops below 95% (high severity)
- Success rate drops below 90% (critical severity)
- Failures spike by 10x compared to previous period (high severity)

## Configuration

### Environment Variables

- `VALIDATION_SAMPLE_RATE` - Override sampling rate (0.0 to 1.0)
- `NODE_ENV` - Controls validation behavior (test/development/production)

### Example Configuration

**Production:**

```bash
NODE_ENV=production
VALIDATION_SAMPLE_RATE=0.1  # Validate 10% of requests
```

**Staging:**

```bash
NODE_ENV=development
VALIDATION_SAMPLE_RATE=1.0  # Validate 100% of requests
```

**Testing:**

```bash
NODE_ENV=test
# Validation automatically runs at 100% with reduced logging
```

## Performance Impact

Based on validation overhead analysis:

- **Validation time**: ~2-5ms per request (depends on schema complexity)
- **Memory**: ~10KB per cached schema
- **Recommended production sampling**: 10-25%
- **Network overhead**: None (validation is synchronous, post-response)

Performance tips:

1. Use sampling in production (10-25%)
2. Validate critical endpoints at higher rates
3. Monitor validation performance metrics
4. Adjust sampling based on traffic patterns

## Migration Checklist

When adding validation to new endpoints:

- [ ] Create Zod schema or import existing schema
- [ ] Add contract tests (aim for >95% coverage)
- [ ] Register schema in `register-schemas.ts`
- [ ] Add wrapper in `integration-examples.ts` (if needed)
- [ ] Configure error monitoring alerts
- [ ] Document schema version in `schema-version.ts`
- [ ] Add usage example to API changelog
- [ ] Test with real API responses in staging
- [ ] Deploy with 10% sampling initially
- [ ] Monitor for 24-48 hours
- [ ] Increase sampling if no issues

## Related Documentation

- **Phase 4 Plan**: `docs/PHASE_4_EXTERNAL_API_CONTRACTS.md` (if exists)
- **Contract Tests**: `/src/__tests__/contracts/external/README.md`
- **Square API Docs**: https://developer.squareup.com/docs
- **Shippo API Docs**: https://goshippo.com/docs/
- **Validation Config**: `./validation-config.ts`
- **Schema Versioning**: `@/lib/api/schemas/schema-version.ts`
- **Trends Tracking**: `./validation-trends.ts`

## Support

For questions or issues:

1. Review examples in `integration-examples.ts`
2. Check contract tests for usage patterns
3. Review error logs in monitoring system
4. Check validation trends for API drift
5. Verify schema versions are up to date
6. Update schemas if API has changed
