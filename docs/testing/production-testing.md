# 🚀 Production Testing Plan - Destino SF

## 📋 Overview

This document outlines the comprehensive testing strategy for Destino SF before production deployment. All critical user journeys must pass before going live.

## 🎯 Critical Test Categories

### 1. 💰 Revenue-Critical Tests (MUST PASS)

These tests cover core revenue-generating functionality:

#### Purchase Journey Tests

- **Complete Purchase Flow** (`01-complete-purchase.spec.ts`)
  - Single item purchase with delivery
  - Multiple item purchase with pickup
  - Payment processing validation
  - Order confirmation verification
  - Email confirmation checks

#### Cart Management Tests

- **Cart Functionality** (`02-cart-management.spec.ts`)
  - Add/remove items
  - Quantity updates
  - Price calculations
  - Cart persistence across sessions
  - Empty cart handling

### 2. 🍽️ Catering Business Tests (HIGH PRIORITY)

Critical for the catering revenue stream:

#### Catering Inquiry Tests

- **Catering Flow** (`04-catering-inquiry.spec.ts`)
  - Contact form submission
  - Package selection
  - Custom requirements handling
  - Lead generation tracking

### 3. 📱 Cross-Platform Tests (REQUIRED)

Ensuring consistent experience across devices:

#### Mobile Responsiveness

- Mobile Chrome testing
- Mobile Safari testing
- Touch interaction validation
- Responsive layout verification

#### Desktop Browsers

- Chrome (primary)
- Firefox
- Safari
- Edge

## 🛠️ Test Execution Strategy

### Pre-Deployment Testing Sequence

#### Phase 1: Critical Path Validation

```bash
# Must pass with 100% success rate
pnpm test:e2e:critical
```

#### Phase 2: Full Regression Testing

```bash
# Comprehensive test suite
pnpm test:e2e
```

#### Phase 3: Mobile Testing

```bash
# Mobile-specific validation
pnpm test:e2e:mobile
```

#### Phase 4: Performance & Load Testing

```bash
# Performance validation
pnpm test:performance
```

## 📊 Success Criteria

### Critical Tests (Zero Tolerance)

- ✅ All purchase flows complete successfully
- ✅ Payment processing works without errors
- ✅ Order confirmations are generated
- ✅ Email notifications are sent
- ✅ Cart calculations are accurate

### High Priority Tests (95% Pass Rate)

- ✅ Catering inquiries submit successfully
- ✅ Mobile responsiveness works correctly
- ✅ Navigation functions on all devices
- ✅ Form validations work properly

### Standard Tests (90% Pass Rate)

- ✅ All page loads complete within 3 seconds
- ✅ Images load correctly
- ✅ SEO metadata is present
- ✅ Accessibility standards are met

## 🚨 Failure Response Protocol

### Critical Test Failures

1. **STOP deployment immediately**
2. Notify development team
3. Fix issues before proceeding
4. Rerun complete test suite

### High Priority Failures

1. Assess impact on user experience
2. Document issues for immediate post-deployment fix
3. Consider rollback if impact is severe

## 🔧 Test Environment Setup

### Required Environment Variables

```bash
# Testing environment
NODE_ENV=test
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=your_test_database_url

# Square (Sandbox)
SQUARE_APPLICATION_ID=sandbox_app_id
SQUARE_ACCESS_TOKEN=sandbox_access_token

# Email Testing
RESEND_API_KEY=test_api_key
```

### Test Data Requirements

- Clean database state before each test run
- Consistent test products and pricing
- Valid test payment methods
- Mock email services for testing

## 📈 Continuous Monitoring

### Post-Deployment Validation

After production deployment, run smoke tests:

```bash
# Quick validation of critical paths
pnpm test:e2e:smoke-production
```

### Key Metrics to Monitor

- Order completion rate
- Payment success rate
- Cart abandonment rate
- Page load times
- Error rates

## 🔄 Test Maintenance

### Weekly Tasks

- Update test data if product catalog changes
- Verify test environment stability
- Check for broken external dependencies

### Monthly Tasks

- Review and update test scenarios
- Performance baseline updates
- Cross-browser compatibility checks

## 📚 Related Documentation

- [Playwright Setup Guide](./playwright-setup.md)
- [Test Data Setup](./test-data-setup.md)
- [Deployment Checklist](./deployment-checklist.md)

---

## ⚡ Quick Start Commands

```bash
# Essential pre-deployment commands
pnpm test:e2e:critical     # Critical path tests
pnpm test:e2e:mobile       # Mobile testing
pnpm test:pre-deploy       # Complete pre-deployment suite
pnpm test:e2e:debug        # Debug mode for troubleshooting
pnpm test:e2e:report       # View detailed test reports
```

## 🎯 Success Checklist

Before production deployment, ensure:

- [ ] All critical tests pass (100%)
- [ ] Mobile tests pass on iOS and Android
- [ ] Payment processing works in sandbox
- [ ] Order confirmations are generated
- [ ] Email notifications are sent
- [ ] Cart functionality is stable
- [ ] Catering inquiries work properly
- [ ] Performance meets benchmarks
- [ ] Error handling is robust
- [ ] Rollback plan is ready

---

_Last updated: $(date)_
_Version: 1.0_
