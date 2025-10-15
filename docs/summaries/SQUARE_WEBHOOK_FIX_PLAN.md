# Master Fix Plan: Square Webhook Signature Validation & Payment Updates

## 🎯 Feature/Fix Overview

**Name**: Square Payment Webhook Integration & Fallback Polling System

**Type**: Bug Fix + Enhancement

**Priority**: Critical

**Estimated Complexity**: Medium (3-5 days)

**Sprint/Milestone**: Payment Integration Sprint

### Problem Statement

Square webhook signature validation is intermittently failing in production, preventing real-time payment updates. Need to enhance existing webhook handler and implement robust polling solution as fallback to ensure no payment data is lost.

### Success Criteria

- [ ] Webhook signature validation works consistently in production
- [ ] Polling system captures all Square payments reliably
- [ ] Zero missed payments between webhook and polling systems
- [ ] Automatic fallback from webhook to polling on failure
- [ ] Comprehensive monitoring and alerting for both systems

### Dependencies

- **Blocked by**: None
- **Blocks**: Customer payment notifications, Order fulfillment automation
- **Related Files**:
  - `/src/app/api/webhooks/square/route.ts` (existing webhook handler)
  - `/src/lib/square/payment-sync.ts` (existing payment sync service)
  - `/src/lib/square/webhook-validator.ts` (existing validator)
  - `/src/app/api/cron/sync-payments/route.ts` (existing cron endpoint)

---

## 📋 Updated Planning Phase

### 🎯 **REVISED SCOPE**: The webhook system is already comprehensive. Focus on optimization and monitoring.

#### Current File Structure (Already Excellent!)

```tsx
/Users/ealanis/Development/current-projects/destino-sf/
src/
├── app/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── square/
│   │   │       ├── route.ts                    // ✅ COMPREHENSIVE - Already includes validation, logging, metrics
│   │   │       └── route.test.ts               // ✅ EXISTS - May need additional edge cases
│   │   ├── cron/
│   │   │   ├── sync-payments/
│   │   │   │   └── route.ts                    // ✅ EXISTS - Review polling frequency
│   │   │   └── process-webhooks-fixed/
│   │   │       └── route.ts                    // ✅ EXISTS - Working queue processor
│   │   └── square/
│   │       ├── poll-payments/
│   │       │   └── route.ts                    // 💡 OPTIONAL - Manual polling trigger
│   │       └── webhook-health/ (available via GET)  // ✅ EXISTS - Built into webhook route
├── components/
│   └── admin/
│       ├── PaymentSyncStatus.tsx               // 💡 ENHANCEMENT - Real-time dashboard
│       └── WebhookHealthIndicator.tsx          // 💡 ENHANCEMENT - Visual indicators
├── lib/
│   ├── square/
│   │   ├── webhook-validator.ts                // ✅ ADVANCED - Comprehensive validation system
│   │   ├── payment-sync.ts                     // ✅ EXISTS - Review for optimizations
│   │   ├── polling-service.ts                  // 💡 OPTIONAL - If needed for complex scenarios
│   │   └── payment-processor.ts                // ✅ EXISTS - Via webhook queue processing
│   ├── monitoring/
│   │   └── webhook-metrics.ts                  // ✅ EXISTS - Comprehensive metrics tracking
│   ├── webhook-queue-fix.ts                    // ✅ EXISTS - Queue management
│   └── db/
│       └── queries/
│           ├── payments.ts                     // ✅ EXISTS - Review queries
│           └── webhooks.ts                     // ✅ EXISTS - Comprehensive logging
├── types/
│   └── webhook.ts                               // ✅ COMPREHENSIVE - Extensive type definitions
└── prisma/
    ├── schema.prisma                            // ✅ EXISTS - Review for webhook tracking tables
    └── migrations/                              // ✅ EXISTS - Check if additional tables needed
```

#### Key TypeScript Interfaces (Enhanced)

