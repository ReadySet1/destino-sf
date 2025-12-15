#!/usr/bin/env npx tsx
/**
 * Accessibility Audit Script
 *
 * CLI tool for running accessibility tests and generating reports.
 * Supports filtering by page, severity, and output format.
 *
 * Usage:
 *   pnpm tsx scripts/a11y-audit.ts [options]
 *
 * Options:
 *   --pages <pattern>     Filter pages by pattern (e.g., "admin", "checkout")
 *   --severity <level>    Minimum severity: critical, serious, moderate, minor
 *   --format <type>       Output format: console, json, markdown, html
 *   --output <path>       Output file path (default: stdout or ./a11y-reports/)
 *   --help                Show help
 */

import { chromium, Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import type { AxeResults, Result } from 'axe-core';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DEFAULT_TIMEOUT = 30000;

// All pages to test
const ALL_PAGES = {
  // Core pages
  core: [
    { path: '/', name: 'Homepage' },
    { path: '/menu', name: 'Menu' },
    { path: '/products', name: 'Products' },
    { path: '/cart', name: 'Cart' },
    { path: '/checkout', name: 'Checkout' },
    { path: '/checkout/success', name: 'Checkout Success' },
    { path: '/sign-in', name: 'Sign In' },
    { path: '/sign-up', name: 'Sign Up' },
    { path: '/forgot-password', name: 'Forgot Password' },
    { path: '/contact', name: 'Contact' },
    { path: '/about', name: 'About' },
    { path: '/terms', name: 'Terms' },
    { path: '/privacy', name: 'Privacy' },
  ],

  // Catering pages
  catering: [
    { path: '/catering', name: 'Catering Home' },
    { path: '/catering/a-la-carte', name: 'Catering A-La-Carte' },
    { path: '/catering/browse-options', name: 'Catering Browse Options' },
    { path: '/catering/checkout', name: 'Catering Checkout' },
    { path: '/catering/confirmation', name: 'Catering Confirmation' },
    { path: '/catering/custom-quote', name: 'Catering Custom Quote' },
    { path: '/catering/inquiry-form', name: 'Catering Inquiry Form' },
    { path: '/contact-catering', name: 'Contact Catering' },
  ],

  // Account pages
  account: [
    { path: '/account', name: 'Account' },
    { path: '/account/orders', name: 'Account Orders' },
    { path: '/orders/pending', name: 'Pending Orders' },
  ],

  // Admin pages
  admin: [
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/admin/orders', name: 'Admin Orders' },
    { path: '/admin/orders/manual', name: 'Manual Order' },
    { path: '/admin/orders/archived', name: 'Archived Orders' },
    { path: '/admin/products', name: 'Admin Products' },
    { path: '/admin/products/new', name: 'New Product' },
    { path: '/admin/products/order', name: 'Product Ordering' },
    { path: '/admin/products/archived', name: 'Archived Products' },
    { path: '/admin/products/badges', name: 'Product Badges' },
    { path: '/admin/products/availability', name: 'Availability Overview' },
    { path: '/admin/products/availability/timeline', name: 'Availability Timeline' },
    { path: '/admin/products/availability/bulk', name: 'Bulk Availability' },
    { path: '/admin/settings', name: 'Admin Settings' },
    { path: '/admin/shipping', name: 'Shipping Config' },
    { path: '/admin/categories', name: 'Categories' },
    { path: '/admin/hours', name: 'Hours Management' },
    { path: '/admin/users', name: 'Users List' },
    { path: '/admin/users/new', name: 'New User' },
    { path: '/admin/spotlight-picks', name: 'Spotlight Picks' },
    { path: '/admin/square-sync', name: 'Square Sync' },
    { path: '/admin/sync', name: 'Sync Operations' },
    { path: '/admin/sync-conflicts', name: 'Sync Conflicts' },
    { path: '/admin/dashboard/metrics', name: 'Metrics Dashboard' },
    { path: '/admin/jobs', name: 'Jobs' },
    { path: '/admin/test-delivery-zones', name: 'Test Delivery Zones' },
    { path: '/admin/test-email', name: 'Test Email' },
  ],
};

// Severity levels in order
const SEVERITY_ORDER = ['minor', 'moderate', 'serious', 'critical'] as const;
type Severity = (typeof SEVERITY_ORDER)[number];

interface AuditOptions {
  pages?: string;
  severity?: Severity;
  format?: 'console' | 'json' | 'markdown' | 'html';
  output?: string;
}

interface PageResult {
  name: string;
  path: string;
  url: string;
  violations: Result[];
  passes: number;
  incomplete: number;
  timestamp: string;
}

interface AuditReport {
  timestamp: string;
  baseUrl: string;
  totalPages: number;
  totalViolations: number;
  violationsByImpact: Record<Severity, number>;
  pages: PageResult[];
}

/**
 * Parse command line arguments
 */
function parseArgs(): AuditOptions {
  const args = process.argv.slice(2);
  const options: AuditOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pages':
        options.pages = args[++i];
        break;
      case '--severity':
        options.severity = args[++i] as Severity;
        break;
      case '--format':
        options.format = args[++i] as AuditOptions['format'];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Accessibility Audit Script

Usage:
  pnpm tsx scripts/a11y-audit.ts [options]

Options:
  --pages <pattern>     Filter pages by pattern (e.g., "admin", "checkout", "catering")
                        Patterns: core, catering, account, admin, or any substring
  --severity <level>    Minimum severity to report: critical, serious, moderate, minor
                        Default: minor (report all)
  --format <type>       Output format: console, json, markdown, html
                        Default: console
  --output <path>       Output file path
                        Default: stdout for console, ./a11y-reports/ for files
  --help                Show this help message

Examples:
  # Run full audit with console output
  pnpm tsx scripts/a11y-audit.ts

  # Audit only admin pages
  pnpm tsx scripts/a11y-audit.ts --pages admin

  # Report only critical and serious issues
  pnpm tsx scripts/a11y-audit.ts --severity serious

  # Generate JSON report
  pnpm tsx scripts/a11y-audit.ts --format json --output ./reports/a11y.json

  # Generate markdown report for catering pages
  pnpm tsx scripts/a11y-audit.ts --pages catering --format markdown
`);
}

/**
 * Get pages to test based on filter
 */
function getPages(filter?: string): Array<{ path: string; name: string }> {
  if (!filter) {
    return [
      ...ALL_PAGES.core,
      ...ALL_PAGES.catering,
      ...ALL_PAGES.account,
      ...ALL_PAGES.admin,
    ];
  }

  const filterLower = filter.toLowerCase();

  // Check for category filter
  if (filterLower in ALL_PAGES) {
    return ALL_PAGES[filterLower as keyof typeof ALL_PAGES];
  }

  // Filter by substring match
  const allPages = [
    ...ALL_PAGES.core,
    ...ALL_PAGES.catering,
    ...ALL_PAGES.account,
    ...ALL_PAGES.admin,
  ];

  return allPages.filter(
    page =>
      page.name.toLowerCase().includes(filterLower) ||
      page.path.toLowerCase().includes(filterLower)
  );
}

/**
 * Filter violations by minimum severity
 */
function filterBySeverity(violations: Result[], minSeverity?: Severity): Result[] {
  if (!minSeverity) return violations;

  const minIndex = SEVERITY_ORDER.indexOf(minSeverity);
  return violations.filter(v => {
    const index = SEVERITY_ORDER.indexOf((v.impact as Severity) || 'minor');
    return index >= minIndex;
  });
}

/**
 * Run accessibility audit on a single page
 */
async function auditPage(page: Page, pageInfo: { path: string; name: string }): Promise<PageResult> {
  const url = `${BASE_URL}${pageInfo.path}`;

  try {
    await page.goto(url, { timeout: DEFAULT_TIMEOUT });
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
  } catch {
    console.warn(`Warning: Page ${pageInfo.name} (${url}) failed to load completely`);
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.gm-style')
    .exclude('[class*="google-map"]')
    .exclude('#sq-card')
    .exclude('[class*="sq-"]')
    .analyze();

  return {
    name: pageInfo.name,
    path: pageInfo.path,
    url,
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run full audit
 */
async function runAudit(options: AuditOptions): Promise<AuditReport> {
  const pages = getPages(options.pages);
  console.log(`\nStarting accessibility audit of ${pages.length} page(s)...\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const pageResults: PageResult[] = [];
  let totalViolations = 0;
  const violationsByImpact: Record<Severity, number> = {
    minor: 0,
    moderate: 0,
    serious: 0,
    critical: 0,
  };

  for (let i = 0; i < pages.length; i++) {
    const pageInfo = pages[i];
    process.stdout.write(`[${i + 1}/${pages.length}] Auditing ${pageInfo.name}...`);

    try {
      const result = await auditPage(page, pageInfo);

      // Filter violations by severity if specified
      result.violations = filterBySeverity(result.violations, options.severity);

      // Count violations
      for (const violation of result.violations) {
        const impact = (violation.impact as Severity) || 'minor';
        violationsByImpact[impact]++;
        totalViolations++;
      }

      pageResults.push(result);

      if (result.violations.length === 0) {
        console.log(' ✓ No violations');
      } else {
        console.log(` ✗ ${result.violations.length} violation(s)`);
      }
    } catch (error) {
      console.log(` ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      pageResults.push({
        name: pageInfo.name,
        path: pageInfo.path,
        url: `${BASE_URL}${pageInfo.path}`,
        violations: [],
        passes: 0,
        incomplete: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }

  await browser.close();

  return {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalPages: pages.length,
    totalViolations,
    violationsByImpact,
    pages: pageResults,
  };
}

/**
 * Format report as console output
 */
function formatConsole(report: AuditReport): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(60));
  lines.push('ACCESSIBILITY AUDIT REPORT');
  lines.push('='.repeat(60));
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Base URL: ${report.baseUrl}`);
  lines.push(`Pages tested: ${report.totalPages}`);
  lines.push('');

  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(`Total violations: ${report.totalViolations}`);
  lines.push(`  Critical: ${report.violationsByImpact.critical}`);
  lines.push(`  Serious: ${report.violationsByImpact.serious}`);
  lines.push(`  Moderate: ${report.violationsByImpact.moderate}`);
  lines.push(`  Minor: ${report.violationsByImpact.minor}`);
  lines.push('');

  // Page results
  lines.push('RESULTS BY PAGE');
  lines.push('-'.repeat(40));

  for (const page of report.pages) {
    const status = page.violations.length === 0 ? '✓' : '✗';
    lines.push(`${status} ${page.name} (${page.path}): ${page.violations.length} violation(s)`);

    if (page.violations.length > 0) {
      for (const violation of page.violations.slice(0, 5)) {
        lines.push(`    [${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
        lines.push(`      Affected: ${violation.nodes.length} element(s)`);
      }
      if (page.violations.length > 5) {
        lines.push(`    ...and ${page.violations.length - 5} more`);
      }
    }
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Format report as JSON
 */
function formatJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Format report as Markdown
 */
function formatMarkdown(report: AuditReport): string {
  const lines: string[] = [];

  lines.push('# Accessibility Audit Report\n');
  lines.push(`**Generated:** ${report.timestamp}  `);
  lines.push(`**Base URL:** ${report.baseUrl}  `);
  lines.push(`**Pages Tested:** ${report.totalPages}\n`);

  // Summary
  lines.push('## Summary\n');

  if (report.totalViolations === 0) {
    lines.push('All pages passed WCAG 2.1 AA automated checks!\n');
  } else {
    lines.push(`Found **${report.totalViolations}** accessibility violation(s).\n`);
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    lines.push(`| Critical | ${report.violationsByImpact.critical} |`);
    lines.push(`| Serious | ${report.violationsByImpact.serious} |`);
    lines.push(`| Moderate | ${report.violationsByImpact.moderate} |`);
    lines.push(`| Minor | ${report.violationsByImpact.minor} |`);
    lines.push('');
  }

  // Results table
  lines.push('## Results by Page\n');
  lines.push('| Page | Path | Violations |');
  lines.push('|------|------|------------|');

  for (const page of report.pages) {
    const emoji = page.violations.length === 0 ? '✅' : '❌';
    lines.push(`| ${emoji} ${page.name} | \`${page.path}\` | ${page.violations.length} |`);
  }

  // Detailed violations
  const pagesWithViolations = report.pages.filter(p => p.violations.length > 0);

  if (pagesWithViolations.length > 0) {
    lines.push('\n## Violation Details\n');

    for (const page of pagesWithViolations) {
      lines.push(`### ${page.name}\n`);

      for (const violation of page.violations.slice(0, 10)) {
        const severityBadge =
          violation.impact === 'critical'
            ? '🔴 **CRITICAL**'
            : violation.impact === 'serious'
              ? '🟠 **SERIOUS**'
              : violation.impact === 'moderate'
                ? '🟡 Moderate'
                : '⚪ Minor';

        lines.push(`- ${severityBadge} **${violation.id}**`);
        lines.push(`  - ${violation.description}`);
        lines.push(`  - Affected elements: ${violation.nodes.length}`);
        lines.push(`  - [Learn more](${violation.helpUrl})`);
      }

      if (page.violations.length > 10) {
        lines.push(`\n*...and ${page.violations.length - 10} more violations*\n`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format report as HTML
 */
function formatHtml(report: AuditReport): string {
  const criticalColor = report.violationsByImpact.critical > 0 ? '#dc2626' : '#22c55e';
  const seriousColor = report.violationsByImpact.serious > 0 ? '#ea580c' : '#22c55e';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Audit Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; background: #f9fafb; color: #111827; }
    h1 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; }
    h2 { color: #374151; margin-top: 2rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .summary-card { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .summary-card.critical { border-left: 4px solid ${criticalColor}; }
    .summary-card.serious { border-left: 4px solid ${seriousColor}; }
    .summary-card.moderate { border-left: 4px solid #eab308; }
    .summary-card.minor { border-left: 4px solid #6b7280; }
    .summary-card .number { font-size: 2rem; font-weight: bold; }
    .summary-card .label { color: #6b7280; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 1rem 0; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .pass { color: #22c55e; }
    .fail { color: #dc2626; }
    .violation { background: white; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .violation-header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge.critical { background: #fef2f2; color: #dc2626; }
    .badge.serious { background: #fff7ed; color: #ea580c; }
    .badge.moderate { background: #fefce8; color: #ca8a04; }
    .badge.minor { background: #f3f4f6; color: #6b7280; }
    .violation-description { color: #4b5563; margin-bottom: 0.5rem; }
    .violation-meta { font-size: 0.875rem; color: #6b7280; }
    a { color: #2563eb; }
    .timestamp { color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Accessibility Audit Report</h1>
  <p class="timestamp">Generated: ${report.timestamp} | Base URL: ${report.baseUrl}</p>

  <h2>Summary</h2>
  <div class="summary">
    <div class="summary-card">
      <div class="number">${report.totalPages}</div>
      <div class="label">Pages Tested</div>
    </div>
    <div class="summary-card">
      <div class="number">${report.totalViolations}</div>
      <div class="label">Total Violations</div>
    </div>
    <div class="summary-card critical">
      <div class="number">${report.violationsByImpact.critical}</div>
      <div class="label">Critical</div>
    </div>
    <div class="summary-card serious">
      <div class="number">${report.violationsByImpact.serious}</div>
      <div class="label">Serious</div>
    </div>
    <div class="summary-card moderate">
      <div class="number">${report.violationsByImpact.moderate}</div>
      <div class="label">Moderate</div>
    </div>
    <div class="summary-card minor">
      <div class="number">${report.violationsByImpact.minor}</div>
      <div class="label">Minor</div>
    </div>
  </div>

  <h2>Results by Page</h2>
  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Page</th>
        <th>Path</th>
        <th>Violations</th>
        <th>Passes</th>
      </tr>
    </thead>
    <tbody>
      ${report.pages
        .map(
          page => `
        <tr>
          <td class="${page.violations.length === 0 ? 'pass' : 'fail'}">${page.violations.length === 0 ? '✓' : '✗'}</td>
          <td>${page.name}</td>
          <td><code>${page.path}</code></td>
          <td>${page.violations.length}</td>
          <td>${page.passes}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  ${
    report.pages.some(p => p.violations.length > 0)
      ? `
  <h2>Violation Details</h2>
  ${report.pages
    .filter(p => p.violations.length > 0)
    .map(
      page => `
    <h3>${page.name} <span style="color: #6b7280; font-weight: normal;">(${page.path})</span></h3>
    ${page.violations
      .slice(0, 10)
      .map(
        v => `
      <div class="violation">
        <div class="violation-header">
          <span class="badge ${v.impact}">${v.impact}</span>
          <strong>${v.id}</strong>
        </div>
        <div class="violation-description">${v.description}</div>
        <div class="violation-meta">
          Affected: ${v.nodes.length} element(s) |
          <a href="${v.helpUrl}" target="_blank">Learn more</a>
        </div>
      </div>
    `
      )
      .join('')}
    ${page.violations.length > 10 ? `<p style="color: #6b7280;">...and ${page.violations.length - 10} more violations</p>` : ''}
  `
    )
    .join('')}
  `
      : ''
  }
</body>
</html>`;
}

/**
 * Output the report
 */
function outputReport(report: AuditReport, options: AuditOptions): void {
  const format = options.format || 'console';

  let content: string;
  let defaultExt: string;

  switch (format) {
    case 'json':
      content = formatJson(report);
      defaultExt = '.json';
      break;
    case 'markdown':
      content = formatMarkdown(report);
      defaultExt = '.md';
      break;
    case 'html':
      content = formatHtml(report);
      defaultExt = '.html';
      break;
    default:
      content = formatConsole(report);
      defaultExt = '.txt';
  }

  if (options.output) {
    // Write to file
    const outputPath = options.output.endsWith(defaultExt)
      ? options.output
      : `${options.output}${defaultExt}`;

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content);
    console.log(`\nReport written to: ${outputPath}`);
  } else if (format !== 'console') {
    // Write to default location for non-console formats
    const reportsDir = './a11y-reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(reportsDir, `a11y-report-${timestamp}${defaultExt}`);

    fs.writeFileSync(outputPath, content);
    console.log(`\nReport written to: ${outputPath}`);
  } else {
    // Console output
    console.log(content);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();

  try {
    const report = await runAudit(options);
    outputReport(report, options);

    // Exit with error code if critical/serious violations found
    if (report.violationsByImpact.critical > 0 || report.violationsByImpact.serious > 0) {
      console.log(
        `\n⚠️  Found ${report.violationsByImpact.critical} critical and ${report.violationsByImpact.serious} serious violations`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

main();
