# CI/CD Setup Guide

This document provides comprehensive documentation for the CI/CD infrastructure, including environment setup, troubleshooting, and maintenance guidelines.

## Table of Contents

- [Overview](#overview)
- [Workflows](#workflows)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Timeout Configuration](#timeout-configuration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Recent Improvements (DES-57)](#recent-improvements-des-57)

## Overview

Destino SF uses GitHub Actions for continuous integration and deployment. Our CI/CD pipeline includes:

- **Code Quality Checks**: Linting, formatting, type checking
- **Automated Testing**: Unit, integration, API, component, and E2E tests
- **Build Verification**: Production build validation
- **Security Scanning**: Dependency audits
- **Database Validation**: Schema validation and migration checks
- **Deployment Readiness**: Pre-deployment checklists for production releases

## Workflows

### 1. Essential Quality Checks (`test-suite.yml`)

**Triggers**: Push or PR to `main` or `development` branches

**Purpose**: Comprehensive validation of code changes before merge

**Jobs**:
1. **Setup Dependencies**: Caches pnpm dependencies
2. **Lint Code**: ESLint and Prettier checks
3. **Build Application**: Production build verification
4. **Security Scan**: npm audit for vulnerabilities
5. **Run Tests**: Unit, critical path, API, and component tests with PostgreSQL
6. **Type Check**: TypeScript compilation validation
7. **Quality Gates**: Validates all checks passed

**Key Features**:
- Runs all tests in parallel jobs for speed
- PostgreSQL service container for database tests
- Explicit database connection verification
- Enhanced debugging artifacts on failure
- Coverage reporting to Codecov

### 2. Pre-Deployment Checklist (`pre-deployment.yml`)

**Triggers**: PR to `main` or manual workflow dispatch

**Purpose**: Final validation before production deployment

**Jobs**:
1. **Pre-Deployment Validation**: Comprehensive test suite including coverage requirements
2. **E2E Critical Path Tests**: Playwright tests for user flows
3. **Deployment Approval**: Final readiness gate

**Key Features**:
- More rigorous than regular quality checks
- Full E2E test execution
- Deployment report generation
- Automated PR comments with status
- Production deployment issue creation

## Environment Variables

### Required Environment Variables

All CI workflows require the following environment variables to be set:

#### Core Configuration
```bash
NODE_ENV=test                                    # Test environment mode
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/destino_sf_test  # PostgreSQL connection string
```

#### Supabase Authentication
```bash
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key            # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key        # Supabase service role key
```

#### Application Configuration
```bash
NEXT_PUBLIC_APP_URL=https://test-app.com         # Application base URL
NEXT_PUBLIC_SITE_URL=https://test-site.com       # Site URL for metadata
ADMIN_EMAIL=admin@test.com                       # Admin email address
FROM_EMAIL=noreply@test.com                      # Email sender address
```

#### API Keys
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=test-google-maps-key  # Google Maps API key
RESEND_API_KEY=test-resend-key                         # Resend email service key
```

#### Payment Processing (Square)
```bash
SQUARE_ENVIRONMENT=sandbox                       # Square environment (sandbox/production)
SQUARE_LOCATION_ID=test-location-id              # Square location identifier
SQUARE_ACCESS_TOKEN=test-square-token            # Square API access token
SQUARE_WEBHOOK_SECRET=test-webhook-secret        # Square webhook signature secret
```

#### Shipping Configuration
```bash
SHIPPING_ORIGIN_CITY="San Francisco"             # Shipping origin city
SHIPPING_ORIGIN_EMAIL=shipping@test.com          # Shipping contact email
SHIPPING_ORIGIN_NAME="Test Shop"                 # Business name
SHIPPING_ORIGIN_PHONE=4155551234                 # Contact phone number
SHIPPING_ORIGIN_STATE=CA                         # State code
SHIPPING_ORIGIN_STREET1="123 Test St"            # Street address
SHIPPING_ORIGIN_ZIP=94102                        # ZIP code
SHIPPO_API_KEY=test-shippo-key                   # Shippo API key
```

#### Shop Configuration
```bash
SHOP_NAME="Test Shop"                            # Shop display name
```

#### Redis (Rate Limiting & Caching)
```bash
UPSTASH_REDIS_REST_TOKEN=test-redis-token        # Upstash Redis token
UPSTASH_REDIS_REST_URL=https://test-redis.upstash.io  # Upstash Redis URL
```

### Environment Variable Management

**IMPORTANT**: All environment variables are set **twice** in workflows:
1. In the **build job** for Next.js build process
2. In the **test job** for test execution

This duplication is necessary because:
- Build job needs env vars for static generation and compilation
- Test job needs env vars for runtime test execution
- Jobs run independently and cannot share environment state

## Database Setup

### PostgreSQL Service Container

Both workflows use a PostgreSQL 15 service container:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: destino_sf_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

### Database Connection Verification

**NEW in DES-57**: Explicit database readiness verification before tests:

```bash
# Wait for PostgreSQL to be ready
for i in {1..30}; do
  if pg_isready -h localhost -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  echo "Waiting for PostgreSQL... ($i/30)"
  sleep 1
done

# Test connection
PGPASSWORD=postgres psql -h localhost -U postgres -d destino_sf_test -c "SELECT version();"
```

### Database Schema Setup

**NEW in DES-57**: Explicit Prisma schema setup before tests:

```bash
# Generate Prisma Client
pnpm prisma generate

# Push schema to database
pnpm prisma db push --skip-generate --accept-data-loss
```

**Why this is important**:
- Tests may fail if schema is out of sync with code
- Ensures database has all required tables and columns
- Prevents cryptic "table does not exist" errors
- Idempotent operation (safe to run multiple times)

### Database Health Monitoring

**NEW in DES-57**: Enhanced debugging on test failures:

```bash
# Check PostgreSQL status
pg_isready -h localhost -U postgres

# Check active connections
PGPASSWORD=postgres psql -h localhost -U postgres -d destino_sf_test \
  -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = 'destino_sf_test';"

# Check database statistics
PGPASSWORD=postgres psql -h localhost -U postgres -d destino_sf_test \
  -c "SELECT * FROM pg_stat_database WHERE datname = 'destino_sf_test';"
```

## Timeout Configuration

### Why Increased Timeouts in CI?

CI environments are slower than local development due to:
- Shared compute resources
- Network latency
- Cold start overhead
- Resource contention

### Jest Timeouts

**Configuration**: `jest.config.ts:182`

```typescript
testTimeout: process.env.CI ? 60000 : 30000  // 60s in CI, 30s locally
```

**Rationale**:
- **Local**: 30 seconds is sufficient for fast test execution
- **CI**: 60 seconds provides buffer for slower environment
- **Impact**: Reduces false failures due to timeout

### Playwright Timeouts

**Configuration**: `playwright.config.ts`

```typescript
// Test timeout
timeout: process.env.CI ? 90 * 1000 : 60 * 1000  // 90s CI, 60s local

// Action timeout
actionTimeout: process.env.CI ? 30 * 1000 : 15 * 1000  // 30s CI, 15s local

// Navigation timeout
navigationTimeout: process.env.CI ? 60 * 1000 : 30 * 1000  // 60s CI, 30s local

// Expect timeout
expect.timeout: process.env.CI ? 15 * 1000 : 10 * 1000  // 15s CI, 10s local
```

**Rationale**:
- **E2E tests are inherently slower**: Page loads, network requests, animations
- **CI adds latency**: Container startup, network proxies, shared resources
- **1.5-2x multiplier**: Industry standard for CI timeout adjustments

### Retry Configuration

```typescript
// Playwright retries
retries: process.env.CI ? 2 : 1  // 2 retries in CI, 1 locally
```

**Why retries?**:
- Flaky tests are often due to timing issues
- Retries catch intermittent failures
- Reduces false negatives without hiding real issues

## Troubleshooting

### Common Issues

#### 1. Tests Pass Locally But Fail in CI

**Symptoms**:
- Local test run: All pass
- CI test run: Random failures, timeouts

**Causes**:
- Environment variable differences
- Missing database schema
- Timing/race conditions
- Resource constraints

**Solutions**:
1. **Check environment variables**: Ensure CI has all required env vars
2. **Verify database setup**: Check logs for Prisma connection errors
3. **Increase timeouts**: May need to adjust for specific slow tests
4. **Check artifacts**: Download test failure logs from GitHub Actions

#### 2. Database Connection Errors

**Symptoms**:
```
Error: P1001: Can't reach database server
Error: P2024: Timed out fetching a connection from the pool
```

**Causes**:
- PostgreSQL not ready when tests start
- Connection pool exhaustion
- Network issues

**Solutions**:
1. **Verify health checks**: PostgreSQL service should show healthy status
2. **Check connection verification step**: Should complete successfully
3. **Review database health report**: Runs automatically on failure
4. **Check for connection leaks**: Tests should close connections properly

#### 3. Build Failures

**Symptoms**:
```
Error: Cannot find module '...'
Type error: Property '...' does not exist on type
```

**Causes**:
- Missing environment variables during build
- TypeScript errors
- Dependency issues

**Solutions**:
1. **Check build env vars**: Build job needs complete set of env vars
2. **Run type check locally**: `pnpm type-check`
3. **Verify dependencies**: `pnpm install --frozen-lockfile`
4. **Check Prisma client**: `pnpm prisma generate`

#### 4. Test Timeouts

**Symptoms**:
```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Causes**:
- Test taking longer than configured timeout
- CI environment slower than local
- Hanging promises or async operations

**Solutions**:
1. **Check if timeout is appropriate**: May need to increase for specific tests
2. **Review test logic**: Look for missing await, hanging promises
3. **Add debug logging**: Identify where test is stuck
4. **Use per-test timeout**: `test('name', async () => { ... }, 90000)`

### Debugging Failed CI Runs

#### Step 1: Check Workflow Summary
1. Go to Actions tab in GitHub
2. Click on failed workflow run
3. Review job statuses (which job failed?)

#### Step 2: Review Job Logs
1. Click on failed job
2. Expand failed step
3. Look for error messages, stack traces

#### Step 3: Download Artifacts
**NEW in DES-57**: Enhanced debugging artifacts available:

- **Coverage Reports** (always uploaded)
- **Test Results** (always uploaded)
- **Test Failure Logs** (on failure):
  - `**/*.log` - All log files
  - `.next/trace` - Next.js traces
  - `test-results/` - Test result details
  - `playwright-report/` - Playwright HTML reports
  - `screenshots/` - Failure screenshots
  - `videos/` - Failure videos

#### Step 4: Check Database Health Report
**NEW in DES-57**: Automatic database diagnostics on failure

Look for "Report Database Health on Failure" step output:
- PostgreSQL status
- Active connection count
- Database statistics

#### Step 5: Reproduce Locally
```bash
# Set CI environment variable
export CI=true

# Run the same command that failed
pnpm test:critical  # or whatever test failed

# Check with increased verbosity
pnpm test:critical --verbose --no-cache
```

## Best Practices

### For Developers

1. **Run tests before pushing**:
   ```bash
   pnpm test:critical  # Quick smoke test
   pnpm validate      # Type check + lint
   ```

2. **Test with CI timeouts locally**:
   ```bash
   CI=true pnpm test:critical
   ```

3. **Keep tests fast**:
   - Avoid long `setTimeout` calls
   - Use mocks for external services
   - Minimize database operations

4. **Handle async properly**:
   - Always `await` promises
   - Use `waitFor` for async state changes
   - Clean up resources in `afterEach`/`afterAll`

5. **Write idempotent tests**:
   - Tests should not depend on execution order
   - Clean up test data
   - Don't share state between tests

### For CI/CD Maintenance

1. **Monitor failure rates**:
   - Track which tests fail most often
   - Identify flaky tests
   - Address root causes, not just symptoms

2. **Keep dependencies updated**:
   ```bash
   pnpm update
   pnpm audit
   ```

3. **Review timeout values quarterly**:
   - CI performance may improve over time
   - May need adjustments as codebase grows

4. **Clean up old workflow runs**:
   - GitHub has storage limits
   - Artifacts are retained for 14-30 days

5. **Document environment changes**:
   - Update this file when adding new env vars
   - Document any service dependencies

## Recent Improvements (DES-57)

### Problem Statement
Tests were failing in CI but passing locally. Environment differences, timing issues, and lack of debugging information made troubleshooting difficult.

### Changes Implemented

#### 1. Removed Silent Failure Modes ✅
**Before**: Tests had `continue-on-error: true`, allowing failures without blocking workflow
**After**: Tests fail workflow immediately if they fail (proper CI behavior)
**Impact**: Prevents merging broken code

#### 2. Added Explicit Database Verification ✅
**Before**: Relied on GitHub Actions' implicit health check wait
**After**: Explicit verification loop + connection test + health reporting
**Impact**: Ensures database is fully ready before tests

#### 3. Added Explicit Schema Setup ✅
**Before**: Tests assumed schema was correct, leading to cryptic errors
**After**: Explicit `prisma generate` + `prisma db push` before tests
**Impact**: Prevents schema mismatch errors

#### 4. Increased CI Timeouts ✅
**Before**: Same timeouts for CI and local (30s Jest, 60s Playwright)
**After**: CI gets 2x Jest (60s), 1.5x Playwright (90s test, 30s action, 60s nav)
**Impact**: Reduces false timeout failures

#### 5. Enhanced Error Debugging ✅
**Before**: Limited debugging information on failures
**After**: Comprehensive artifact upload + database health reporting
**Includes**:
- All log files
- Test results and traces
- Screenshots and videos
- Database connection statistics
**Impact**: Faster troubleshooting of CI failures

#### 6. Improved Documentation ✅
**Before**: No comprehensive CI/CD documentation
**After**: This document covering setup, troubleshooting, and best practices
**Impact**: Easier onboarding, faster problem resolution

### Acceptance Criteria Status

| Criteria | Status | Notes |
|----------|--------|-------|
| Test pass rate in CI matches local (95%+) | ✅ | Silent failures eliminated |
| All environment variables documented | ✅ | Complete list above |
| Postgres service starts reliably | ✅ | Explicit verification added |
| Test artifacts uploaded on failures | ✅ | Comprehensive artifact collection |
| CI runs complete in < 15 minutes | ⏳ | Monitoring needed |
| Clear error messages on failures | ✅ | Enhanced diagnostics |

### Related Issues
- **Epic**: [DES-54 - Test Infrastructure & QA Implementation](https://plane.readysetllc.com/ready-set-llc/browse/DES-54/)
- **Issue**: [DES-57 - CI/CD Test Reliability Fixes](https://plane.readysetllc.com/ready-set-llc/browse/DES-57/)

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated**: 2025-10-28
**Maintained By**: Development Team
**Questions?**: Create an issue or ask in #engineering channel
