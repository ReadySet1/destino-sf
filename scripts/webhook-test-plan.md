# Webhook Testing Plan

## Overview
This document outlines the comprehensive testing strategy for Square webhook processing to ensure reliable payment and order status updates.

## Test Scenarios

### 1. Payment Processing Tests

#### 1.1 Successful Payment Flow
- **Test**: Create order → Process payment → Verify webhook
- **Expected**: 
  - `payment.created` webhook processes successfully
  - `payment.updated` webhook with status `COMPLETED`
  - Order status: `PENDING` → `PROCESSING`
  - Payment status: `PENDING` → `PAID`
  - Payment record created in database

#### 1.2 Failed Payment Flow
- **Test**: Create order → Simulate payment failure
- **Expected**:
  - `payment.updated` webhook with status `FAILED`
  - Order payment status: `PENDING` → `FAILED`
  - Alert email sent to business
  - Order remains in `PENDING` status

#### 1.3 Payment Refund Flow
- **Test**: Complete payment → Process refund
- **Expected**:
  - `refund.created` webhook processes
  - `refund.updated` webhook with status `COMPLETED`
  - Payment status: `PAID` → `REFUNDED`
  - Order status updated appropriately

### 2. Error Handling Tests

#### 2.1 Race Condition Handling
- **Test**: Simulate `payment.updated` arriving before `order.created`
- **Expected**:
  - Webhook queued for retry with 5-10 second delay
  - Processes successfully on retry
  - No duplicate processing

#### 2.2 Database Connection Issues
- **Test**: Simulate temporary database connectivity issues
- **Expected**:
  - Webhook queued for retry with 15 second delay
  - Fallback processing attempted
  - Error monitoring captures failure
  - Processes successfully once DB is available

#### 2.3 Webhook Queue Failures
- **Test**: Force webhook queue processing to fail
- **Expected**:
  - Fallback direct processing triggers
  - Webhook processes via fallback
  - Error logged and monitored
  - No data loss

### 3. Performance Tests

#### 3.1 High Volume Webhook Processing
- **Test**: Send multiple webhooks simultaneously
- **Expected**:
  - All webhooks acknowledged within 1 second
  - Async processing completes successfully
  - No webhook timeouts or retries from Square

#### 3.2 Queue Processing Under Load
- **Test**: Fill webhook queue with failed items
- **Expected**:
  - Queue processes items with proper delays
  - No memory leaks or performance degradation
  - Proper retry backoff implemented

### 4. Integration Tests

#### 4.1 End-to-End Order Flow
- **Test**: Complete order lifecycle with webhooks
- **Expected**:
  - `order.created` → `payment.created` → `payment.updated` → `order.fulfillment.updated`
  - All statuses update correctly in sequence
  - Customer notifications sent appropriately

#### 4.2 Catering Order Processing
- **Test**: Process catering order payment
- **Expected**:
  - Catering order detected correctly
  - Payment status updated to `PAID`
  - Order status updated to `CONFIRMED`

## Test Environment Setup

### Development Testing
```bash
# Start development server
pnpm dev

# Run webhook simulation
pnpm tsx scripts/test-webhook-processing.ts

# Check webhook logs
tail -f logs/webhook-processing.log
```

### Production Testing
- Use Square Sandbox environment
- Test with real webhook endpoints
- Monitor error tracking services
- Verify database consistency

## Success Criteria

### Functional Requirements
- [ ] 100% of `payment.updated` webhooks process successfully
- [ ] Order statuses update within 30 seconds of payment completion
- [ ] No duplicate processing of webhook events
- [ ] Failed webhooks retry successfully within 5 minutes

### Performance Requirements  
- [ ] Webhook acknowledgment response time < 1 second
- [ ] Async processing completion time < 10 seconds average
- [ ] Queue processing handles 100+ items without degradation
- [ ] Memory usage remains stable under load

### Reliability Requirements
- [ ] Zero data loss during webhook processing failures
- [ ] Graceful degradation during database issues
- [ ] Comprehensive error monitoring and alerting
- [ ] Automatic recovery from temporary failures

## Manual Testing Checklist

### Pre-Deployment
- [ ] Run unit tests for webhook handlers
- [ ] Test webhook signature validation
- [ ] Verify environment variables are set
- [ ] Check database migrations are applied

### Post-Deployment
- [ ] Test with real Square webhook in sandbox
- [ ] Verify webhook endpoint accessibility
- [ ] Monitor error logs for first hour
- [ ] Validate payment processing workflow
- [ ] Check admin dashboard displays correct order statuses

## Monitoring and Alerting

### Key Metrics to Monitor
- Webhook processing success rate
- Average processing time
- Queue depth and retry rates
- Error frequency by webhook type
- Database connection health

### Alert Conditions
- Webhook processing failure rate > 5%
- Queue depth > 50 items
- Critical webhook processing failure
- Database connection failures
- Payment processing errors

## Rollback Plan

### If Issues Detected
1. Monitor error rates for 15 minutes post-deployment
2. If error rate > 10%, immediately rollback
3. Investigate issues in development environment
4. Apply fixes and re-test before re-deployment

### Rollback Procedure
```bash
# Revert to previous webhook processing logic
git revert <commit-hash>

# Deploy previous version
# Verify webhook processing returns to normal
# Update monitoring to track resolution
``` 