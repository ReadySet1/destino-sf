# Follow-Up Tickets for PR #90

**PR**: https://github.com/ReadySet1/destino-sf/pull/90
**Date**: November 6, 2025
**Source**: Code Review (docs/CODE_REVIEW_PR90.md)

---

## Priority: HIGH 🔴

### DES-XX: Stabilize Concurrency Tests

**Priority**: High
**Estimated Effort**: 2-3 days
**Assignee**: TBD

#### Description

Several concurrency tests are failing or unstable after infrastructure improvements in PR #90. These tests are critical for validating race condition prevention in payment processing and order creation.

#### Current State

- ❌ `order-creation-race.test.ts`: 8 failed, 6 passed
- ⚠️ `payment-race-conditions.test.ts`: Status unclear
- ⚠️ `cart-race-conditions.test.tsx`: Renamed, needs verification

#### Issues

1. Mock-based tests may not fully represent real database behavior
2. Timeout-based tests can be flaky
3. Some tests rely on Promise.all timing which is non-deterministic

#### Tasks

- [ ] Review and fix all failing concurrency tests
- [ ] Add integration tests with real PostgreSQL database
- [ ] Test with actual concurrent requests (not just mocks)
- [ ] Verify pessimistic locking behavior with real database
- [ ] Add test for lock timeout scenarios
- [ ] Document test patterns for future concurrency tests

#### Files to Review

```
src/__tests__/concurrency/order-creation-race.test.ts
src/__tests__/concurrency/payment-race-conditions.test.ts
src/__tests__/concurrency/cart-race-conditions.test.tsx
jest.setup.enhanced.js
```

#### Acceptance Criteria

- [ ] All concurrency tests pass consistently
- [ ] Test coverage includes integration tests with real database
- [ ] Tests verify actual race condition prevention
- [ ] Documentation updated with test patterns

---

### DES-XX: Monitor Concurrency Metrics in Production

**Priority**: High
**Estimated Effort**: 1 day
**Assignee**: TBD (DevOps/Backend)

#### Description

Set up monitoring and alerting for the new concurrency control patterns to ensure they're working correctly in production and not causing performance issues.

#### Metrics to Track

```
Concurrency Locks:
- Lock acquisition time (p50, p95, p99)
- Lock acquisition failures
- Lock timeout occurrences
- Lock conflicts per hour

Duplicate Prevention:
- Duplicate order detection triggers
- Request deduplication hits
- TOCTOU vulnerability prevention

Performance:
- Database connection pool utilization
- Transaction duration
- Checkout API response times
```

#### Tasks

- [ ] Add monitoring dashboard for concurrency metrics
- [ ] Set up alerts for high lock contention
- [ ] Track duplicate order prevention triggers
- [ ] Monitor lock acquisition times
- [ ] Alert on lock timeout threshold
- [ ] Weekly review of concurrency metrics

#### Tools

- Existing: `src/lib/monitoring/concurrency-metrics.ts`
- Dashboard: TBD (Grafana/Datadog/Similar)
- Alerting: TBD

#### Acceptance Criteria

- [ ] Dashboard showing real-time concurrency metrics
- [ ] Alerts configured for anomalies
- [ ] Weekly review process established
- [ ] Runbook for handling concurrency issues

---

## Priority: MEDIUM 🟡

### DES-XX: Image Alt Text Improvements

**Priority**: Medium
**Estimated Effort**: 2 sprints
**Assignee**: Content/Design Team

#### Description

Improve image accessibility by adding proper alt text to 53 images. Current coverage is only 3.6% (2 out of 55 images have good alt text).

#### Current State

- ✅ Guidelines established (`docs/ALT_TEXT_GUIDELINES.md`)
- ✅ Audit tool created (`scripts/audit-image-alt.js`)
- ✅ Baseline documented (`docs/IMAGE_ALT_AUDIT_REPORT.md`)
- ❌ Actual improvements deferred

#### Target

**90%+ coverage** within 2 sprints (50+ images improved)

#### Tasks

**Sprint 1** (High Priority Images):

- [ ] Product images (empanadas, alfajores)
- [ ] Hero banners
- [ ] Category headers
- [ ] Update audit report

**Sprint 2** (Remaining Images):

- [ ] Decorative images (mark as decorative or add alt text)
- [ ] Team photos
- [ ] Background images
- [ ] Final audit report

#### Tools

```bash
# Run audit
pnpm audit-image-alt

# Review guidelines
docs/ALT_TEXT_GUIDELINES.md
```

#### Acceptance Criteria

- [ ] 90%+ of images have proper alt text
- [ ] All product images have descriptive alt text
- [ ] Decorative images properly marked (empty alt="")
- [ ] Updated audit report shows improvement
- [ ] WCAG 2.1 Level AA compliance for images

---

### DES-XX: Complete Catering E2E Tests

**Priority**: Medium (Blocked)
**Estimated Effort**: TBD
**Assignee**: TBD
**Blocked By**: Catering UI implementation

#### Description

Complete the end-to-end tests for catering flow. Tests are stubbed but cannot be fully implemented until the catering UI is complete.

#### Current State

- ⏳ Test file exists: `tests/e2e/11-catering-complete-flow.spec.ts`
- ⏳ Test structure defined
- ❌ Many tests marked as TODOs waiting for UI

#### Tasks

- [ ] Wait for catering UI implementation
- [ ] Complete stubbed tests
- [ ] Test package selection flow
- [ ] Test à-la-carte item selection
- [ ] Test delivery zone validation
- [ ] Test minimum order requirements
- [ ] Test event date selection

