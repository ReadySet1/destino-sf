#!/usr/bin/env tsx
/**
 * E2E Test Coverage Report Generator
 *
 * Analyzes Playwright test files and generates coverage report
 * showing which user flows and features are covered by E2E tests.
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  file: string;
  describe: string;
  test: string;
  fullName: string;
}

interface CoverageArea {
  name: string;
  description: string;
  tests: TestCase[];
  coverage: number; // 0-100
}

interface CoverageReport {
  timestamp: string;
  totalTests: number;
  testFiles: number;
  coverageAreas: CoverageArea[];
  overallCoverage: number;
}

/**
 * Critical user paths to track
 */
const CRITICAL_PATHS = [
  {
    name: 'Guest Checkout',
    description: 'Browse → Add to Cart → Guest Checkout → Payment → Order Confirmation',
    keywords: ['guest', 'checkout', 'purchase', 'cart'],
    minTests: 3,
  },
  {
    name: 'Authenticated Purchase',
    description: 'Login → Browse → Add to Cart → Checkout → Payment → Order',
    keywords: ['authenticated', 'login', 'purchase', 'checkout'],
    minTests: 3,
  },
  {
    name: 'Cart Management',
    description: 'Add items, update quantities, remove items, view cart',
    keywords: ['cart', 'add', 'remove', 'update', 'quantity'],
    minTests: 5,
  },
  {
    name: 'Authentication',
    description: 'Sign up, sign in, sign out, password reset',
    keywords: ['auth', 'login', 'register', 'sign', 'password'],
    minTests: 4,
  },
  {
    name: 'Catering Inquiry',
    description: 'View catering menu, submit inquiry, receive confirmation',
    keywords: ['catering', 'inquiry', 'quote'],
    minTests: 3,
  },
  {
    name: 'Payment Methods',
    description: 'Credit card, Venmo, cash payment options',
    keywords: ['payment', 'card', 'venmo', 'cash'],
    minTests: 3,
  },
  {
    name: 'Shipping Validation',
    description: 'Address validation, shipping calculations, delivery options',
    keywords: ['shipping', 'delivery', 'address', 'validation'],
    minTests: 3,
  },
  {
    name: 'Order Lifecycle',
    description: 'Order creation, status updates, tracking, completion',
    keywords: ['order', 'status', 'tracking', 'lifecycle'],
    minTests: 4,
  },
  {
    name: 'Admin Order Management',
    description: 'View orders, update status, manage orders',
    keywords: ['admin', 'manage', 'order'],
    minTests: 3,
  },
];

/**
 * Parse test file for test cases
 */
