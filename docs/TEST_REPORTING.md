# Test Reporting and Notifications

This document describes how the automated test reporting system works, including flaky test detection, coverage tracking, and GitHub Issues for critical failures.

## Overview

The CI test reporting system provides:
- **Real-time visibility** into test health via enhanced PR comments
- **Automatic flaky test detection** based on historical test data
- **Coverage trend tracking** comparing PR coverage against the main branch
- **GitHub Issues** for critical test failures on the main branch
- **Historical data retention** for trend analysis (last 30 runs)

## PR Comment Format

Every PR receives an enhanced test results comment with the following information:

```markdown
## Test Results

**Health Status:** GOOD (Score: 85/100)

### Metrics

| Metric | Value | Trend |
|--------|-------|-------|
| Pass Rate | 98.5% | +0.3% |
| Coverage (lines) | 72.4% | -0.2% |
| Failed Tests | 0 | |
| Flaky Tests | 2 detected | |

### Flaky Tests Detected (if any)
- List of flaky tests with failure rates

### Coverage Regression (if any)
- Warning when coverage drops more than 2%
```

## How It Works

### 1. Test Health Check

**Script:** `scripts/test-health-check.ts`

The health check script runs after all tests complete and calculates:

- **Health Score (0-100):** Composite score based on pass rate, coverage, and trends
- **Health Status:** EXCELLENT (90+), GOOD (75-89), FAIR (60-74), or POOR (<60)
- **Trends:** Compares current metrics against the average of the last 5 runs
- **Issues:** Identifies specific problems (failing tests, low coverage, regressions)

**Health Score Calculation:**
- Starts at 100
- Deducts `(100 - passRate) * 2` for low pass rate
- Deducts `(80 - coverage) * 0.5` for coverage below 80%
- Deducts points for negative trends

### 2. Flaky Test Detection

**Script:** `scripts/detect-flaky-tests.ts`

Flaky tests are identified by analyzing the `test-history.json` file:

- **Definition:** Tests that fail 5-95% of the time are considered flaky
- **Minimum Data:** At least 5 runs required for analysis
- **Severity Levels:**
  - CRITICAL: >50% failure rate
  - HIGH: 25-50% failure rate
  - MEDIUM: 10-25% failure rate
  - LOW: 5-10% failure rate

**Pattern Detection:**
The script attempts to identify common flaky test patterns:
- `timeout` - Tests with timeout/async issues
- `race-condition` - Concurrent/race condition tests
- `network` - Network/API dependent tests
- `database` - Database interaction tests
- `integration` - Integration/E2E tests

### 3. Coverage Comparison

**Script:** `scripts/compare-coverage.ts`

For pull requests, coverage is compared against the main branch:

- Downloads base coverage from artifacts (if available)
- Compares line, statement, function, and branch coverage
- **Regression Threshold:** Warns if coverage drops more than 2%
- **Significant Change Threshold:** Reports file-level changes > 5%

**Output includes:**
- Overall coverage diff with trend arrows
- File-level significant changes table
- Summary status (improved, stable, or regressed)

### 4. GitHub Issues for Failures

**Script:** `scripts/create-test-failure-issue.ts`

When tests fail on the main branch, a GitHub issue is automatically created:

- **Labels:** `test-failure`, `ci`, `automated`
- **Includes:** Failed test names, error messages, workflow link
- **Deduplication:** Checks for existing open issues to avoid duplicates
- **Updates:** If an issue exists, adds a comment instead of creating a new one

**Issue Template:**
```markdown
## Test Failure in CI

**Workflow Run:** [#123](link)
**Branch:** main
**Commit:** abc1234

### Failed Tests
1. test-name-1
2. test-name-2

### Reproduction
git checkout <commit>
pnpm install
pnpm test:critical
```

## Files and Artifacts

### Generated Files