```tsx
// types/webhook.ts (additions)
export interface PaymentSyncStrategy {
  mode: 'webhook' | 'polling' | 'hybrid';
  webhookEnabled: boolean;
  pollingInterval: number;
  lastWebhookSuccess: Date | null;
  lastPollSuccess: Date | null;
  failoverActive: boolean;
}

export interface PaymentSyncMetrics {
  webhooksReceived: number;
  webhooksProcessed: number;
  webhooksFailed: number;
  pollsExecuted: number;
  paymentsDiscovered: number;
  duplicatesPrevented: number;
  averageLatency: number;
  lastSyncTime: Date;
}

export interface WebhookValidationResult {
  valid: boolean;
  signature: string;
  calculatedSignature: string;
  environment: SquareEnvironment;
  error?: {
    type: 'INVALID_SIGNATURE' | 'MISSING_SECRET' | 'MALFORMED_BODY';
    details: string;
  };
}
```

#### Database Schema Updates (Prisma)

```prisma
// Add to schema.prisma

model PaymentSyncLog {
  id              String   @id @default(uuid()) @db.Uuid
  syncId          String   @unique
  syncType        String   // 'webhook' | 'polling' | 'manual'
  source          String   // 'production' | 'sandbox'
  status          String   // 'success' | 'failed' | 'partial'
  paymentsFound   Int      @default(0)
  paymentsProcessed Int    @default(0)
  paymentsFailed  Int      @default(0)
  startTime       DateTime
  endTime         DateTime?
  duration        Int?     // milliseconds
  errorDetails    Json?
  metadata        Json?
  createdAt       DateTime @default(now())

  @@index([syncType, status])
  @@index([createdAt])
  @@map("payment_sync_logs")
}

model PaymentRecord {
  id              String   @id @default(uuid()) @db.Uuid
  squarePaymentId String   @unique
  orderId         String?  @db.Uuid
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("USD")
  status          String   // Square payment status
  source          String   // 'webhook' | 'polling'
  environment     String   // 'production' | 'sandbox'
  processedAt     DateTime
  squareCreatedAt DateTime
  syncLatency     Int?     // milliseconds from creation to processing
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order?   @relation(fields: [orderId], references: [id])

  @@index([squarePaymentId])
  @@index([orderId])
  @@index([processedAt])
  @@index([source, status])
  @@map("payment_records")
}

// Update WebhookQueue model (already exists)
model WebhookQueue {
  id           String   @id @default(uuid()) @db.Uuid
  eventId      String   @unique
  eventType    String
  payload      Json
  status       String   @default("PENDING")
  attempts     Int      @default(0)
  maxAttempts  Int      @default(3)
  processedAt  DateTime?
  errorMessage String?
  nextRetryAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status, nextRetryAt])
  @@index([eventId])
  @@map("webhook_queue")
}
```

### 2. Implementation Strategy

#### Phase 1: Fix Webhook Signature Validation (Day 1)

```tsx
// Priority fixes in /src/lib/square/webhook-validator.ts
1. Fix URL construction for signature validation
2. Ensure raw body is preserved correctly
3. Handle both production and sandbox environments
4. Add comprehensive logging for debugging
5. Implement fallback validation methods
```

#### Phase 2: Enhance Polling System (Day 1-2)

```tsx
// Enhance /src/lib/square/payment-sync.ts
1. Implement intelligent deduplication
2. Add cursor-based pagination for large result sets
3. Implement exponential backoff for retries
4. Add circuit breaker pattern
5. Track sync performance metrics
```

#### Phase 3: Create Unified Payment Processor (Day 2-3)

```tsx
// New file: /src/lib/square/payment-processor.ts
export class UnifiedPaymentProcessor {
  private webhookHandler: WebhookHandler;
  private pollingSevice: PollingService;
  private circuitBreaker: CircuitBreaker;

  async processPayment(payment: SquarePayment, source: 'webhook' | 'polling') {
    // Unified processing logic
    // Deduplication
    // Order matching
    // Database updates
    // Event emission
  }

  async handleFailover() {
    // Switch from webhook to polling mode
    // Alert administrators
    // Track failover metrics
  }
}
```

#### Phase 4: Monitoring Dashboard (Day 3-4)

```tsx
// New dashboard at /src/app/(admin)/admin/payments/page.tsx
- Real-time webhook status
- Polling sync status
- Payment processing metrics
- Error logs and alerts
- Manual sync controls
- Webhook validation testing
```

