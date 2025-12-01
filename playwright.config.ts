import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests for better reliability */
  retries: process.env.CI ? 2 : 1,
  /* Reduce parallel workers to prevent database connection pool exhaustion */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'], // Add list reporter for better terminal output
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only on failures */
    screenshot: 'only-on-failure',

    /* Record video only on failures */
    video: 'retain-on-failure',

    /* Global timeout for all actions - increased for CI reliability */
    actionTimeout: process.env.CI ? 30 * 1000 : 15 * 1000,

    /* Global timeout for navigation - increased for CI reliability */
    navigationTimeout: process.env.CI ? 60 * 1000 : 30 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Visual regression testing project
    {
      name: 'visual-regression-desktop',
      testMatch: /.*\.visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on', // Always capture screenshots for visual tests
        video: 'off', // No video for visual tests
        trace: 'off', // No trace for visual tests
        // Disable animations for consistent screenshots
        launchOptions: {
          args: ['--disable-animations', '--disable-gpu-vsync'],
        },
      },
      expect: {
        toHaveScreenshot: {
          maxDiffPixels: 100, // Allow up to 100 pixels difference
          maxDiffPixelRatio: 0.002, // 0.2% pixel difference tolerance
          animations: 'disabled',
          caret: 'hide',
          // Use consistent snapshot names across platforms (no -darwin, -linux suffix)
          // This ensures baselines generated on macOS work in Linux CI
        },
      },
      snapshotPathTemplate:
        '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
    },
    {
      name: 'visual-regression-mobile',
      testMatch: /.*\.visual\.spec\.ts/,
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 667 },
        screenshot: 'on',
        video: 'off',
        trace: 'off',
        launchOptions: {
          args: ['--disable-animations', '--disable-gpu-vsync'],
        },
      },
      expect: {
        toHaveScreenshot: {
          maxDiffPixels: 100,
          maxDiffPixelRatio: 0.002,
          animations: 'disabled',
          caret: 'hide',
        },
      },
      snapshotPathTemplate:
        '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
    },
    // Regular E2E test projects
    // Only run chromium for both CI and local - CI workflow only installs chromium
    {
      name: 'chromium',
      testIgnore: /.*\.visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Global timeout for each test - increased for CI reliability */
  timeout: process.env.CI ? 90 * 1000 : 60 * 1000,

  /* Global timeout for expect assertions - increased for CI reliability */
  expect: {
    timeout: process.env.CI ? 15 * 1000 : 10 * 1000,
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: './tests/e2e/setup/global-setup.ts',
  globalTeardown: './tests/e2e/setup/global-teardown.ts',
});