| File | Description |
|------|-------------|
| `test-history.json` | Historical test data (last 30 runs) |
| `test-reports/health-check.json` | Latest health check results |
| `test-reports/flaky-tests-report.json` | Flaky test analysis |
| `test-reports/coverage-comparison.json` | Coverage diff report |

### CI Artifacts

The following artifacts are uploaded on each run:

| Artifact | Contents | Retention |
|----------|----------|-----------|
| `coverage-report` | Coverage data and lcov files | 30 days |
| `test-results` | JUnit XML and JSON reports | 30 days |
| `test-health-reports` | Health check and flaky test reports | 30 days |
| `test-failure-logs` | Debug logs (on failure only) | 14 days |

## Running Locally

### Test Health Check

```bash
# Run with default paths
npx tsx scripts/test-health-check.ts

# Specify custom paths
npx tsx scripts/test-health-check.ts --json ./custom-results.json --coverage ./custom-coverage.json
```

### Flaky Test Detection

```bash
# Analyze test history
npx tsx scripts/detect-flaky-tests.ts
```

### Coverage Comparison

```bash
# Compare two coverage reports
npx tsx scripts/compare-coverage.ts --base ./coverage-base.json --head ./coverage.json
```

### Create Test Failure Issue

```bash
# From test results file
npx tsx scripts/create-test-failure-issue.ts --failures-file ./test-results.json

# From comma-separated list
npx tsx scripts/create-test-failure-issue.ts --failures "test1,test2,test3"
```

**Required Environment Variables:**
- `GITHUB_TOKEN` - GitHub token with `issues:write` permission
- `GITHUB_REPOSITORY` - Repository in format `owner/repo`

## Configuration

### Thresholds

| Setting | Value | Description |
|---------|-------|-------------|
| Regression Threshold | -2% | Coverage drop that triggers warning |
| Significant Change | 5% | File-level change worth reporting |
| Flaky Min Rate | 5% | Minimum failure rate to flag as flaky |
| Flaky Max Rate | 95% | Maximum rate (above = consistently failing) |
| History Retention | 30 | Number of runs to keep for trend analysis |

### Customization

To modify thresholds, edit the respective script files:

- `scripts/compare-coverage.ts` - Coverage thresholds
- `scripts/detect-flaky-tests.ts` - Flaky detection parameters
- `scripts/test-health-check.ts` - Health score calculation

## Troubleshooting

### No Coverage Comparison Available

If PR comments show "No base coverage data available":
1. The base branch may not have coverage artifacts yet
2. The artifact retention period may have expired (30 days)
3. The workflow needs to run on the base branch first

### Health Check Shows N/A Values

If metrics show "N/A":
1. Test results file not found (`./test-results/results.json`)
2. Coverage summary not generated (`./coverage/coverage-summary.json`)
3. Tests may have failed before generating output

### Flaky Tests Not Detected

If known flaky tests aren't appearing:
1. Check that `test-history.json` has at least 5 runs
2. Verify the test failure rate is between 5-95%
3. Ensure test names match exactly in history

### GitHub Issues Not Created

If issues aren't being created on main branch failures:
1. Verify `GITHUB_TOKEN` has `issues:write` permission
2. Check that the workflow runs on `main` branch (not PRs)
3. Review workflow logs for error messages

## Integration with Existing Tools

### Codecov

The system complements Codecov integration:
- Codecov provides detailed file-by-file coverage analysis
- This system adds trend tracking and regression detection
- Both reports are linked in PR comments

### Jest/Vitest

Compatible with both test runners:
- Reads standard JSON coverage format
- Parses Jest/Vitest result files
- Works with any test framework that outputs similar formats

## Best Practices

1. **Review flaky tests regularly** - Address CRITICAL and HIGH severity first
2. **Monitor coverage trends** - Don't let gradual decline go unnoticed
3. **Investigate all failures on main** - GitHub issues help track them
4. **Add tests for regressions** - Use coverage comparison to guide
5. **Keep history clean** - The system auto-prunes to 30 runs
