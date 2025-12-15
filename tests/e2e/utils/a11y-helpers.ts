/**
 * Accessibility Testing Helpers
 *
 * Utilities for running automated accessibility audits using axe-core.
 * Configured for WCAG 2.1 AA compliance testing.
 */

import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { AxeResults, Result, NodeResult, ImpactValue } from 'axe-core';

/**
 * Accessibility audit options
 */
export interface A11yAuditOptions {
  /** Include specific rules only */
  includeRules?: string[];
  /** Exclude specific rules */
  excludeRules?: string[];
  /** CSS selectors to exclude from audit */
  excludeSelectors?: string[];
  /** Only check specific element */
  includedImpacts?: ImpactValue[];
  /** WCAG tags to check (default: wcag2a, wcag2aa, wcag21a, wcag21aa) */
  wcagTags?: string[];
}

/**
 * Formatted violation for reporting
 */
export interface FormattedViolation {
  id: string;
  impact: ImpactValue | undefined;
  description: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string | undefined;
  }>;
}

/**
 * Accessibility audit summary
 */
export interface A11ySummary {
  pageName: string;
  url: string;
  timestamp: string;
  violations: number;
  passes: number;
  incomplete: number;
  inapplicable: number;
  violationsByImpact: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

/**
 * Default WCAG 2.1 AA tags
 */
const DEFAULT_WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Common selectors to exclude (third-party widgets, etc.)
 */
const DEFAULT_EXCLUDE_SELECTORS = [
  // Google Maps embedded components
  '.gm-style',
  '[class*="google-map"]',
  // Third-party payment widgets (Square)
  '#sq-card',
  '[class*="sq-"]',
  // External embedded content
  'iframe[src*="youtube"]',
  'iframe[src*="vimeo"]',
];

/**
 * Run an accessibility audit on the current page
 */
export async function runAccessibilityAudit(
  page: Page,
  options: A11yAuditOptions = {}
): Promise<AxeResults> {
  const {
    includeRules,
    excludeRules,
    excludeSelectors = DEFAULT_EXCLUDE_SELECTORS,
    wcagTags = DEFAULT_WCAG_TAGS,
  } = options;

  let builder = new AxeBuilder({ page }).withTags(wcagTags);

  // Exclude common third-party elements
  for (const selector of excludeSelectors) {
    builder = builder.exclude(selector);
  }

  // Include specific rules if provided
  if (includeRules && includeRules.length > 0) {
    builder = builder.withRules(includeRules);
  }

  // Disable specific rules if provided
  if (excludeRules && excludeRules.length > 0) {
    builder = builder.disableRules(excludeRules);
  }

  return builder.analyze();
}

/**
 * Check page accessibility with standard configuration
 * Returns results and logs summary
 */
export async function checkPageAccessibility(
  page: Page,
  pageName: string,
  options: A11yAuditOptions = {}
): Promise<AxeResults> {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Run the audit
  const results = await runAccessibilityAudit(page, options);

  // Log summary
  const summary = getViolationSummary(results, pageName, page.url());
  logSummary(summary);

  return results;
}

/**
 * Format violations for human-readable output
 */
export function formatViolations(violations: Result[]): FormattedViolation[] {
  return violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map(node => ({
      html: node.html,
      target: node.target as string[],
      failureSummary: node.failureSummary,
    })),
  }));
}

/**
 * Get violation summary statistics
 */
export function getViolationSummary(
  results: AxeResults,
  pageName: string,
  url: string
): A11ySummary {
  const violationsByImpact = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  for (const violation of results.violations) {
    const impact = violation.impact || 'minor';
    if (impact in violationsByImpact) {
      violationsByImpact[impact as keyof typeof violationsByImpact]++;
    }
  }

  return {
    pageName,
    url,
    timestamp: new Date().toISOString(),
    violations: results.violations.length,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    inapplicable: results.inapplicable.length,
    violationsByImpact,
  };
}

/**
 * Log summary to console
 */
function logSummary(summary: A11ySummary): void {
  console.log(`\n=== A11y Audit: ${summary.pageName} ===`);
  console.log(`URL: ${summary.url}`);
  console.log(`Violations: ${summary.violations}`);
  console.log(`  - Critical: ${summary.violationsByImpact.critical}`);
  console.log(`  - Serious: ${summary.violationsByImpact.serious}`);
  console.log(`  - Moderate: ${summary.violationsByImpact.moderate}`);
  console.log(`  - Minor: ${summary.violationsByImpact.minor}`);
  console.log(`Passes: ${summary.passes}`);
  console.log(`Incomplete: ${summary.incomplete}`);
}

/**
 * Generate markdown report for CI
 */
