# Testing Strategy Overview

Comprehensive testing approach for Destino SF ensuring reliability, performance, and user experience across all platform features.

## Testing Philosophy

Our testing strategy follows the testing pyramid principle with emphasis on:
- **Fast Feedback**: Unit tests provide immediate feedback during development
- **Confidence**: Integration tests ensure components work together
- **User Experience**: E2E tests validate complete user workflows
- **Performance**: Load tests ensure scalability under traffic

## Testing Pyramid

```
    🔺 E2E Tests (10%)
      Browser automation testing
      Critical user journeys
      Cross-browser compatibility

  🔻 Integration Tests (20%)
    API endpoint testing
    Database integration
    External service mocking

🔻🔻 Unit Tests (70%)
  Component testing
  Utility function testing
  Business logic validation
```

## Test Types and Coverage

### Unit Testing (70% of test suite)
- **Target Coverage**: 85%+ code coverage
- **Focus Areas**: Business logic, utilities, pure functions
- **Tools**: Jest, React Testing Library
- **Run Time**: < 30 seconds for full suite

### Integration Testing (20% of test suite)
- **API Testing**: All endpoints with various scenarios
- **Database Testing**: CRUD operations and data integrity
- **Service Integration**: External API mocking and contracts
- **Run Time**: < 2 minutes for full suite

### End-to-End Testing (10% of test suite)
- **Critical Paths**: Purchase flow, catering inquiries, admin operations
- **Browser Coverage**: Chrome, Firefox, Safari, Mobile browsers
- **Tools**: Playwright
- **Run Time**: < 10 minutes for critical suite

## Testing Framework and Tools

### Frontend Testing
```typescript
// Jest configuration for React components
module.exports = {
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: ['<rootDir>/src/__tests__/components/**/*.test.{ts,tsx}'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};

// React Testing Library example
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductCard } from '@/components/products/ProductCard';

describe('ProductCard', () => {
  it('displays product information correctly', () => {
    const product = mockProduct();
    render(<ProductCard product={product} />);
    
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(`$${product.price}`)).toBeInTheDocument();
  });

  it('handles add to cart action', async () => {
    const onAddToCart = jest.fn();
    const product = mockProduct();
    
    render(<ProductCard product={product} onAddToCart={onAddToCart} />);
    
    fireEvent.click(screen.getByText('Add to Cart'));
    
    await waitFor(() => {
      expect(onAddToCart).toHaveBeenCalledWith(product.id, 1);
    });
  });
});
```

### Backend API Testing
```typescript
// API route testing with Next.js
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/products/route';

describe('/api/products', () => {
  it('returns products with pagination', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '1', limit: '12' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(12);
    expect(data.meta.total).toBeGreaterThan(0);
  });

  it('validates required fields for POST requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: '' }, // Invalid data
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(422);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Database Testing
```typescript
// Prisma testing setup
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

