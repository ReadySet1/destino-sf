#!/usr/bin/env tsx

/**
 * Coverage Comparison Script
 *
 * Compares PR coverage against main branch coverage and outputs
 * a detailed diff for PR comments.
 *
 * Usage:
 *   npx tsx scripts/compare-coverage.ts [--base coverage-base.json] [--head coverage-head.json]
 *
 * Environment Variables:
 *   GITHUB_OUTPUT - Path to GitHub Actions output file
 *   GITHUB_STEP_SUMMARY - Path to GitHub Actions step summary file
 */

import fs from 'fs/promises';

interface CoverageSummary {
  total: {
    lines: { pct: number; total: number; covered: number };
    statements: { pct: number; total: number; covered: number };
    functions: { pct: number; total: number; covered: number };
    branches: { pct: number; total: number; covered: number };
  };
  [key: string]: any;
}

interface CoverageComparison {
  lines: { base: number; head: number; diff: number };
  statements: { base: number; head: number; diff: number };
  functions: { base: number; head: number; diff: number };
  branches: { base: number; head: number; diff: number };
  hasRegression: boolean;
  significantChanges: PathCoverageChange[];
}

interface PathCoverageChange {
  path: string;
  base: number;
  head: number;
  diff: number;
  isRegression: boolean;
}

const BASE_COVERAGE_FILE = './coverage-base/coverage-summary.json';
const HEAD_COVERAGE_FILE = './coverage/coverage-summary.json';
const REGRESSION_THRESHOLD = -2; // Warn if coverage drops by more than 2%
const SIGNIFICANT_CHANGE_THRESHOLD = 5; // Report changes > 5%

async function loadCoverage(filePath: string): Promise<CoverageSummary | null> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    console.warn(`Could not load coverage from ${filePath}`);
    return null;
  }
}

function compareTotals(
  base: CoverageSummary | null,
  head: CoverageSummary | null
): CoverageComparison {
  const defaultMetric = { base: 0, head: 0, diff: 0 };

  if (!head) {
    return {
      lines: defaultMetric,
      statements: defaultMetric,
      functions: defaultMetric,
      branches: defaultMetric,
      hasRegression: false,
      significantChanges: [],
    };
  }

  const getMetric = (metric: 'lines' | 'statements' | 'functions' | 'branches') => {
    const baseVal = base?.total?.[metric]?.pct || 0;
    const headVal = head.total?.[metric]?.pct || 0;
    return {
      base: baseVal,
      head: headVal,
      diff: headVal - baseVal,
    };
  };

  const lines = getMetric('lines');
  const statements = getMetric('statements');
  const functions = getMetric('functions');
  const branches = getMetric('branches');

  const hasRegression =
    lines.diff < REGRESSION_THRESHOLD ||
    statements.diff < REGRESSION_THRESHOLD ||
    functions.diff < REGRESSION_THRESHOLD ||
    branches.diff < REGRESSION_THRESHOLD;

  // Find significant path-level changes
  const significantChanges = findSignificantChanges(base, head);

  return {
    lines,
    statements,
    functions,
    branches,
    hasRegression,
    significantChanges,
  };
}

function findSignificantChanges(
  base: CoverageSummary | null,
  head: CoverageSummary | null
): PathCoverageChange[] {
  const changes: PathCoverageChange[] = [];

  if (!head) return changes;

  // Get all file paths from head coverage
  const headPaths = Object.keys(head).filter(
    key => key !== 'total' && typeof head[key] === 'object' && head[key]?.lines
  );

  for (const path of headPaths) {
    const headCoverage = head[path]?.lines?.pct || 0;
    const baseCoverage = base?.[path]?.lines?.pct || 0;
    const diff = headCoverage - baseCoverage;

    if (Math.abs(diff) >= SIGNIFICANT_CHANGE_THRESHOLD) {
      changes.push({
        path: simplifyPath(path),
        base: baseCoverage,
        head: headCoverage,
        diff,
        isRegression: diff < 0,
      });
    }
  }

  // Sort by absolute diff (largest changes first)
  return changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10);
}