#### Phase 5: Testing & Optimization (Day 4-5)

```tsx
// Comprehensive test suite
- Webhook signature validation tests
- Polling deduplication tests
- Failover scenario tests
- Load testing
- Integration tests with Square sandbox
```

### 3. Critical Code Fixes

#### Fix 1: Webhook Signature Validation

```tsx
// /src/lib/square/webhook-validator.ts
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

export async function validateWebhookSignature(
  request: NextRequest,
  bodyText: string
): Promise<WebhookValidationResult> {
  try {
    // 1. Get the signature from header
    const signature = request.headers.get('x-square-hmacsha256-signature');
    if (!signature) {
      return {
        valid: false,
        error: { type: 'MISSING_SIGNATURE', details: 'No signature header' },
      };
    }

    // 2. Determine environment and get correct secret
    const environment = determineEnvironment(request);
    const secret =
      environment === 'sandbox'
        ? process.env.SQUARE_WEBHOOK_SECRET_SANDBOX
        : process.env.SQUARE_WEBHOOK_SECRET;

    // 3. CRITICAL FIX: Construct URL exactly as Square does
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const pathname = request.nextUrl.pathname;
    const url = `${protocol}://${host}${pathname}`;

    // 4. Combine URL + raw body (no modifications!)
    const combined = url + bodyText;

    // 5. Generate HMAC-SHA256
    const hmac = createHmac('sha256', secret);
    hmac.update(combined);
    const calculatedSignature = hmac.digest('base64');

    // 6. Compare signatures
    const valid = calculatedSignature === signature;

    return {
      valid,
      signature,
      calculatedSignature,
      environment,
      error: valid
        ? undefined
        : {
            type: 'INVALID_SIGNATURE',
            details: `Expected: ${signature}, Got: ${calculatedSignature}`,
          },
    };
  } catch (error) {
    return {
      valid: false,
      error: {
        type: 'VALIDATION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
```

#### Fix 2: Enhanced Polling with Deduplication

```tsx
// /src/lib/square/polling-service.ts
import { prisma } from '@/lib/db-unified';
import { getSquareClient } from '@/lib/square/client';

export class PollingService {
  private processedPaymentIds = new Set<string>();
  private lastPollTime: Date | null = null;

  async pollPayments(lookbackMinutes: number = 15): Promise<PaymentSyncResult> {
    const client = getSquareClient();
    const endTime = new Date();
    const startTime = this.lastPollTime || new Date(endTime.getTime() - lookbackMinutes * 60000);

    try {
      // 1. Fetch payments from Square
      const response = await client.paymentsApi.listPayments(
        startTime.toISOString(),
        endTime.toISOString(),
        'DESC',
        undefined,
        undefined,
        100
      );

      const payments = response.result.payments || [];

      // 2. Filter out already processed payments
      const newPayments = payments.filter(p => !this.processedPaymentIds.has(p.id));

      // 3. Check database for duplicates
      const dbCheck = await prisma.paymentRecord.findMany({
        where: {
          squarePaymentId: { in: newPayments.map(p => p.id) },
        },
        select: { squarePaymentId: true },
      });

      const existingIds = new Set(dbCheck.map(p => p.squarePaymentId));
      const paymentsToProcess = newPayments.filter(p => !existingIds.has(p.id));

      // 4. Process new payments
      const results = await Promise.allSettled(
        paymentsToProcess.map(payment => this.processPayment(payment))
      );

      // 5. Update tracking
      paymentsToProcess.forEach(p => this.processedPaymentIds.add(p.id));
      this.lastPollTime = endTime;

      // 6. Cleanup old IDs (keep last 1000)
      if (this.processedPaymentIds.size > 1000) {
        const idsArray = Array.from(this.processedPaymentIds);
        this.processedPaymentIds = new Set(idsArray.slice(-1000));
      }

      return {
        success: true,
        paymentsFound: payments.length,
        paymentsProcessed: paymentsToProcess.length,
        duplicatesPrevented: payments.length - paymentsToProcess.length,
      };
    } catch (error) {
      console.error('Polling failed:', error);
      throw error;
    }
  }
}
```

### 4. Cron Configuration

#### Update vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-payments",
      "schedule": "*/5 * * * *" // Every 5 minutes
    },
    {
      "path": "/api/cron/process-webhooks-fixed",
      "schedule": "* * * * *" // Every minute (existing)
    },
    {
      "path": "/api/square/webhook-health",
      "schedule": "*/10 * * * *" // Health check every 10 minutes
    }
  ]
}
```

### 5. Environment Variables Required

```env
# Square API Keys
SQUARE_ACCESS_TOKEN=your_production_token
SQUARE_ACCESS_TOKEN_SANDBOX=your_sandbox_token
SQUARE_APPLICATION_ID=your_app_id
SQUARE_LOCATION_ID=your_location_id

# Webhook Secrets (CRITICAL - must match Square dashboard exactly)
SQUARE_WEBHOOK_SECRET=your_production_webhook_secret
SQUARE_WEBHOOK_SECRET_SANDBOX=your_sandbox_webhook_secret

# Sync Configuration
SQUARE_POLLING_ENABLED=true
SQUARE_POLLING_INTERVAL_MINUTES=5
SQUARE_WEBHOOK_FALLBACK_ENABLED=true
SQUARE_SYNC_LOOKBACK_MINUTES=15

# Monitoring
WEBHOOK_ALERT_EMAIL=admin@destino-sf.com
WEBHOOK_FAILURE_THRESHOLD=5
SYNC_LAG_ALERT_MINUTES=10
```

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// src/lib/square/__tests__/webhook-validator.test.ts
describe('Webhook Signature Validation', () => {
  it('validates correct signature', async () => {
    // Test with known valid signature
  });

  it('rejects invalid signature', async () => {
    // Test with incorrect signature
  });

  it('handles different URL formats', async () => {
    // Test with various URL constructions
  });

  it('works with both environments', async () => {
    // Test sandbox and production
  });
});

// src/lib/square/__tests__/polling-service.test.ts
describe('Polling Service', () => {
  it('prevents duplicate processing', async () => {
    // Test deduplication logic
  });

  it('handles pagination correctly', async () => {
    // Test with large result sets
  });

  it('recovers from failures', async () => {
    // Test retry and circuit breaker
  });
});
```

### Integration Tests

```tsx
// src/__tests__/integration/payment-sync.test.ts
describe('Payment Sync Integration', () => {
  it('webhook and polling work together', async () => {
    // Test both systems running
  });

  it('failover works correctly', async () => {
    // Simulate webhook failure and verify polling takes over
  });

  it('no payments are missed', async () => {
    // Create payments in Square sandbox and verify capture
  });
});
```

### Manual Testing Checklist

- [ ] Create test payment in Square sandbox
- [ ] Verify webhook receives and validates signature
- [ ] Verify payment appears in database
- [ ] Stop webhook handler
- [ ] Create another payment
- [ ] Verify polling captures it within 5 minutes
- [ ] Check no duplicates exist
- [ ] Verify monitoring alerts work

---

## 🔒 Security Analysis

### Security Measures

- [ ] **Webhook Signature**: HMAC-SHA256 validation on all webhooks
- [ ] **Environment Isolation**: Separate secrets for production/sandbox
- [ ] **Rate Limiting**: Implemented on polling endpoints
- [ ] **Authentication**: Bearer token required for manual sync
- [ ] **Audit Logging**: All payment operations logged
- [ ] **Idempotency**: Event ID based deduplication
- [ ] **Secret Rotation**: Plan for regular webhook secret rotation
- [ ] **PCI Compliance**: No sensitive payment data stored

### Security Checklist

```tsx
// Verify these security measures are in place:
1. Never log webhook secrets or signatures
2. Use constant-time comparison for signatures
3. Rate limit polling to prevent abuse
4. Validate all Square API responses
5. Sanitize payment metadata before storage
6. Implement proper error handling without exposing internals
7. Use HTTPS for all communications
8. Implement request timeout limits
```

---

## 📊 Performance & Monitoring

### Key Metrics to Track

```yaml
webhooks:
  success_rate: target >= 99%
  validation_time: target < 100ms
  processing_time: target < 500ms

polling:
  execution_time: target < 30s
  payments_per_sync: track average
  deduplication_rate: track percentage

system:
  payment_capture_rate: target = 100%
  sync_lag: target < 5 minutes
  duplicate_rate: target < 0.1%

alerts:
  webhook_failures: threshold > 5 in 5 minutes
  polling_failures: threshold > 2 consecutive
  sync_lag: threshold > 10 minutes
```

### Monitoring Implementation

```tsx
// Track these metrics in webhook-metrics.ts
interface PaymentMetrics {
  // Webhook metrics
  webhooksReceived: Counter;
  webhooksValidated: Counter;
  webhooksFailed: Counter;
  webhookValidationTime: Histogram;

  // Polling metrics
  pollsExecuted: Counter;
  paymentsPolled: Counter;
  pollDuration: Histogram;

  // System metrics
  paymentsCaptured: Counter;
  duplicatesPrevented: Counter;
  syncLag: Gauge;

  // Error tracking
  errorsByType: Map<string, Counter>;
  lastError: { time: Date; type: string; details: any };
}
```

---

## 🎨 UI/UX Considerations

### Admin Dashboard Components

#### 1. Payment Sync Status Widget

```tsx
// Shows current sync status
- Current Mode: Webhook | Polling | Hybrid
- Last Webhook: timestamp and status
- Last Poll: timestamp and results
- Sync Health: Green | Yellow | Red
- Pending Payments: count
```

#### 2. Real-time Payment Stream

```tsx
// Live payment updates
- Payment ID | Amount | Time | Source | Status
- Color coding by source (webhook=blue, polling=orange)
- Click for details
```

#### 3. Manual Controls

```tsx
// Admin actions
- [Force Sync Now] button
- [Test Webhook] button
- [Switch Mode] dropdown
- [View Logs] link
```

#### 4. Alert Center

```tsx
// System alerts
- Webhook failures
- Polling issues
- Sync lag warnings
- Action required items
```

---

## 📦 Deployment & Rollback Plan

### Deployment Phases

#### Phase 1: Webhook Fix Deployment (Day 1)

```bash
# 1. Deploy webhook validation fixes
git checkout -b fix/webhook-signature
# Apply fixes to webhook-validator.ts
# Deploy to staging
vercel --env=staging

# 2. Test in Square sandbox
# 3. Monitor for 1 hour
# 4. Deploy to production if stable
vercel --prod
```

#### Phase 2: Polling Enhancement (Day 2)

```bash
# 1. Deploy enhanced polling service
git checkout -b feature/polling-enhancement
# Deploy with feature flag
SQUARE_POLLING_ENABLED=false vercel --prod

# 2. Enable for testing
# 3. Monitor deduplication
# 4. Gradually enable
```

#### Phase 3: Unified System (Day 3-4)

```bash
# 1. Deploy unified processor
# 2. Enable both systems
# 3. Monitor for duplicates
# 4. Verify 100% capture rate
```

#### Phase 4: Monitoring Dashboard (Day 4-5)

```bash
# 1. Deploy dashboard
# 2. Set up alerts
# 3. Train team
# 4. Document procedures
```

### Rollback Strategy

```tsx
// Feature flags for controlled rollout
const FEATURE_FLAGS = {
  WEBHOOK_VALIDATION_V2: process.env.WEBHOOK_VALIDATION_V2 === 'true',
  POLLING_ENABLED: process.env.SQUARE_POLLING_ENABLED === 'true',
  HYBRID_MODE: process.env.SQUARE_HYBRID_MODE === 'true',
  ENHANCED_MONITORING: process.env.ENHANCED_MONITORING === 'true',
};

// Quick rollback procedure
if (criticalIssueDetected) {
  // 1. Disable new validation
  process.env.WEBHOOK_VALIDATION_V2 = 'false';

  // 2. Increase polling frequency
  process.env.SQUARE_POLLING_INTERVAL_MINUTES = '2';

  // 3. Alert team
  await sendCriticalAlert('Webhook system rolled back');
}
```

### Post-Deployment Checklist

- [ ] Monitor webhook success rate for 24 hours
- [ ] Verify no duplicate payments
- [ ] Check sync lag remains under 5 minutes
- [ ] Review error logs
- [ ] Validate customer payment flow
- [ ] Performance metrics within targets
- [ ] Team trained on new monitoring tools

---

## 📝 Documentation Requirements

### Technical Documentation

```markdown
## Square Payment Sync System

### Architecture Overview

- Dual-mode payment capture (webhook + polling)
- Automatic failover mechanism
- Comprehensive deduplication

### Configuration

- Environment variables
- Feature flags
- Monitoring thresholds

### Troubleshooting Guide

- Common webhook signature issues
- Polling deduplication problems
- Performance optimization

### API Reference

- Webhook endpoint: POST /api/webhooks/square
- Polling endpoint: GET /api/cron/sync-payments
- Health check: GET /api/square/webhook-health
```

### Operational Runbook

```markdown
## Payment Sync Operations

### Daily Checks

1. Review payment sync dashboard
2. Check webhook success rate
3. Verify polling is running

### Alert Response

- Webhook failures: Check signature configuration
- Polling failures: Verify Square API access
- Duplicates detected: Review deduplication logic

### Manual Procedures

- Force sync: Admin dashboard > Force Sync
- Switch modes: Update environment variables
- Reset sync state: Run cleanup script
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test:payments
pnpm test:webhooks

# Start development
pnpm dev

# Deploy to staging
vercel --env=staging

# Deploy to production
vercel --prod

# Monitor logs
vercel logs --follow

# Run manual sync
curl -X POST https://destino-sf.vercel.app/api/square/poll-payments \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## 📈 Success Metrics

After implementation, track these KPIs:

- **Payment Capture Rate**: Should be 100%
- **Webhook Success Rate**: Target > 99%
- **Average Sync Lag**: Target < 2 minutes
- **Duplicate Rate**: Target < 0.1%
- **System Uptime**: Target > 99.9%

---

## 🚨 **CRITICAL ISSUE IDENTIFIED**

### The Real Problem: Multiple Conflicting Webhook Implementations

**Root Cause**: Development branch has **TWO webhook validation systems** conflicting with each other:

1. **✅ NEW (Working)**: `/src/lib/square/webhook-validator.ts` + `/src/app/api/webhooks/square/route.ts`
2. **❌ OLD (Broken)**: `/src/lib/square/webhooks.ts` with `verifySquareSignature()`

### ⚡ **IMMEDIATE ACTIONS REQUIRED**:

1. **Today (High Priority)**:
   - ✅ **Identify which webhook implementation is actually being used**
   - 🔧 **Remove or update the conflicting old implementation**
   - ✅ **Ensure all imports use the new webhook-validator system**
   - 🧪 **Test webhook endpoint in development environment**

2. **This Week (Medium Priority)**:
   - 📋 **Clean up duplicate/conflicting webhook code**
   - 🧪 **Verify Square sandbox webhooks work correctly**
   - 📈 **Monitor webhook success rate**
   - 📝 **Update webhook documentation**

3. **Next Week (Low Priority)**:
   - 🎨 **Optional: Add monitoring dashboard enhancements**
   - 📊 **Performance optimization based on metrics**
   - 📚 **Team training on webhook debugging**

---

## 📞 Support & Escalation

### Primary Contacts

- **Technical Lead**: Review webhook implementation
- **DevOps**: Monitor deployment and logs
- **Square Support**: API and webhook configuration

### Escalation Path

1. Check monitoring dashboard
2. Review recent logs
3. Test webhook validation manually
4. Contact Square support if needed
5. Implement emergency polling increase

---

## ✅ Sign-off Checklist

Before considering this fix complete:

- [ ] All tests passing (unit, integration, E2E)
- [ ] Zero payment loss confirmed over 48 hours
- [ ] Webhook success rate > 99%
- [ ] Polling deduplication working correctly
- [ ] Monitoring dashboard operational
- [ ] Team trained on new procedures
- [ ] Documentation complete and accessible
- [ ] Rollback plan tested
- [ ] Customer impact assessment completed
- [ ] Performance within defined targets

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Author**: Development Team
**Status**: Ready for Implementation
