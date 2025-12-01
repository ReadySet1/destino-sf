import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual regression tests ONLY.
 * This config does NOT include global database setup/teardown
 * since visual tests only need to render UI components.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e/visual',
  /* Only match visual test files */
  testMatch: /.*\.visual\.spec\.ts/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests for better reliability */
  retries: process.env.CI ? 2 : 1,
  /* Parallel workers */
  workers: process.env.CI ? 2 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'off',

    /* Take screenshot only on failures */
    screenshot: 'on',

    /* No video for visual tests */
    video: 'off',

    /* Global timeout for all actions */
    actionTimeout: 15 * 1000,

    /* Global timeout for navigation */
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for visual regression testing */
  projects: [
    {
      name: 'visual-regression-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
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
        },
      },
      snapshotPathTemplate:
        '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
    },
    {
      name: 'visual-regression-mobile',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 667 },
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
  ],

  /* Global timeout for each test */
  timeout: 60 * 1000,

  /* Global timeout for expect assertions */
  expect: {
    timeout: 10 * 1000,
  },

  /* Use existing dev server - do NOT start a new one */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse to avoid conflicts
    timeout: 120 * 1000,
  },

  /* NO global setup/teardown - visual tests don't need database */
});
