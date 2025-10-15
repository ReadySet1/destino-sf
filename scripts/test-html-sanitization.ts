/**
 * Security Testing Script for HTML Sanitization
 *
 * Tests the sanitizeProductDescription function to ensure:
 * 1. Valid HTML formatting tags are preserved
 * 2. Malicious HTML (scripts, iframes, event handlers) is stripped
 * 3. Edge cases (null, empty, malformed HTML) are handled gracefully
 *
 * Run this script with: npx tsx scripts/test-html-sanitization.ts
 */

import {
  sanitizeProductDescription,
  htmlToPlainText,
  isHtmlDescription,
} from '../src/lib/utils/product-description';

// ANSI color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface TestCase {
  name: string;
  input: string | null | undefined;
  expected: string;
  description: string;
}

const testCases: TestCase[] = [
  // Valid HTML formatting (should be preserved)
  {
    name: 'Bold text with <strong>',
    input: '<p><strong>(6oz)</strong> roasted squash</p>',
    expected: '<p><strong>(6oz)</strong> roasted squash</p>',
    description: 'Preserve strong tags for bold text',
  },
  {
    name: 'Italic text with <em>',
    input: '<p>roasted squash <em>-gf</em></p>',
    expected: '<p>roasted squash <em>-gf</em></p>',
    description: 'Preserve em tags for italic text',
  },
  {
    name: 'Combined bold and italic',
    input: '<p><strong><em>-gf, vg, vgn</em></strong></p>',
    expected: '<p><strong><em>-gf, vg, vgn</em></strong></p>',
    description: 'Preserve nested formatting tags',
  },
  {
    name: 'Bold with <b> tag',
    input: '<b>Bold text</b>',
    expected: '<b>Bold text</b>',
    description: 'Preserve b tags',
  },
  {
    name: 'Italic with <i> tag',
    input: '<i>Italic text</i>',
    expected: '<i>Italic text</i>',
    description: 'Preserve i tags',
  },
  {
    name: 'Paragraph with line break',
    input: '<p>Line 1<br/>Line 2</p>',
    expected: '<p>Line 1<br>Line 2</p>',
    description: 'Preserve paragraph and line break tags',
  },
  {
    name: 'Unordered list',
    input: '<ul><li>Item 1</li><li>Item 2</li></ul>',
    expected: '<ul><li>Item 1</li><li>Item 2</li></ul>',
    description: 'Preserve list tags',
  },

  // Malicious HTML (should be stripped)
  {
    name: 'Script tag (XSS attack)',
    input: '<script>alert("xss")</script><b>Text</b>',
    expected: '<b>Text</b>',
    description: 'Strip script tags completely',
  },
  {
    name: 'Inline script with onclick',
    input: '<b onclick="alert(\'xss\')">Click me</b>',
    expected: '<b>Click me</b>',
    description: 'Strip onclick event handlers',
  },
  {
    name: 'Iframe injection',
    input: '<iframe src="http://evil.com"></iframe><p>Text</p>',
    expected: '<p>Text</p>',
    description: 'Strip iframe tags',
  },
  {
    name: 'Image with onerror handler',
    input: '<img src="x" onerror="alert(\'xss\')"/><p>Text</p>',
    expected: '<p>Text</p>',
    description: 'Strip img tags and handlers (not in allowed list)',
  },
  {
    name: 'Link with javascript: protocol',
    input: '<a href="javascript:alert(\'xss\')">Click</a>',
    expected: 'Click',
    description: 'Strip anchor tags (not in allowed list)',
  },
  {
    name: 'Style tag injection',
    input: '<style>body{display:none}</style><p>Text</p>',
    expected: '<p>Text</p>',
    description: 'Strip style tags',
  },
  {
    name: 'Object/embed tags',
    input: '<object data="evil.swf"></object><p>Text</p>',
    expected: '<p>Text</p>',
    description: 'Strip object tags',
  },

  // Edge cases
  {
    name: 'Null input',
    input: null,
    expected: '',
    description: 'Handle null gracefully',
  },
  {
    name: 'Undefined input',
    input: undefined,
    expected: '',
    description: 'Handle undefined gracefully',
  },
  {
    name: 'Empty string',
    input: '',
    expected: '',
    description: 'Handle empty string',
  },
  {
    name: 'Plain text (no HTML)',
    input: 'Plain text description',
    expected: 'Plain text description',
    description: 'Pass through plain text unchanged',
  },
  {
    name: 'Malformed HTML',
    input: '<p>Unclosed paragraph',
    expected: '<p>Unclosed paragraph</p>',
    description: 'Auto-close malformed tags',
  },
  {
    name: 'Mixed valid and invalid tags',
    input: '<p><script>evil()</script><strong>Safe</strong></p>',
    expected: '<p><strong>Safe</strong></p>',
    description: 'Preserve safe tags, strip dangerous ones',
  },
  {
    name: 'Real Square example',
    input:
      '<p><strong>(6oz)</strong> roasted acorn squash / sweet potato puree / coconut milk / romesco salsa <strong><em>-gf, vg, vgn</em></strong></p><p><br/></p>',
    expected:
      '<p><strong>(6oz)</strong> roasted acorn squash / sweet potato puree / coconut milk / romesco salsa <strong><em>-gf, vg, vgn</em></strong></p><p><br></p>',
    description: 'Handle real Square product description',
  },
];

