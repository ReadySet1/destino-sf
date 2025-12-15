#!/usr/bin/env tsx

/**
 * Test Health Check Script for CI
 *
 * Lightweight health analysis that compares current test results against
 * historical data and outputs metrics for PR comments.
 *
 * Usage:
 *   npx tsx scripts/test-health-check.ts [--json results.json] [--coverage coverage-summary.json]
 *
 * Environment Variables:
 *   GITHUB_OUTPUT - Path to GitHub Actions output file
 *   GITHUB_STEP_SUMMARY - Path to GitHub Actions step summary file
 */

import fs from 'fs/promises';
import path from 'path';

interface TestResults {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults?: Array<{
    name: string;
    status: string;
    duration: number;
  }>;
  startTime?: number;
  success: boolean;
}

interface CoverageSummary {
  total: {
    lines: { pct: number; total: number; covered: number };
    statements: { pct: number; total: number; covered: number };
    functions: { pct: number; total: number; covered: number };
    branches: { pct: number; total: number; covered: number };
  };
}

interface HistoricalRun {
  timestamp: string;
  totalTests: number;
  successRate: number;
  coverage: number;
  duration?: number;
}

interface HealthMetrics {
  current: {
    totalTests: number;
    passRate: number;
    failedTests: number;
    duration: number;
    coverage: {
      lines: number;
      statements: number;
      functions: number;
      branches: number;
    };
  };
  trends: {
    passRate: { value: number; direction: 'up' | 'down' | 'stable'; diff: number };
    coverage: { value: number; direction: 'up' | 'down' | 'stable'; diff: number };
    testCount: { value: number; direction: 'up' | 'down' | 'stable'; diff: number };
  };
  health: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  };
}

const HISTORY_FILE = './test-history.json';
const COVERAGE_FILE = './coverage/coverage-summary.json';
const RESULTS_FILE = './test-results/results.json';

async function loadFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function loadTestResults(customPath?: string): Promise<TestResults | null> {
  const filePath = customPath || RESULTS_FILE;

  // Try Jest format first
  let results = await loadFile<TestResults | null>(filePath, null);
  if (results) return results;

  // Try alternative paths
  const alternatives = [
    './coverage/test-results.json',
    './test-results/jest-results.json',
    './.jest-results.json',
  ];

  for (const alt of alternatives) {
    results = await loadFile<TestResults | null>(alt, null);
    if (results) return results;
  }

  return null;
}

async function loadCoverage(customPath?: string): Promise<CoverageSummary | null> {
  return loadFile<CoverageSummary | null>(customPath || COVERAGE_FILE, null);
}

async function loadHistory(): Promise<{ runs: HistoricalRun[] }> {
  return loadFile(HISTORY_FILE, { runs: [] });
}

function calculateTrends(
  current: number,
  history: HistoricalRun[],
  metric: 'successRate' | 'coverage' | 'totalTests'
): { value: number; direction: 'up' | 'down' | 'stable'; diff: number } {
  if (history.length < 2) {
    return { value: current, direction: 'stable', diff: 0 };
  }

  // Get average of last 5 runs
  const recentRuns = history.slice(-5);
  const avgValue =
    recentRuns.reduce((sum, run) => {
      const val =
        metric === 'successRate'
          ? run.successRate
          : metric === 'coverage'
            ? run.coverage
            : run.totalTests;
      return sum + (val || 0);
    }, 0) / recentRuns.length;

  const diff = current - avgValue;
  const direction = diff > 1 ? 'up' : diff < -1 ? 'down' : 'stable';

  return { value: current, direction, diff };
}