function simplifyPath(fullPath: string): string {
  // Remove common prefixes and simplify path
  return fullPath
    .replace(/^.*\/src\//, 'src/')
    .replace(/^.*\/lib\//, 'lib/')
    .replace(/^.*\/app\//, 'app/');
}

function getDiffEmoji(diff: number): string {
  if (diff > 2) return '✅';
  if (diff > 0) return '↑';
  if (diff < -2) return '🔴';
  if (diff < 0) return '↓';
  return '→';
}

function formatDiff(diff: number): string {
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

function generateMarkdownReport(comparison: CoverageComparison, hasBase: boolean): string {
  const lines: string[] = [];

  lines.push('## 📊 Coverage Comparison');
  lines.push('');

  if (!hasBase) {
    lines.push('> ⚠️ No base coverage data available for comparison.');
    lines.push('> Showing current coverage only.');
    lines.push('');
  }

  // Overall comparison table
  lines.push('### Overall Coverage');
  lines.push('');
  lines.push('| Metric | ' + (hasBase ? 'Base | PR | ' : '') + 'Coverage | Change |');
  lines.push('|--------|' + (hasBase ? '------|-----|' : '') + '----------|--------|');

  const metrics: Array<{ name: string; data: { base: number; head: number; diff: number } }> = [
    { name: 'Lines', data: comparison.lines },
    { name: 'Statements', data: comparison.statements },
    { name: 'Functions', data: comparison.functions },
    { name: 'Branches', data: comparison.branches },
  ];

  for (const { name, data } of metrics) {
    const emoji = getDiffEmoji(data.diff);
    if (hasBase) {
      lines.push(
        `| ${name} | ${data.base.toFixed(1)}% | ${data.head.toFixed(1)}% | ${emoji} ${formatDiff(data.diff)} |`
      );
    } else {
      lines.push(`| ${name} | ${data.head.toFixed(1)}% | ${emoji} — |`);
    }
  }
  lines.push('');

  // Regression warning
  if (comparison.hasRegression) {
    lines.push('### ⚠️ Coverage Regression Detected');
    lines.push('');
    lines.push(
      'Coverage has decreased by more than 2% in one or more metrics. Please review the changes and add tests if necessary.'
    );
    lines.push('');
  }

  // Significant file changes
  if (comparison.significantChanges.length > 0) {
    lines.push('### Significant File Changes');
    lines.push('');
    lines.push('Files with coverage change > 5%:');
    lines.push('');
    lines.push('| File | Base | PR | Change |');
    lines.push('|------|------|-----|--------|');

    for (const change of comparison.significantChanges) {
      const emoji = getDiffEmoji(change.diff);
      lines.push(
        `| \`${change.path}\` | ${change.base.toFixed(1)}% | ${change.head.toFixed(1)}% | ${emoji} ${formatDiff(change.diff)} |`
      );
    }
    lines.push('');
  }

  // Summary
  lines.push('### Summary');
  lines.push('');

  if (comparison.hasRegression) {
    lines.push('❌ **Coverage check failed** - Regression detected');
  } else if (comparison.lines.diff > 0) {
    lines.push('✅ **Coverage improved** - Great job!');
  } else if (comparison.lines.diff >= -1) {
    lines.push('✅ **Coverage stable** - Within acceptable range');
  } else {
    lines.push('⚠️ **Minor coverage decrease** - Consider adding tests');
  }

  return lines.join('\n');
}

function generateGitHubOutput(comparison: CoverageComparison): string {
  const outputs: string[] = [];

  outputs.push(`coverage_lines=${comparison.lines.head.toFixed(1)}`);
  outputs.push(`coverage_lines_diff=${comparison.lines.diff.toFixed(1)}`);
  outputs.push(`coverage_statements=${comparison.statements.head.toFixed(1)}`);
  outputs.push(`coverage_functions=${comparison.functions.head.toFixed(1)}`);
  outputs.push(`coverage_branches=${comparison.branches.head.toFixed(1)}`);
  outputs.push(`has_regression=${comparison.hasRegression}`);
  outputs.push(`significant_changes=${comparison.significantChanges.length}`);

  // Determine status
  let status = 'pass';
  if (comparison.hasRegression) {
    status = 'fail';
  } else if (comparison.lines.diff < -1) {
    status = 'warn';
  }
  outputs.push(`coverage_status=${status}`);

  return outputs.join('\n');
}

async function writeGitHubOutputs(
  comparison: CoverageComparison,
  hasBase: boolean
): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;

  if (outputFile) {
    const outputs = generateGitHubOutput(comparison);
    await fs.appendFile(outputFile, outputs + '\n');
    console.log('GitHub outputs written');
  }

  if (summaryFile) {
    const summary = generateMarkdownReport(comparison, hasBase);
    await fs.appendFile(summaryFile, summary + '\n');
    console.log('GitHub step summary written');
  }
}

async function main(): Promise<void> {
  console.log('📊 Comparing coverage...');

  // Parse arguments
  const args = process.argv.slice(2);
  let basePath = BASE_COVERAGE_FILE;
  let headPath = HEAD_COVERAGE_FILE;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base' && args[i + 1]) {
      basePath = args[++i];
    } else if (args[i] === '--head' && args[i + 1]) {
      headPath = args[++i];
    }
  }

  // Load coverage data
  const baseCoverage = await loadCoverage(basePath);
  const headCoverage = await loadCoverage(headPath);

  if (!headCoverage) {
    console.error('❌ Could not load head coverage - run tests first');
    process.exit(1);
  }

  const hasBase = baseCoverage !== null;

  // Compare coverage
  const comparison = compareTotals(baseCoverage, headCoverage);

  // Output report
  console.log('\n' + generateMarkdownReport(comparison, hasBase));

  // Write to GitHub Actions if in CI
  if (process.env.GITHUB_ACTIONS) {
    await writeGitHubOutputs(comparison, hasBase);
  }

  // Save comparison report
  const reportDir = './test-reports';
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(
    `${reportDir}/coverage-comparison.json`,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        hasBase,
        comparison,
      },
      null,
      2
    )
  );

  // Exit with appropriate code
  if (comparison.hasRegression) {
    console.log('\n⚠️ Coverage regression detected');
    // Don't fail CI, just warn
    process.exit(0);
  }

  console.log('\n✅ Coverage comparison complete');
}

main().catch(error => {
  console.error('❌ Error comparing coverage:', error);
  process.exit(1);
});