export function generateMarkdownReport(
  summaries: A11ySummary[],
  violations: Map<string, FormattedViolation[]>
): string {
  const lines: string[] = [];

  lines.push('## Accessibility Test Results\n');

  // Summary table
  const totalViolations = summaries.reduce((sum, s) => sum + s.violations, 0);
  const criticalCount = summaries.reduce((sum, s) => sum + s.violationsByImpact.critical, 0);
  const seriousCount = summaries.reduce((sum, s) => sum + s.violationsByImpact.serious, 0);

  if (totalViolations === 0) {
    lines.push('All pages passed WCAG 2.1 AA automated checks!\n');
  } else {
    lines.push(`Found **${totalViolations}** accessibility violation(s).\n`);

    if (criticalCount > 0 || seriousCount > 0) {
      lines.push(
        `> **${criticalCount} critical** and **${seriousCount} serious** issues require attention.\n`
      );
    }
  }

  // Results by page
  lines.push('### Results by Page\n');
  lines.push('| Page | Violations | Critical | Serious | Moderate | Minor |');
  lines.push('|------|------------|----------|---------|----------|-------|');

  for (const summary of summaries) {
    const emoji = summary.violations === 0 ? '' : '';
    lines.push(
      `| ${emoji} ${summary.pageName} | ${summary.violations} | ${summary.violationsByImpact.critical} | ${summary.violationsByImpact.serious} | ${summary.violationsByImpact.moderate} | ${summary.violationsByImpact.minor} |`
    );
  }

  // Detailed violations
  if (totalViolations > 0) {
    lines.push('\n### Violation Details\n');

    for (const [pageName, pageViolations] of violations) {
      if (pageViolations.length === 0) continue;

      lines.push(`#### ${pageName}\n`);

      for (const violation of pageViolations.slice(0, 5)) {
        const impactBadge =
          violation.impact === 'critical'
            ? '**CRITICAL**'
            : violation.impact === 'serious'
              ? '**SERIOUS**'
              : violation.impact || 'minor';

        lines.push(`- **${violation.id}** (${impactBadge}): ${violation.description}`);
        lines.push(`  - [Learn more](${violation.helpUrl})`);
        lines.push(`  - Affected: ${violation.nodes.length} element(s)`);
      }

      if (pageViolations.length > 5) {
        lines.push(`- _...and ${pageViolations.length - 5} more violations_`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate JSON report for CI artifacts
 */
export function generateJsonReport(summaries: A11ySummary[], results: AxeResults[]): string {
  const report = {
    timestamp: new Date().toISOString(),
    totalPages: summaries.length,
    totalViolations: summaries.reduce((sum, s) => sum + s.violations, 0),
    summaries,
    details: results.map(r => ({
      url: r.url,
      violations: r.violations,
      passes: r.passes.length,
      incomplete: r.incomplete.length,
    })),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Soft assertion - logs violations but doesn't fail test
 * Useful for reporting mode
 */
export function logViolationsWithoutFailing(results: AxeResults, pageName: string): void {
  if (results.violations.length > 0) {
    console.warn(`\n[A11y Warning] ${pageName} has ${results.violations.length} violation(s):`);

    for (const violation of results.violations) {
      console.warn(`  - [${violation.impact}] ${violation.id}: ${violation.description}`);

      for (const node of violation.nodes.slice(0, 3)) {
        console.warn(`    Element: ${node.target.join(' > ')}`);
      }

      if (violation.nodes.length > 3) {
        console.warn(`    ...and ${violation.nodes.length - 3} more elements`);
      }
    }
  }
}

/**
 * Get critical and serious violations only
 */
export function getCriticalViolations(results: AxeResults): Result[] {
  return results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
}

/**
 * Check if results have any critical or serious violations
 */
export function hasCriticalViolations(results: AxeResults): boolean {
  return getCriticalViolations(results).length > 0;
}

/**
 * Common a11y rules that are often problematic
 * and may need exclusion in specific contexts
 */
export const COMMON_EXCLUDE_RULES = {
  // Sometimes conflicts with design systems
  colorContrast: 'color-contrast',
  // May flag decorative images correctly
  imageAlt: 'image-alt',
  // Complex forms may have valid reasons
  labelTitleOnly: 'label-title-only',
  // Skip bypass links may not be needed for SPAs
  bypass: 'bypass',
  // Region rules can be strict
  region: 'region',
};

/**
 * Predefined rule sets for common scenarios
 */
export const RULE_SETS = {
  /** Full WCAG 2.1 AA compliance */
  full: {
    wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    excludeRules: [],
  },
  /** Critical issues only */
  critical: {
    wcagTags: ['wcag2a', 'wcag2aa'],
    includedImpacts: ['critical', 'serious'] as ImpactValue[],
  },
  /** Skip color contrast (for design review separately) */
  noColorContrast: {
    wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    excludeRules: ['color-contrast'],
  },
  /** Forms-focused testing */
  forms: {
    includeRules: [
      'label',
      'label-title-only',
      'form-field-multiple-labels',
      'select-name',
      'input-button-name',
      'input-image-alt',
      'autocomplete-valid',
    ],
  },
  /** Navigation and structure */
  navigation: {
    includeRules: [
      'bypass',
      'document-title',
      'heading-order',
      'landmark-banner-is-top-level',
      'landmark-contentinfo-is-top-level',
      'landmark-main-is-top-level',
      'landmark-no-duplicate-banner',
      'landmark-one-main',
      'landmark-unique',
      'region',
    ],
  },
};