beforeEach(async () => {
  // Reset database state
  execSync('pnpm prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
});

describe('Product Database Operations', () => {
  it('creates a product with valid data', async () => {
    const productData = {
      name: 'Test Empanadas',
      price: 24.99,
      categoryId: 'cat_pastries',
    };

    const product = await prisma.product.create({
      data: productData,
    });

    expect(product.id).toBeDefined();
    expect(product.name).toBe(productData.name);
    expect(product.price).toBe(productData.price);
  });
});
```

## End-to-End Testing with Playwright

### Critical User Journeys
```typescript
// Complete purchase flow test
import { test, expect } from '@playwright/test';

test.describe('Complete Purchase Flow', () => {
  test('customer can complete a purchase successfully', async ({ page }) => {
    // Navigate to product page
    await page.goto('/products/empanadas-beef');
    
    // Add product to cart
    await page.click('[data-testid="add-to-cart-btn"]');
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
    
    // Proceed to checkout
    await page.click('[data-testid="checkout-btn"]');
    
    // Fill shipping information
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="address"]', '123 Test St');
    await page.fill('[data-testid="city"]', 'San Francisco');
    await page.selectOption('[data-testid="state"]', 'CA');
    await page.fill('[data-testid="zip"]', '94105');
    
    // Continue to payment
    await page.click('[data-testid="continue-to-payment"]');
    
    // Fill payment information (using test card)
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvv"]', '123');
    
    // Complete order
    await page.click('[data-testid="place-order"]');
    
    // Verify order confirmation
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toContainText(/ORDER-\d+/);
  });
});
```

### Catering Flow Testing
```typescript
test.describe('Catering Inquiry Flow', () => {
  test('business customer can submit catering inquiry', async ({ page }) => {
    await page.goto('/catering');
    
    // Fill event details
    await page.fill('[data-testid="guest-count"]', '50');
    await page.selectOption('[data-testid="event-type"]', 'CORPORATE');
    await page.fill('[data-testid="event-date"]', '2025-03-15');
    
    // Fill contact information
    await page.fill('[data-testid="contact-name"]', 'Jane Smith');
    await page.fill('[data-testid="contact-email"]', 'jane@company.com');
    await page.fill('[data-testid="contact-phone"]', '(555) 123-4567');
    
    // Fill delivery address
    await page.fill('[data-testid="delivery-address"]', '456 Business Ave');
    await page.fill('[data-testid="delivery-city"]', 'San Francisco');
    await page.selectOption('[data-testid="delivery-state"]', 'CA');
    await page.fill('[data-testid="delivery-zip"]', '94107');
    
    // Submit inquiry
    await page.click('[data-testid="submit-inquiry"]');
    
    // Verify confirmation
    await expect(page.locator('[data-testid="inquiry-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="inquiry-id"]')).toContainText(/INQ-\d+/);
  });
});
```

## Test Data Management

### Fixtures and Mocks
```typescript
// Test data factories
export const mockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod_test_123',
  name: 'Test Empanadas',
  description: 'Delicious beef empanadas',
  price: 24.99,
  categoryId: 'cat_pastries',
  images: [
    {
      id: 'img_1',
      url: '/test-images/empanadas.jpg',
      alt: 'Beef empanadas',
      order: 1,
    },
  ],
  inventory: {
    inStock: true,
    quantity: 50,
    lowStockThreshold: 10,
  },
  packageSizes: [
    {
      id: 'size_dozen',
      name: 'Dozen',
      servingSize: 12,
      priceMultiplier: 1,
      isDefault: true,
    },
  ],
  tags: ['beef', 'pastry', 'frozen'],
  allergens: ['gluten', 'egg'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order_test_123',
  orderNumber: 'ORDER-12345',
  status: OrderStatus.PENDING,
  customerInfo: {
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '(555) 123-4567',
  },
  items: [
    {
      id: 'item_1',
      productId: 'prod_test_123',
      quantity: 2,
      packageSize: 'DOZEN',
      unitPrice: 24.99,
      totalPrice: 49.98,
    },
  ],
  subtotal: 49.98,
  tax: 4.50,
  shipping: 8.99,
  total: 63.47,
  paymentStatus: PaymentStatus.PENDING,
  shippingAddress: {
    street: '123 Test St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'US',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
```

### Database Seeding for Tests
```typescript
// Test database seeding
export async function seedTestDatabase() {
  // Clean existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // Create test categories
  const categories = await prisma.category.createMany({
    data: [
      { id: 'cat_pastries', name: 'Pastries', slug: 'pastries' },
      { id: 'cat_meats', name: 'Meats', slug: 'meats' },
      { id: 'cat_beverages', name: 'Beverages', slug: 'beverages' },
    ],
  });

  // Create test products
  const products = await prisma.product.createMany({
    data: [
      {
        id: 'prod_empanadas_beef',
        name: 'Beef Empanadas',
        price: 24.99,
        categoryId: 'cat_pastries',
        description: 'Traditional Argentine beef empanadas',
      },
      {
        id: 'prod_asado_mixed',
        name: 'Mixed Asado Pack',
        price: 89.99,
        categoryId: 'cat_meats',
        description: 'Premium mixed grill selection',
      },
    ],
  });

  return { categories, products };
}
```

## Performance Testing

### Load Testing with Artillery
```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warm up
    - duration: 120
      arrivalRate: 10
      name: Sustained load
    - duration: 60
      arrivalRate: 20
      name: Peak load

scenarios:
  - name: "Product browsing"
    weight: 70
    flow:
      - get:
          url: "/api/products"
      - get:
          url: "/api/products/{{ $randomString() }}"
      
  - name: "Checkout flow"
    weight: 20
    flow:
      - post:
          url: "/api/cart"
          json:
            productId: "prod_empanadas_beef"
            quantity: 2
      - post:
          url: "/api/checkout"
          json:
            paymentMethodId: "pm_test"
            
  - name: "Catering inquiry"
    weight: 10
    flow:
      - post:
          url: "/api/catering"
          json:
            guestCount: 25
            eventType: "CORPORATE"
```

## Continuous Integration Testing

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:components
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm prisma migrate deploy
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm playwright install
      - run: pnpm build
      - run: pnpm test:e2e:critical
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Commands Reference

### Development Testing
```bash
# Unit tests
pnpm test:unit                    # Run all unit tests
pnpm test:unit:watch             # Watch mode for unit tests
pnpm test:components             # React component tests
pnpm test:components:watch       # Watch mode for components

# Integration tests
pnpm test:integration            # API and database tests
pnpm test:api                    # API endpoint tests only

# End-to-end tests
pnpm test:e2e                    # Full E2E suite
pnpm test:e2e:critical          # Critical path tests only
pnpm test:e2e:headed            # Run with browser visible
pnpm test:e2e:debug             # Debug mode

# Coverage and reporting
pnpm test:coverage               # Generate coverage report
pnpm test:ci                     # CI-optimized test run
```

### Production Testing
```bash
# Pre-deployment validation
pnpm test:pre-deploy             # Critical tests before deploy
pnpm test:staging                # Integration tests against staging
pnpm test:e2e:smoke-production   # Smoke tests on production

# Performance testing
pnpm test:performance            # Performance benchmarks
pnpm test:accessibility          # Accessibility validation
```

## Quality Gates

### Code Coverage Requirements
- **Minimum Coverage**: 80% overall
- **Critical Paths**: 95% coverage required
- **New Code**: Must maintain or improve coverage
- **Components**: 85% coverage for React components

### Performance Benchmarks
- **Page Load Time**: < 2 seconds (LCP)
- **API Response Time**: < 500ms for 95th percentile
- **Test Suite Runtime**: < 15 minutes total
- **Bundle Size**: < 250KB main bundle

### Accessibility Standards
- **WCAG Compliance**: AA level minimum
- **Keyboard Navigation**: Full functionality without mouse
- **Screen Reader**: Compatible with major screen readers
- **Color Contrast**: 4.5:1 minimum ratio

## Testing Best Practices

### Writing Effective Tests
1. **Test Behavior, Not Implementation**: Focus on what the code does, not how
2. **Use Descriptive Names**: Test names should explain the scenario clearly
3. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
4. **Test Edge Cases**: Include boundary conditions and error scenarios
5. **Keep Tests Independent**: Each test should run in isolation

### Maintaining Test Suite
1. **Regular Test Reviews**: Review and update tests during code reviews
2. **Flaky Test Management**: Identify and fix unreliable tests promptly
3. **Test Data Management**: Keep test data current and representative
4. **Performance Monitoring**: Monitor and optimize test execution time

## Related Documentation

- [Unit Testing Guide](unit-testing.md)
- [Integration Testing Guide](integration-testing.md)
- [E2E Testing Setup](e2e-testing/README.md)
- [Playwright Configuration](e2e-testing/playwright-setup.md)
- [Production Testing](production-testing.md)

---

A robust testing strategy ensures Destino SF delivers reliable, high-quality experiences for both customers and business users while maintaining development velocity and confidence in deployments.
