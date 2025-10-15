import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for staging environment
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests in staging */
  retries: 2,

  /* Use fewer workers in staging to reduce load */
  workers: process.env.CI ? 1 : 2,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/staging-html' }],
    ['json', { outputFile: 'test-results/staging-results.json' }],
    ['junit', { outputFile: 'test-results/staging-results.xml' }],
    ['list'], // Console output for CI
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL for staging environment - set via environment variable */
    baseURL:
      process.env.PLAYWRIGHT_STAGING_URL ||
      process.env.VERCEL_URL ||
      'https://destino-sf-staging.vercel.app',

    /* Collect trace on failure for debugging staging issues */
    trace: 'retain-on-failure',

    /* Take screenshots on failures */
    screenshot: 'only-on-failure',

    /* Record video on failures for debugging */
    video: 'retain-on-failure',

    /* Global timeout for all actions */
    actionTimeout: 15 * 1000, // Slightly longer for staging

    /* Global timeout for navigation */
    navigationTimeout: 45 * 1000, // Longer for staging environment

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'staging',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // Primary browsers for staging tests
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    // Optional: Run on additional browsers if needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Global timeout for each test - more lenient for staging */
  timeout: 60 * 1000,

  /* Global timeout for expect assertions */
  expect: {
    timeout: 10 * 1000,
  },

  /* No local server needed - testing against deployed staging environment */
  // webServer is intentionally omitted
});
