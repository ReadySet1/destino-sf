import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Accessibility Tests
 *
 * Dedicated config for running WCAG 2.1 AA compliance tests with axe-core.
 * Uses single browser (Chromium) and higher timeouts for accessibility audits.
 *
 * Usage:
 *   pnpm test:a11y                    # Run all a11y tests
 *   pnpm test:a11y --grep "Homepage"  # Run specific test
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e/accessibility',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on failure - accessibility audits can be flaky due to dynamic content */
  retries: process.env.CI ? 1 : 0,

  /* Single worker to prevent resource contention during audits */
  workers: process.env.CI ? 1 : 2,

  /* Reporter configuration for a11y results */
  reporter: [
    ['list'],
    ['html', { outputFolder: './a11y-results/html-report', open: 'never' }],
    ['json', { outputFile: './a11y-results/results.json' }],
  ],

  /* Shared settings for accessibility tests */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace on first retry for debugging */
    trace: 'on-first-retry',

    /* Take screenshot on failure for debugging */
    screenshot: 'only-on-failure',

    /* No video needed for accessibility tests */
    video: 'off',

    /* Higher timeout for axe-core analysis */
    actionTimeout: 30 * 1000,

    /* Higher navigation timeout for page loading */
    navigationTimeout: 60 * 1000,
  },

  /* Single browser project - Chromium only for accessibility testing */
  projects: [
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    /* Mobile viewport for responsive accessibility testing */
    {
      name: 'accessibility-mobile',
      testMatch: /.*mobile.*\.spec\.ts/,
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],

  /* Higher global timeout for accessibility audits */
  timeout: 120 * 1000,

  /* Extended expect timeout for axe-core analysis */
  expect: {
    timeout: 30 * 1000,
  },

  /* Run local dev server before starting the tests */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Output directory for test artifacts */
  outputDir: './a11y-results/test-artifacts',
});