function parseTestFile(filePath: string): TestCase[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tests: TestCase[] = [];

  // Match describe blocks
  const describeRegex = /describe\(['"`]([^'"`]+)['"`]/g;
  const testRegex = /test\(['"`]([^'"`]+)['"`]/g;

  let currentDescribe = '';
  const lines = content.split('\n');

  lines.forEach(line => {
    const describeMatch = line.match(describeRegex);
    if (describeMatch) {
      const match = describeMatch[0].match(/['"`]([^'"`]+)['"`]/);
      if (match) currentDescribe = match[1];
    }

    const testMatch = line.match(testRegex);
    if (testMatch) {
      const match = testMatch[0].match(/['"`]([^'"`]+)['"`]/);
      if (match) {
        tests.push({
          file: path.basename(filePath),
          describe: currentDescribe,
          test: match[1],
          fullName: `${currentDescribe} > ${match[1]}`,
        });
      }
    }
  });

  return tests;
}

/**
 * Find all E2E test files
 */
function findTestFiles(testDir: string): string[] {
  const files = fs.readdirSync(testDir);
  return files
    .filter(f => f.endsWith('.spec.ts') && !f.endsWith('.skip'))
    .map(f => path.join(testDir, f));
}

/**
 * Calculate coverage for a critical path
 */
function calculateCoverage(path: (typeof CRITICAL_PATHS)[0], allTests: TestCase[]): CoverageArea {
  const matchingTests = allTests.filter(test => {
    const searchText = `${test.describe} ${test.test} ${test.file}`.toLowerCase();
    return path.keywords.some(keyword => searchText.includes(keyword));
  });

  const coverage = Math.min(100, (matchingTests.length / path.minTests) * 100);

  return {
    name: path.name,
    description: path.description,
    tests: matchingTests,
    coverage: Math.round(coverage),
  };
}

/**
 * Generate coverage report
 */
function generateCoverageReport(testDir: string): CoverageReport {
  const testFiles = findTestFiles(testDir);
  console.log(`📁 Found ${testFiles.length} test files`);

  // Parse all test files
  const allTests: TestCase[] = [];
  testFiles.forEach(file => {
    const tests = parseTestFile(file);
    allTests.push(...tests);
    console.log(`  📝 ${path.basename(file)}: ${tests.length} tests`);
  });

  console.log(`\n✅ Total: ${allTests.length} tests\n`);

  // Calculate coverage for each critical path
  const coverageAreas = CRITICAL_PATHS.map(path => calculateCoverage(path, allTests));

  // Calculate overall coverage
  const totalCoverage = coverageAreas.reduce((sum, area) => sum + area.coverage, 0);
  const overallCoverage = Math.round(totalCoverage / coverageAreas.length);

  return {
    timestamp: new Date().toISOString(),
    totalTests: allTests.length,
    testFiles: testFiles.length,
    coverageAreas,
    overallCoverage,
  };
}

/**
 * Format coverage report as markdown
 */
function formatMarkdownReport(report: CoverageReport): string {
  let markdown = `# E2E Test Coverage Report\n\n`;
  markdown += `**Generated**: ${new Date(report.timestamp).toLocaleString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- **Total Tests**: ${report.totalTests}\n`;
  markdown += `- **Test Files**: ${report.testFiles}\n`;
  markdown += `- **Overall Coverage**: ${report.overallCoverage}%\n\n`;

  markdown += `## Coverage by Critical Path\n\n`;

  report.coverageAreas.forEach(area => {
    const emoji = area.coverage >= 100 ? '✅' : area.coverage >= 75 ? '⚠️' : '❌';
    markdown += `### ${emoji} ${area.name} (${area.coverage}%)\n\n`;
    markdown += `**Flow**: ${area.description}\n\n`;
    markdown += `**Test Coverage**: ${area.tests.length} tests\n\n`;

    if (area.tests.length > 0) {
      markdown += `<details>\n<summary>View Tests</summary>\n\n`;
      area.tests.forEach(test => {
        markdown += `- **${test.file}**: ${test.test}\n`;
      });
      markdown += `\n</details>\n\n`;
    } else {
      markdown += `⚠️ **No tests found** - Add tests for this critical path\n\n`;
    }
  });

  // Add recommendations
  markdown += `## Recommendations\n\n`;
  const incompletePaths = report.coverageAreas.filter(a => a.coverage < 100);
  if (incompletePaths.length > 0) {
    markdown += `### Areas Needing More Coverage\n\n`;
    incompletePaths.forEach(area => {
      markdown += `- **${area.name}**: ${area.coverage}% (add ${Math.ceil((100 - area.coverage) / 33)} more tests)\n`;
    });
  } else {
    markdown += `✅ All critical paths have sufficient test coverage!\n`;
  }

  return markdown;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing E2E Test Coverage...\n');

  const testDir = path.join(process.cwd(), 'tests', 'e2e');
  const report = generateCoverageReport(testDir);

  // Generate markdown report
  const markdown = formatMarkdownReport(report);

  // Save report
  const outputDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, 'e2e-coverage.md');
  fs.writeFileSync(reportPath, markdown);
  console.log(`\n📄 Coverage report saved to: ${reportPath}`);

  // Save JSON report
  const jsonPath = path.join(outputDir, 'e2e-coverage.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`📊 JSON report saved to: ${jsonPath}`);

  // Print summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 E2E COVERAGE SUMMARY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Overall Coverage: ${report.overallCoverage}%`);
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Test Files: ${report.testFiles}`);
  console.log(`${'='.repeat(50)}\n`);

  // Exit with error if coverage is too low
  if (report.overallCoverage < 75) {
    console.error(`❌ Coverage (${report.overallCoverage}%) is below 75% threshold`);
    process.exit(1);
  }

  console.log(`✅ Coverage is sufficient (${report.overallCoverage}% >= 75%)`);
}

// Run if executed directly
// Check if this file is the main module (works with ESM)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main();
}

export { generateCoverageReport, formatMarkdownReport };
