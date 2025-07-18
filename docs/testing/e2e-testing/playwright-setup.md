# 🎭 Playwright Setup Guide - Destino SF

## 📋 Overview
This guide covers the setup, configuration, and best practices for Playwright testing in the Destino SF project.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- Next.js application running locally

### Installation
```bash
# Install Playwright dependencies (already included in project)
pnpm install

# Install browser binaries
pnpm exec playwright install

# Install system dependencies (Linux/CI only)
pnpm exec playwright install-deps
```

## ⚙️ Configuration

### Playwright Configuration (`playwright.config.ts`)
Our configuration supports multiple environments and device types:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Environment Variables
Create a `.env.test` file:

```bash
# Application
NODE_ENV=test
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database (use test database)
DATABASE_URL=postgresql://user:password@localhost:5432/destino_test

# Square Sandbox
SQUARE_APPLICATION_ID=sandbox_app_id
SQUARE_ACCESS_TOKEN=sandbox_access_token
SQUARE_ENVIRONMENT=sandbox

# Email Testing
RESEND_API_KEY=test_key
```

## 📁 Test Structure

### Directory Organization
```
tests/
├── e2e/                     # End-to-end tests
│   ├── 01-complete-purchase.spec.ts
│   ├── 02-cart-management.spec.ts
│   ├── 04-catering-inquiry.spec.ts
│   ├── fixtures/            # Test data
│   │   ├── test-data.ts
│   │   └── index.ts
│   ├── setup/              # Test setup utilities
│   │   ├── global-setup.ts
│   │   └── database-setup.ts
│   └── utils/              # Test helpers
│       └── test-helpers.ts
```

### Test Naming Convention
- `01-`, `02-`, etc. for execution order
- Descriptive names indicating the test purpose
- `.spec.ts` extension for test files

## 🧪 Writing Tests

### Test Structure Best Practices

```typescript
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await TestHelpers.clearCart(page);
  });

  test('should perform specific action', async ({ page }) => {
    // Arrange
    await page.goto('/target-page');
    
    // Act
    await page.click('[data-testid="action-button"]');
    
    // Assert
    await expect(page.getByText('Success message')).toBeVisible();
  });
});
```

### Data Test IDs
Use consistent `data-testid` attributes:

```html
<!-- Good -->
<button data-testid="add-to-cart">Add to Cart</button>
<div data-testid="cart-total">$25.99</div>
<input data-testid="email-input" type="email" />

<!-- Avoid -->
<button id="btn-123">Add to Cart</button>
<div class="price-display">$25.99</div>
```

### Test Helpers
Create reusable functions for common actions:

```typescript
export class TestHelpers {
  static async clearCart(page: Page) {
    await page.evaluate(() => {
      localStorage.removeItem('cart');
    });
  }

  static async addProductToCart(page: Page, productSlug: string, quantity = 1) {
    await page.goto(`/products/${productSlug}`);
    
    if (quantity > 1) {
      await page.fill('[data-testid="quantity-input"]', quantity.toString());
    }
    
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.getByText('Added to cart')).toBeVisible();
  }

  static async completeCheckout(page: Page, options: CheckoutOptions) {
    // Fill in customer details
    await page.fill('[data-testid="email-input"]', options.email);
    await page.fill('[data-testid="phone-input"]', options.phone);
    
    // Select delivery/pickup
    await page.click(`[data-testid="${options.deliveryType}"]`);
    
    // Complete payment
    await page.click('[data-testid="place-order"]');
  }
}
```

## 🚀 Running Tests

### Local Development
```bash
# Run all tests
pnpm test:e2e

# Run with browser UI
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug mode
pnpm test:e2e:debug

# Run specific test file
pnpm exec playwright test tests/e2e/01-complete-purchase.spec.ts

# Run tests matching pattern
pnpm exec playwright test --grep "purchase"
```

### Critical Tests Only
```bash
# Run only business-critical tests
pnpm test:e2e:critical

# Mobile-specific tests
pnpm test:e2e:mobile
```

### CI/CD Integration
```bash
# CI-optimized run
pnpm test:e2e:ci

# Generate JUnit reports
pnpm exec playwright test --reporter=junit
```

## 📊 Test Reports

### HTML Reports
```bash
# Generate and view HTML report
pnpm test:e2e:report
```

### Screenshots and Videos
- Screenshots: Captured on test failure
- Videos: Recorded for failed tests
- Traces: Available for debugging

### Artifacts Location
```
test-results/
├── screenshots/
├── videos/
├── traces/
└── reports/
```

## 🔧 Debugging

### Visual Debugging
```bash
# Open test in debug mode
pnpm test:e2e:debug

# Pause on specific test
pnpm exec playwright test --debug --grep "specific test"
```

### Browser Developer Tools
```typescript
// Add debugging breakpoints in tests
await page.pause(); // Stops execution
await page.screenshot({ path: 'debug.png' }); // Manual screenshot
```

### Trace Viewer
```bash
# View trace for failed test
pnpm exec playwright show-trace test-results/trace.zip
```

## 🌐 Cross-Browser Testing

### Desktop Browsers
- **Chrome**: Primary browser for development
- **Firefox**: Secondary browser support
- **Safari**: macOS/iOS compatibility
- **Edge**: Windows compatibility

### Mobile Testing
- **Mobile Chrome**: Android devices
- **Mobile Safari**: iOS devices

### Running Specific Browsers
```bash
# Run on specific browser
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project="Mobile Chrome"

# Run on multiple browsers
pnpm exec playwright test --project=chromium --project=firefox
```

## 🎯 Best Practices

### Test Isolation
- Each test should be independent
- Clean state before each test
- Use unique test data

### Reliable Selectors
1. `data-testid` attributes (preferred)
2. Semantic selectors (`getByRole`, `getByText`)
3. CSS selectors (as last resort)

### Async Handling
```typescript
// Wait for elements
await expect(page.getByText('Loading...')).toBeHidden();
await expect(page.getByText('Content loaded')).toBeVisible();

// Wait for network requests
await page.waitForResponse('**/api/orders');

// Wait for navigation
await page.waitForURL('**/order-confirmation');
```

### Error Handling
```typescript
test('should handle errors gracefully', async ({ page }) => {
  // Test error scenarios
  await page.route('**/api/checkout', route => 
    route.fulfill({ status: 500 })
  );
  
  await page.click('[data-testid="checkout-button"]');
  await expect(page.getByText('Error processing order')).toBeVisible();
});
```

## 🔍 Performance Testing

### Metrics to Monitor
- Page load times
- Time to interactive
- Largest contentful paint
- Core web vitals

### Performance Assertions
```typescript
test('should load quickly', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - start;
  
  expect(loadTime).toBeLessThan(3000); // 3 seconds max
});
```

## 📋 Maintenance Checklist

### Weekly
- [ ] Run full test suite
- [ ] Check for flaky tests
- [ ] Update test data if needed
- [ ] Review test execution times

### Monthly
- [ ] Update Playwright version
- [ ] Review test coverage
- [ ] Optimize slow tests
- [ ] Update browser versions

### Before Deployment
- [ ] All critical tests pass
- [ ] Cross-browser validation
- [ ] Mobile testing complete
- [ ] Performance benchmarks met

---

*This guide should be updated as the testing strategy evolves.* 