#### Dependencies

- Catering UI redesign (separate epic)
- Build-your-own boxed lunch feature

#### Acceptance Criteria

- [ ] All catering E2E tests passing
- [ ] Tests cover critical catering flows
- [ ] Tests run in CI/CD pipeline
- [ ] Documentation updated

---

### DES-XX: Integration Tests for Concurrency Patterns

**Priority**: Medium
**Estimated Effort**: 3-4 days
**Assignee**: TBD (Backend)

#### Description

Add integration tests that verify concurrency patterns with real database behavior, not just mocks. This will catch issues that unit tests might miss.

#### Test Scenarios

1. **Pessimistic Locking**
   - Concurrent payment processing
   - Lock timeout behavior
   - Deadlock detection

2. **Optimistic Locking**
   - Concurrent order updates
   - Version conflict handling
   - Retry logic

3. **Request Deduplication**
   - Duplicate request detection
   - Idempotency key validation
   - Cache expiration

#### Tasks

- [ ] Set up test database with real PostgreSQL
- [ ] Create integration test suite
- [ ] Test pessimistic locking with concurrent transactions
- [ ] Test optimistic locking version conflicts
- [ ] Test request deduplication with Redis
- [ ] Add to CI/CD pipeline
- [ ] Document integration test patterns

#### Files to Create

```
src/__tests__/integration/concurrency/
  pessimistic-lock.integration.test.ts
  optimistic-lock.integration.test.ts
  request-deduplication.integration.test.ts
```

#### Acceptance Criteria

- [ ] Integration tests pass consistently
- [ ] Tests use real database (not mocks)
- [ ] Coverage for all concurrency patterns
- [ ] Tests run in CI/CD
- [ ] Documentation for running integration tests

---

## Priority: LOW 🟢

### DES-XX: PR Size Guidelines and Process Improvements

**Priority**: Low
**Estimated Effort**: 2-3 hours
**Assignee**: TBD (Tech Lead)

#### Description

Document guidelines for PR size and create templates to prevent overly large PRs like #90 in the future.

#### Current Issue

PR #90 was too large (220 files, 48 commits), making thorough review difficult.

#### Tasks

- [ ] Define PR size guidelines:
  - Max files per PR: 50-75
  - Max commits per PR: 15-20
  - Max lines changed: 2000-3000
- [ ] Create PR template with checklist
- [ ] Document when to split PRs
- [ ] Add to CONTRIBUTING.md
- [ ] Share guidelines with team

#### Guidelines to Document

```markdown
## PR Size Guidelines

### Recommended Limits

- Files changed: 50-75 max
- Lines changed: 2000-3000 max
- Commits: 15-20 max
- Review time: <1 hour

### When to Split PRs

1. Multiple unrelated features
2. Infrastructure + feature work
3. Exceeding size limits
4. Multiple sprints of work

### How to Split

1. Infrastructure first (APIs, utilities)
2. Features second (using infrastructure)
3. UI/UX polish third
4. Documentation can be separate
```

#### Acceptance Criteria

- [ ] Guidelines documented in CONTRIBUTING.md
- [ ] PR template updated
- [ ] Team briefed on new guidelines
- [ ] Process documented in confluence/wiki

---

### DES-XX: Pre-PR Checklist Template

**Priority**: Low
**Estimated Effort**: 1 hour
**Assignee**: TBD

#### Description

Create a comprehensive pre-PR checklist to catch issues before opening PRs.

#### Checklist Items

```markdown
## Pre-PR Checklist

### Code Quality

- [ ] All tests pass locally
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Production build successful
- [ ] No console.logs in production code
- [ ] No TODO/FIXME without ticket reference

### Testing

- [ ] New tests written for new features
- [ ] Test coverage maintained or improved
- [ ] Critical path tests pass
- [ ] E2E tests pass (if applicable)

### Documentation

- [ ] README updated (if needed)
- [ ] API documentation updated
- [ ] Inline documentation for complex logic
- [ ] Migration guide (if breaking changes)

### Git Hygiene

- [ ] Branch up to date with target
- [ ] Commit messages descriptive
- [ ] No merge conflicts
- [ ] PR description complete

### Size Check

- [ ] <75 files changed
- [ ] <3000 lines changed
- [ ] <20 commits
- [ ] Single logical feature/fix
```

#### Acceptance Criteria

- [ ] Template created in `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Team trained on checklist
- [ ] Incorporated into workflow

---

## Monitoring and Review Schedule

### Week 1 Post-Merge

- [ ] Verify breadcrumbs appear in Google Search Console
- [ ] Check FAQ rich snippets eligibility
- [ ] Monitor concurrency metrics
- [ ] Review error logs for lock timeouts

### Week 2-4 Post-Merge

- [ ] Track SEO improvements (impressions, CTR)
- [ ] Monitor E2E test stability in CI/CD
- [ ] Review image alt text audit baseline
- [ ] Verify no performance regressions

### Monthly Review

- [ ] Review all follow-up ticket progress
- [ ] Update this document with completed tasks
- [ ] Celebrate wins and identify blockers

---

## Ticket Creation Instructions

1. **Copy each ticket section above into your project management tool**
2. **Assign priority and sprint**
3. **Assign to appropriate team member**
4. **Link back to this document and CODE_REVIEW_PR90.md**
5. **Update ticket IDs in this document once created**

---

**Document Owner**: Tech Lead
**Last Updated**: November 6, 2025
**Review Frequency**: Weekly until all tickets resolved
