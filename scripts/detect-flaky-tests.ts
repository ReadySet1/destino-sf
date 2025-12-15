#!/usr/bin/env tsx

/**
 * Flaky Test Detection Script for CI
 *
 * Analyzes test history to identify flaky tests and outputs results
 * in GitHub Actions format for PR comments and job summaries.
 *
 * Usage:
 *   npx tsx scripts/detect-flaky-tests.ts
 *
 * Environment Variables:
 *   GITHUB_OUTPUT - Path to GitHub Actions output file
 *   GITHUB_STEP_SUMMARY - Path to GitHub Actions step summary file
 */

import fs from 'fs/promises';
import path from 'path';

interface TestRun {
  timestamp: string;
  totalTests: number;
  successRate: number;
  coverage: number;
  flakyTestCount: number;
  slowTestCount: number;
  failures?: TestFailure[];
}

interface TestFailure {
  test: string;
  error?: string;
  duration?: number;
}

interface FlakyTest {
  name: string;
  failureRate: number;
  failureCount: number;
  totalRuns: number;
  lastFailure: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pattern: string;
}

interface FlakyTestReport {
  timestamp: string;
  totalTestsAnalyzed: number;
  runsAnalyzed: number;
  flakyTests: FlakyTest[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const HISTORY_FILE = './test-history.json';
const MIN_RUNS_FOR_ANALYSIS = 5;
const FLAKY_THRESHOLD_MIN = 5; // 5% failure rate minimum
const FLAKY_THRESHOLD_MAX = 95; // 95% failure rate maximum (consistently failing is not flaky)

async function loadTestHistory(): Promise<{ runs: TestRun[] }> {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    console.log('No test history found, creating empty history');
    return { runs: [] };
  }
}

function identifyFlakyTests(runs: TestRun[]): FlakyTest[] {
  if (runs.length < MIN_RUNS_FOR_ANALYSIS) {
    console.log(`Insufficient data: ${runs.length} runs (need ${MIN_RUNS_FOR_ANALYSIS})`);
    return [];
  }

  // Aggregate failures by test name
  const testFailures: Map<string, { count: number; lastFailure: string }> = new Map();

  for (const run of runs) {
    if (run.failures) {
      for (const failure of run.failures) {
        const existing = testFailures.get(failure.test) || { count: 0, lastFailure: '' };
        testFailures.set(failure.test, {
          count: existing.count + 1,
          lastFailure: run.timestamp,
        });
      }
    }
  }

  // Identify flaky tests (fail 5-95% of the time)
  const flakyTests: FlakyTest[] = [];
  const totalRuns = runs.length;

  for (const [testName, data] of testFailures) {
    const failureRate = (data.count / totalRuns) * 100;

    if (failureRate >= FLAKY_THRESHOLD_MIN && failureRate <= FLAKY_THRESHOLD_MAX) {
      flakyTests.push({
        name: testName,
        failureRate,
        failureCount: data.count,
        totalRuns,
        lastFailure: data.lastFailure,
        severity: calculateSeverity(failureRate),
        pattern: identifyPattern(testName),
      });
    }
  }

  return flakyTests.sort((a, b) => b.failureRate - a.failureRate);
}

function calculateSeverity(failureRate: number): FlakyTest['severity'] {
  if (failureRate >= 50) return 'CRITICAL';
  if (failureRate >= 25) return 'HIGH';
  if (failureRate >= 10) return 'MEDIUM';
  return 'LOW';
}

function identifyPattern(testName: string): string {
  const lowerName = testName.toLowerCase();

  if (lowerName.includes('timeout') || lowerName.includes('async')) return 'timeout';
  if (lowerName.includes('concurrent') || lowerName.includes('race')) return 'race-condition';
  if (lowerName.includes('network') || lowerName.includes('api') || lowerName.includes('fetch'))
    return 'network';
  if (lowerName.includes('database') || lowerName.includes('db') || lowerName.includes('prisma'))
    return 'database';
  if (lowerName.includes('payment') || lowerName.includes('checkout')) return 'integration';

  return 'unknown';
}

function generateMarkdownSummary(report: FlakyTestReport): string {
  const lines: string[] = [];

  lines.push('## Flaky Test Detection Report');
  lines.push('');

  if (report.flakyTests.length === 0) {
    lines.push('No flaky tests detected in the last ' + report.runsAnalyzed + ' runs.');
    return lines.join('\n');
  }

  // Summary table
  lines.push('### Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  lines.push(`| CRITICAL | ${report.summary.critical} |`);
  lines.push(`| HIGH | ${report.summary.high} |`);
  lines.push(`| MEDIUM | ${report.summary.medium} |`);
  lines.push(`| LOW | ${report.summary.low} |`);
  lines.push('');

  // Flaky tests table
  lines.push('### Flaky Tests Detected');
  lines.push('');
  lines.push('| Test | Failure Rate | Pattern | Severity |');
  lines.push('|------|--------------|---------|----------|');

  for (const test of report.flakyTests.slice(0, 10)) {
    const name = test.name.length > 60 ? test.name.substring(0, 57) + '...' : test.name;
    lines.push(
      `| \`${name}\` | ${test.failureRate.toFixed(1)}% (${test.failureCount}/${test.totalRuns}) | ${test.pattern} | ${getSeverityEmoji(test.severity)} ${test.severity} |`
    );
  }

  if (report.flakyTests.length > 10) {
    lines.push(`| ... and ${report.flakyTests.length - 10} more | | | |`);
  }

  lines.push('');
  lines.push('### Recommendations');
  lines.push('');

  if (report.summary.critical > 0) {
    lines.push(
      '- **CRITICAL**: Immediately investigate tests with >50% failure rate. These significantly impact CI reliability.'
    );
  }
  if (report.summary.high > 0) {
    lines.push(
      '- **HIGH**: Schedule time to fix tests with 25-50% failure rate in the next sprint.'
    );
  }
  if (report.flakyTests.some(t => t.pattern === 'timeout')) {
    lines.push('- Consider increasing timeouts or using `waitFor` patterns for async tests.');
  }
  if (report.flakyTests.some(t => t.pattern === 'race-condition')) {
    lines.push('- Review tests for proper synchronization and avoid shared state.');
  }
  if (report.flakyTests.some(t => t.pattern === 'database')) {
    lines.push('- Ensure database tests use proper isolation (transactions, cleanup).');
  }

  return lines.join('\n');
}

function getSeverityEmoji(severity: FlakyTest['severity']): string {
  switch (severity) {
    case 'CRITICAL':
      return '🔴';
    case 'HIGH':
      return '🟠';
    case 'MEDIUM':
      return '🟡';
    case 'LOW':
      return '🟢';
  }
}

function generateGitHubOutput(report: FlakyTestReport): string {
  const outputs: string[] = [];

  outputs.push(`flaky_count=${report.flakyTests.length}`);
  outputs.push(`critical_count=${report.summary.critical}`);
  outputs.push(`high_count=${report.summary.high}`);
  outputs.push(`has_flaky_tests=${report.flakyTests.length > 0}`);
  outputs.push(`has_critical_flaky=${report.summary.critical > 0}`);

  // Create a compact JSON for the top flaky tests
  const topFlaky = report.flakyTests.slice(0, 5).map(t => ({
    name: t.name.substring(0, 50),
    rate: t.failureRate.toFixed(1),
    severity: t.severity,
  }));
  outputs.push(`top_flaky_tests=${JSON.stringify(topFlaky)}`);

  return outputs.join('\n');
}

async function writeGitHubOutputs(report: FlakyTestReport): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;

  if (outputFile) {
    const outputs = generateGitHubOutput(report);
    await fs.appendFile(outputFile, outputs + '\n');
    console.log('GitHub outputs written');
  }

  if (summaryFile) {
    const summary = generateMarkdownSummary(report);
    await fs.appendFile(summaryFile, summary + '\n');
    console.log('GitHub step summary written');
  }
}

async function main(): Promise<void> {
  console.log('🔍 Detecting flaky tests...');

  const history = await loadTestHistory();
  const flakyTests = identifyFlakyTests(history.runs);

  const report: FlakyTestReport = {
    timestamp: new Date().toISOString(),
    totalTestsAnalyzed: history.runs.reduce((sum, run) => sum + (run.totalTests || 0), 0),
    runsAnalyzed: history.runs.length,
    flakyTests,
    summary: {
      critical: flakyTests.filter(t => t.severity === 'CRITICAL').length,
      high: flakyTests.filter(t => t.severity === 'HIGH').length,
      medium: flakyTests.filter(t => t.severity === 'MEDIUM').length,
      low: flakyTests.filter(t => t.severity === 'LOW').length,
    },
  };

  // Output to console
  console.log('\n' + generateMarkdownSummary(report));

  // Write to GitHub Actions if in CI
  if (process.env.GITHUB_ACTIONS) {
    await writeGitHubOutputs(report);
  }

  // Save report to file
  const reportDir = './test-reports';
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(
    path.join(reportDir, 'flaky-tests-report.json'),
    JSON.stringify(report, null, 2)
  );

  // Exit with warning code if critical flaky tests found
  if (report.summary.critical > 0) {
    console.log('\n⚠️ Critical flaky tests detected!');
    process.exit(0); // Don't fail CI, just warn
  }

  console.log('\n✅ Flaky test detection complete');
}

main().catch(error => {
  console.error('❌ Error detecting flaky tests:', error);
  process.exit(1);
});