// Helper function to run a test case
function runTest(testCase: TestCase): boolean {
  const result = sanitizeProductDescription(testCase.input);
  const passed = result === testCase.expected;

  if (passed) {
    console.log(`${GREEN}✓${RESET} ${testCase.name}`);
    console.log(`  ${testCase.description}`);
  } else {
    console.log(`${RED}✗${RESET} ${testCase.name}`);
    console.log(`  ${testCase.description}`);
    console.log(`  ${YELLOW}Input:${RESET}    ${testCase.input}`);
    console.log(`  ${YELLOW}Expected:${RESET} ${testCase.expected}`);
    console.log(`  ${RED}Got:${RESET}      ${result}`);
  }

  return passed;
}

// Run all tests
function runAllTests() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}   HTML Sanitization Security Tests${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════${RESET}\n`);

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    const result = runTest(testCase);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    console.log(''); // Add spacing between tests
  });

  // Test htmlToPlainText function
  console.log(`${BLUE}───────────────────────────────────────────────────────────${RESET}`);
  console.log(`${BLUE}   htmlToPlainText() Function Tests${RESET}`);
  console.log(`${BLUE}───────────────────────────────────────────────────────────${RESET}\n`);

  const plainTextTests = [
    {
      input: '<p><strong>(6oz)</strong> roasted squash</p>',
      expected: '(6oz) roasted squash',
    },
    {
      input: '<p>Line 1<br/>Line 2</p>',
      expected: 'Line 1 Line 2',
    },
    {
      input: '<script>alert("xss")</script>Text',
      expected: 'Text',
    },
  ];

  plainTextTests.forEach(({ input, expected }) => {
    const result = htmlToPlainText(input);
    const testPassed = result === expected;

    if (testPassed) {
      console.log(`${GREEN}✓${RESET} htmlToPlainText: "${input.substring(0, 30)}..."`);
      passed++;
    } else {
      console.log(`${RED}✗${RESET} htmlToPlainText: "${input.substring(0, 30)}..."`);
      console.log(`  ${YELLOW}Expected:${RESET} "${expected}"`);
      console.log(`  ${RED}Got:${RESET}      "${result}"`);
      failed++;
    }
  });

  // Test isHtmlDescription function
  console.log(`\n${BLUE}───────────────────────────────────────────────────────────${RESET}`);
  console.log(`${BLUE}   isHtmlDescription() Function Tests${RESET}`);
  console.log(`${BLUE}───────────────────────────────────────────────────────────${RESET}\n`);

  const htmlDetectionTests = [
    { input: '<p>HTML text</p>', expected: true },
    { input: 'Plain text', expected: false },
    { input: '<strong>Bold</strong>', expected: true },
    { input: '', expected: false },
    { input: null, expected: false },
  ];

  htmlDetectionTests.forEach(({ input, expected }) => {
    const result = isHtmlDescription(input);
    const testPassed = result === expected;

    if (testPassed) {
      console.log(`${GREEN}✓${RESET} isHtmlDescription: "${String(input).substring(0, 30)}..."`);
      passed++;
    } else {
      console.log(`${RED}✗${RESET} isHtmlDescription: "${String(input).substring(0, 30)}..."`);
      console.log(`  ${YELLOW}Expected:${RESET} ${expected}`);
      console.log(`  ${RED}Got:${RESET}      ${result}`);
      failed++;
    }
  });

  // Summary
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}   Test Summary${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════${RESET}\n`);

  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`  Total Tests: ${total}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  console.log(`  ${failed > 0 ? RED : GREEN}Failed: ${failed}${RESET}`);
  console.log(`  Pass Rate: ${passRate}%\n`);

  if (failed === 0) {
    console.log(`${GREEN}✓ All security tests passed!${RESET}`);
    console.log(`${GREEN}  HTML sanitization is working correctly.${RESET}\n`);
  } else {
    console.log(`${RED}✗ Some tests failed!${RESET}`);
    console.log(`${RED}  Please review the sanitization logic.${RESET}\n`);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