function calculateHealthScore(metrics: HealthMetrics): number {
  let score = 100;

  // Deduct for low pass rate
  if (metrics.current.passRate < 100) {
    score -= (100 - metrics.current.passRate) * 2;
  }

  // Deduct for low coverage
  if (metrics.current.coverage.lines < 80) {
    score -= (80 - metrics.current.coverage.lines) * 0.5;
  }

  // Deduct for negative trends
  if (metrics.trends.passRate.direction === 'down') {
    score -= Math.abs(metrics.trends.passRate.diff) * 2;
  }
  if (metrics.trends.coverage.direction === 'down') {
    score -= Math.abs(metrics.trends.coverage.diff);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

function identifyIssues(metrics: HealthMetrics): string[] {
  const issues: string[] = [];

  if (metrics.current.failedTests > 0) {
    issues.push(`${metrics.current.failedTests} test(s) failing`);
  }

  if (metrics.current.coverage.lines < 60) {
    issues.push(`Low line coverage: ${metrics.current.coverage.lines.toFixed(1)}%`);
  }

  if (metrics.trends.passRate.direction === 'down' && metrics.trends.passRate.diff < -5) {
    issues.push(`Pass rate declining: ${metrics.trends.passRate.diff.toFixed(1)}%`);
  }

  if (metrics.trends.coverage.direction === 'down' && metrics.trends.coverage.diff < -2) {
    issues.push(`Coverage regression: ${metrics.trends.coverage.diff.toFixed(1)}%`);
  }

  return issues;
}

function getTrendEmoji(direction: 'up' | 'down' | 'stable'): string {
  switch (direction) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
  }
}

function getStatusEmoji(status: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (status) {
    case 'excellent':
      return '🟢';
    case 'good':
      return '🟡';
    case 'fair':
      return '🟠';
    case 'poor':
      return '🔴';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function generateMarkdownReport(metrics: HealthMetrics): string {
  const lines: string[] = [];

  lines.push('## 🧪 Test Health Report');
  lines.push('');
  lines.push(
    `**Status:** ${getStatusEmoji(metrics.health.status)} ${metrics.health.status.toUpperCase()} (Score: ${metrics.health.score}/100)`
  );
  lines.push('');

  // Metrics table
  lines.push('### Metrics');
  lines.push('');
  lines.push('| Metric | Value | Trend |');
  lines.push('|--------|-------|-------|');
  lines.push(
    `| Pass Rate | ${metrics.current.passRate.toFixed(1)}% | ${getTrendEmoji(metrics.trends.passRate.direction)} ${metrics.trends.passRate.diff > 0 ? '+' : ''}${metrics.trends.passRate.diff.toFixed(1)}% |`
  );
  lines.push(
    `| Coverage (lines) | ${metrics.current.coverage.lines.toFixed(1)}% | ${getTrendEmoji(metrics.trends.coverage.direction)} ${metrics.trends.coverage.diff > 0 ? '+' : ''}${metrics.trends.coverage.diff.toFixed(1)}% |`
  );
  lines.push(
    `| Total Tests | ${metrics.current.totalTests} | ${getTrendEmoji(metrics.trends.testCount.direction)} ${metrics.trends.testCount.diff > 0 ? '+' : ''}${metrics.trends.testCount.diff} |`
  );
  lines.push(`| Duration | ${formatDuration(metrics.current.duration)} | |`);
  lines.push('');

  // Coverage breakdown
  lines.push('### Coverage Breakdown');
  lines.push('');
  lines.push('| Type | Coverage |');
  lines.push('|------|----------|');
  lines.push(`| Lines | ${metrics.current.coverage.lines.toFixed(1)}% |`);
  lines.push(`| Statements | ${metrics.current.coverage.statements.toFixed(1)}% |`);
  lines.push(`| Functions | ${metrics.current.coverage.functions.toFixed(1)}% |`);
  lines.push(`| Branches | ${metrics.current.coverage.branches.toFixed(1)}% |`);
  lines.push('');

  // Issues
  if (metrics.health.issues.length > 0) {
    lines.push('### ⚠️ Issues');
    lines.push('');
    for (const issue of metrics.health.issues) {
      lines.push(`- ${issue}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateGitHubOutput(metrics: HealthMetrics): string {
  const outputs: string[] = [];

  outputs.push(`health_score=${metrics.health.score}`);
  outputs.push(`health_status=${metrics.health.status}`);
  outputs.push(`pass_rate=${metrics.current.passRate.toFixed(1)}`);
  outputs.push(`coverage_lines=${metrics.current.coverage.lines.toFixed(1)}`);
  outputs.push(`failed_tests=${metrics.current.failedTests}`);
  outputs.push(`total_tests=${metrics.current.totalTests}`);
  outputs.push(`pass_rate_trend=${metrics.trends.passRate.direction}`);
  outputs.push(`coverage_trend=${metrics.trends.coverage.direction}`);
  outputs.push(`has_issues=${metrics.health.issues.length > 0}`);
  outputs.push(`is_healthy=${metrics.health.status === 'excellent' || metrics.health.status === 'good'}`);

  return outputs.join('\n');
}

async function writeGitHubOutputs(metrics: HealthMetrics): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;

  if (outputFile) {
    const outputs = generateGitHubOutput(metrics);
    await fs.appendFile(outputFile, outputs + '\n');
    console.log('GitHub outputs written');
  }

  if (summaryFile) {
    const summary = generateMarkdownReport(metrics);
    await fs.appendFile(summaryFile, summary + '\n');
    console.log('GitHub step summary written');
  }
}

async function updateHistory(metrics: HealthMetrics): Promise<void> {
  const history = await loadHistory();

  const newRun: HistoricalRun = {
    timestamp: new Date().toISOString(),
    totalTests: metrics.current.totalTests,
    successRate: metrics.current.passRate,
    coverage: metrics.current.coverage.lines,
    duration: metrics.current.duration,
  };

  history.runs.push(newRun);

  // Keep only last 30 runs
  if (history.runs.length > 30) {
    history.runs = history.runs.slice(-30);
  }

  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function main(): Promise<void> {
  console.log('🔍 Running test health check...');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let resultsPath: string | undefined;
  let coveragePath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && args[i + 1]) {
      resultsPath = args[++i];
    } else if (args[i] === '--coverage' && args[i + 1]) {
      coveragePath = args[++i];
    }
  }

  // Load data
  const testResults = await loadTestResults(resultsPath);
  const coverage = await loadCoverage(coveragePath);
  const history = await loadHistory();

  // Calculate current metrics
  const totalTests = testResults?.numTotalTests || 0;
  const passedTests = testResults?.numPassedTests || 0;
  const failedTests = testResults?.numFailedTests || 0;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  const duration = testResults?.startTime ? Date.now() - testResults.startTime : 0;

  const currentCoverage = {
    lines: coverage?.total?.lines?.pct || 0,
    statements: coverage?.total?.statements?.pct || 0,
    functions: coverage?.total?.functions?.pct || 0,
    branches: coverage?.total?.branches?.pct || 0,
  };

  // Calculate trends
  const trends = {
    passRate: calculateTrends(passRate, history.runs, 'successRate'),
    coverage: calculateTrends(currentCoverage.lines, history.runs, 'coverage'),
    testCount: calculateTrends(totalTests, history.runs, 'totalTests'),
  };

  // Build metrics object
  const metrics: HealthMetrics = {
    current: {
      totalTests,
      passRate,
      failedTests,
      duration,
      coverage: currentCoverage,
    },
    trends,
    health: {
      score: 0,
      status: 'good',
      issues: [],
    },
  };

  // Calculate health
  metrics.health.score = calculateHealthScore(metrics);
  metrics.health.status = getHealthStatus(metrics.health.score);
  metrics.health.issues = identifyIssues(metrics);

  // Output report
  console.log('\n' + generateMarkdownReport(metrics));

  // Write to GitHub Actions if in CI
  if (process.env.GITHUB_ACTIONS) {
    await writeGitHubOutputs(metrics);
  }

  // Update history
  if (testResults) {
    await updateHistory(metrics);
  }

  // Save report
  const reportDir = './test-reports';
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, 'health-check.json'), JSON.stringify(metrics, null, 2));

  // Exit with appropriate code
  if (metrics.health.status === 'poor') {
    console.log('\n⚠️ Test health is POOR - review issues above');
    process.exit(1);
  }

  console.log('\n✅ Test health check complete');
}

main().catch(error => {
  console.error('❌ Error running health check:', error);
  process.exit(1);
});
