# Integration Testing Guide

Comprehensive guide for integration testing in Destino SF, covering API endpoints, database operations, and external service integrations.

## Overview

Integration tests verify that different parts of the system work together correctly, including API routes, database operations, and external service integrations like Square and Shippo.

## Test Environment Setup

### Database Configuration

```typescript
// tests/setup/database.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

export async function setupTestDatabase() {
  // Reset database schema
  execSync('pnpm prisma migrate reset --force --skip-seed', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  });

  // Run migrations
  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  });

  // Seed test data
  await seedTestData();
}

export async function cleanupTestDatabase() {
  await prisma.$disconnect();
}

async function seedTestData() {
  // Create test categories
  await prisma.category.createMany({
    data: [
      { id: 'cat_pastries', name: 'Pastries', slug: 'pastries' },
      { id: 'cat_meats', name: 'Meats', slug: 'meats' },
      { id: 'cat_beverages', name: 'Beverages', slug: 'beverages' },
    ],
  });

  // Create test products
  await prisma.product.createMany({
    data: [
      {
        id: 'prod_empanadas_beef',
        name: 'Beef Empanadas',
        price: 24.99,
        categoryId: 'cat_pastries',
        description: 'Traditional Argentine beef empanadas',
        squareItemId: 'sq_beef_empanadas',
      },
      {
        id: 'prod_asado_mixed',
        name: 'Mixed Asado Pack',
        price: 89.99,
        categoryId: 'cat_meats',
        description: 'Premium mixed grill selection',
        squareItemId: 'sq_mixed_asado',
      },
    ],
  });
}

export { prisma };
```

### Test Configuration

```typescript
// jest.config.integration.ts
import type { Config } from 'jest';

const config: Config = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.ts'],
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
};

export default config;
```

## API Route Testing

### Products API Integration Tests

```typescript
// src/__tests__/integration/api/products.test.ts
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { prisma, setupTestDatabase, cleanupTestDatabase } from '@/tests/setup/database';

describe('Products API Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/products', () => {
    it('returns products with correct pagination', async () => {
      const response = await fetch('http://localhost:3000/api/products?page=1&limit=12');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.meta).toMatchObject({
        page: 1,
        limit: 12,
        total: expect.any(Number),
      });
    });

    it('filters products by category', async () => {
      const response = await fetch('http://localhost:3000/api/products?category=pastries');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((product: any) => product.category.slug === 'pastries')).toBe(true);
    });

    it('searches products by name', async () => {
      const response = await fetch('http://localhost:3000/api/products/search?q=empanadas');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.data.every((product: any) => product.name.toLowerCase().includes('empanadas'))
      ).toBe(true);
    });
  });

  describe('GET /api/products/[id]', () => {
    it('returns single product with full details', async () => {
      const response = await fetch('http://localhost:3000/api/products/prod_empanadas_beef');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 'prod_empanadas_beef',
        name: 'Beef Empanadas',
        price: 24.99,
        category: expect.objectContaining({
          name: 'Pastries',
          slug: 'pastries',
        }),
        images: expect.any(Array),
        packageSizes: expect.any(Array),
      });
    });

    it('returns 404 for non-existent product', async () => {
      const response = await fetch('http://localhost:3000/api/products/non-existent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });
});
```

## Database Integration Testing

### Product Management Tests

```typescript
// src/__tests__/integration/database/products.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProductService } from '@/lib/services/ProductService';
import { prisma } from '@/tests/setup/database';

describe('Product Database Integration', () => {
  let productService: ProductService;

  beforeEach(async () => {
    await setupTestDatabase();
    productService = new ProductService();
  });

  describe('Product CRUD Operations', () => {
    it('creates product with all relations', async () => {
      const productData = {
        name: 'New Test Product',
        description: 'Test description',
        price: 19.99,
        categoryId: 'cat_pastries',
        images: [
          {
            url: '/test-images/new-product.jpg',
            alt: 'New product image',
            order: 1,
          },
        ],
        packageSizes: [
          {
            name: 'Half Dozen',
            servingSize: 6,
            priceMultiplier: 0.6,
            isDefault: true,
          },
        ],
        tags: ['new', 'test'],
        allergens: ['gluten'],
      };

      const product = await productService.create(productData);

      expect(product).toBeDefined();
      expect(product.name).toBe(productData.name);
      expect(product.images).toHaveLength(1);
      expect(product.packageSizes).toHaveLength(1);

      // Verify database state
      const dbProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          images: true,
          packageSizes: true,
          category: true,
        },
      });

      expect(dbProduct?.images).toHaveLength(1);
      expect(dbProduct?.packageSizes).toHaveLength(1);
      expect(dbProduct?.category.name).toBe('Pastries');
    });

    it('updates product and maintains referential integrity', async () => {
      const product = await productService.findById('prod_empanadas_beef');
      expect(product).toBeDefined();

      const updateData = {
        name: 'Updated Beef Empanadas',
        price: 26.99,
        images: [
          {
            url: '/updated-images/empanadas.jpg',
            alt: 'Updated empanadas',
            order: 1,
          },
        ],
      };

      const updatedProduct = await productService.update(product!.id, updateData);

      expect(updatedProduct.name).toBe(updateData.name);
      expect(updatedProduct.price).toBe(updateData.price);
      expect(updatedProduct.images).toHaveLength(1);
      expect(updatedProduct.images[0].url).toBe(updateData.images[0].url);

      // Verify old images were removed
      const oldImages = await prisma.productImage.findMany({
        where: {
          productId: product!.id,
          url: { not: updateData.images[0].url },
        },
      });
      expect(oldImages).toHaveLength(0);
    });

    it('deletes product and cascades relations', async () => {
      const productId = 'prod_empanadas_beef';

      // Verify product exists with relations
      const beforeDelete = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true, packageSizes: true },
      });
      expect(beforeDelete).toBeDefined();

      await productService.delete(productId);

      // Verify product and relations are deleted
      const afterDelete = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(afterDelete).toBeNull();

      const orphanedImages = await prisma.productImage.findMany({
        where: { productId },
      });
      expect(orphanedImages).toHaveLength(0);

      const orphanedSizes = await prisma.packageSize.findMany({
        where: { productId },
      });
      expect(orphanedSizes).toHaveLength(0);
    });
  });

  describe('Product Search and Filtering', () => {
    it('filters products by multiple criteria', async () => {
      const filters = {
        categoryId: 'cat_pastries',
        priceMin: 20,
        priceMax: 30,
        inStock: true,
      };

      const products = await productService.findMany(filters);

      expect(products.every(p => p.categoryId === 'cat_pastries')).toBe(true);
      expect(products.every(p => p.price >= 20 && p.price <= 30)).toBe(true);
      expect(products.every(p => p.inventory.inStock)).toBe(true);
    });

    it('searches products with full-text search', async () => {
      const searchResults = await productService.search('beef empanadas');

      expect(searchResults.length).toBeGreaterThan(0);
      expect(
        searchResults.some(
          p => p.name.toLowerCase().includes('beef') && p.name.toLowerCase().includes('empanadas')
        )
      ).toBe(true);
    });

    it('returns products with pagination', async () => {
      const page1 = await productService.findMany({}, { page: 1, limit: 1 });
      const page2 = await productService.findMany({}, { page: 2, limit: 1 });

      expect(page1.data).toHaveLength(1);
      expect(page2.data).toHaveLength(1);
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
      expect(page1.meta.total).toBe(page2.meta.total);
    });
  });
});
```

## External Service Integration

### Square Integration Tests

```typescript
// src/__tests__/integration/services/square.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SquareService } from '@/lib/services/SquareService';
import { mockSquareClient } from '@/__tests__/mocks/square';

// Mock Square SDK
jest.mock('square', () => ({
  Client: jest.fn(() => mockSquareClient),
  Environment: {
    Sandbox: 'sandbox',
    Production: 'production',
  },
}));

describe('Square Service Integration', () => {
  let squareService: SquareService;

  beforeEach(() => {
    jest.clearAllMocks();
    squareService = new SquareService();
  });

  describe('Payment Processing', () => {
    it('creates payment successfully', async () => {
      const mockPayment = {
        id: 'payment_123',
        status: 'COMPLETED',
        amountMoney: { amount: 2499, currency: 'USD' },
        sourceType: 'CARD',
      };

      mockSquareClient.paymentsApi.createPayment.mockResolvedValue({
        result: { payment: mockPayment },
      });

      const paymentRequest = {
        sourceId: 'card_nonce_123',
        amountMoney: { amount: 2499, currency: 'USD' },
        idempotencyKey: 'unique_key_123',
      };

      const result = await squareService.createPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment).toMatchObject(mockPayment);
      expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalledWith({
        body: paymentRequest,
      });
    });

    it('handles payment failures', async () => {
      const mockError = {
        errors: [
          {
            code: 'CARD_DECLINED',
            detail: 'The card was declined.',
          },
        ],
      };

      mockSquareClient.paymentsApi.createPayment.mockRejectedValue(mockError);

      const paymentRequest = {
        sourceId: 'invalid_card_nonce',
        amountMoney: { amount: 2499, currency: 'USD' },
        idempotencyKey: 'unique_key_456',
      };

      const result = await squareService.createPayment(paymentRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('CARD_DECLINED');
    });
  });

  describe('Catalog Integration', () => {
    it('syncs products from Square catalog', async () => {
      const mockCatalogItems = [
        {
          id: 'sq_item_1',
          itemData: {
            name: 'Square Empanadas',
            description: 'From Square catalog',
            variations: [
              {
                id: 'sq_var_1',
                itemVariationData: {
                  priceMoney: { amount: 2499, currency: 'USD' },
                },
              },
            ],
          },
        },
      ];

      mockSquareClient.catalogApi.searchCatalogItems.mockResolvedValue({
        result: { items: mockCatalogItems },
      });

      const syncResult = await squareService.syncProducts();

      expect(syncResult.success).toBe(true);
      expect(syncResult.synced).toBeGreaterThan(0);
      expect(mockSquareClient.catalogApi.searchCatalogItems).toHaveBeenCalled();

      // Verify products were created in database
      const product = await prisma.product.findFirst({
        where: { squareItemId: 'sq_item_1' },
      });
      expect(product).toBeDefined();
      expect(product?.name).toBe('Square Empanadas');
    });

    it('handles catalog sync errors gracefully', async () => {
      mockSquareClient.catalogApi.searchCatalogItems.mockRejectedValue(
        new Error('Square API error')
      );

      const syncResult = await squareService.syncProducts();

      expect(syncResult.success).toBe(false);
      expect(syncResult.error).toContain('Square API error');
    });
  });
});
```

### Shippo Integration Tests

```typescript
// src/__tests__/integration/services/shippo.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ShippoService } from '@/lib/services/ShippoService';
import { mockShippoClient } from '@/__tests__/mocks/shippo';

jest.mock('shippo', () => ({
  __esModule: true,
  default: jest.fn(() => mockShippoClient),
}));

describe('Shippo Service Integration', () => {
  let shippoService: ShippoService;

  beforeEach(() => {
    jest.clearAllMocks();
    shippoService = new ShippoService();
  });

  describe('Shipping Rate Calculation', () => {
    it('calculates shipping rates successfully', async () => {
      const mockRates = [
        {
          object_id: 'rate_1',
          provider: 'USPS',
          servicelevel: { name: 'Priority Mail' },
          amount: '8.99',
          currency: 'USD',
          estimated_days: 2,
        },
        {
          object_id: 'rate_2',
          provider: 'UPS',
          servicelevel: { name: 'Ground' },
          amount: '12.50',
          currency: 'USD',
          estimated_days: 5,
        },
      ];

      mockShippoClient.shipment.create.mockResolvedValue({
        rates: mockRates,
      });

      const shipmentData = {
        addressFrom: {
          street1: '123 Warehouse St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94105',
          country: 'US',
        },
        addressTo: {
          street1: '456 Customer Ave',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          country: 'US',
        },
        parcels: [
          {
            length: '10',
            width: '8',
            height: '4',
            weight: '2',
            distance_unit: 'in',
            mass_unit: 'lb',
          },
        ],
      };

      const result = await shippoService.getRates(shipmentData);

      expect(result.success).toBe(true);
      expect(result.rates).toHaveLength(2);
      expect(result.rates[0]).toMatchObject({
        id: 'rate_1',
        provider: 'USPS',
        service: 'Priority Mail',
        amount: 8.99,
        estimatedDays: 2,
      });
    });

    it('handles rate calculation errors', async () => {
      mockShippoClient.shipment.create.mockRejectedValue(new Error('Invalid address'));

      const result = await shippoService.getRates({} as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid address');
    });
  });

  describe('Label Generation', () => {
    it('creates shipping label successfully', async () => {
      const mockTransaction = {
        object_id: 'transaction_1',
        status: 'SUCCESS',
        label_url: 'https://shippo.com/label_123.pdf',
        tracking_number: '1Z999AA1234567890',
      };

      mockShippoClient.transaction.create.mockResolvedValue(mockTransaction);

      const result = await shippoService.createLabel('rate_1');

      expect(result.success).toBe(true);
      expect(result.label).toMatchObject({
        id: 'transaction_1',
        labelUrl: 'https://shippo.com/label_123.pdf',
        trackingNumber: '1Z999AA1234567890',
      });
    });
  });
});
```

## End-to-End API Testing

### Complete Order Flow Test

```typescript
// src/__tests__/integration/flows/complete-order.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { setupTestDatabase } from '@/tests/setup/database';

describe('Complete Order Flow Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it('completes full order workflow', async () => {
    // 1. Get available products
    const productsResponse = await fetch('http://localhost:3000/api/products');
    const productsData = await productsResponse.json();

    expect(productsResponse.status).toBe(200);
    expect(productsData.data.length).toBeGreaterThan(0);

    const product = productsData.data[0];

    // 2. Calculate shipping rates
    const shippingRequest = {
      items: [{ productId: product.id, quantity: 2 }],
      address: {
        street: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'US',
      },
    };

    const shippingResponse = await fetch('http://localhost:3000/api/shipping/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shippingRequest),
    });

    const shippingData = await shippingResponse.json();
    expect(shippingResponse.status).toBe(200);
    expect(shippingData.rates.length).toBeGreaterThan(0);

    // 3. Create order
    const orderRequest = {
      items: [
        {
          productId: product.id,
          quantity: 2,
          packageSize: product.packageSizes[0].id,
        },
      ],
      customerInfo: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '(555) 123-4567',
      },
      shippingAddress: shippingRequest.address,
      shippingRateId: shippingData.rates[0].id,
      paymentMethodId: 'pm_test_card',
    };

    const orderResponse = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderRequest),
    });

    const orderData = await orderResponse.json();
    expect(orderResponse.status).toBe(201);
    expect(orderData.success).toBe(true);

    const order = orderData.data;
    expect(order.id).toBeDefined();
    expect(order.orderNumber).toMatch(/^ORDER-\d+$/);
    expect(order.status).toBe('PENDING');

    // 4. Verify order can be retrieved
    const getOrderResponse = await fetch(`http://localhost:3000/api/orders/${order.id}`);
    const getOrderData = await getOrderResponse.json();

    expect(getOrderResponse.status).toBe(200);
    expect(getOrderData.data.id).toBe(order.id);
    expect(getOrderData.data.items.length).toBe(1);

    // 5. Simulate order processing
    const updateOrderResponse = await fetch(`http://localhost:3000/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });

    const updateOrderData = await updateOrderResponse.json();
    expect(updateOrderResponse.status).toBe(200);
    expect(updateOrderData.data.status).toBe('CONFIRMED');
  });
});
```

## Performance and Load Testing

### Database Performance Tests

```typescript
// src/__tests__/integration/performance/database.test.ts
import { describe, it, expect } from '@jest/globals';
import { performance } from 'perf_hooks';

describe('Database Performance Integration', () => {
  it('handles concurrent product queries efficiently', async () => {
    const concurrentQueries = 50;
    const startTime = performance.now();

    const promises = Array.from({ length: concurrentQueries }, (_, i) =>
      fetch(`http://localhost:3000/api/products?page=${(i % 5) + 1}&limit=12`)
    );

    const responses = await Promise.all(promises);
    const endTime = performance.now();

    const executionTime = endTime - startTime;
    const averageResponseTime = executionTime / concurrentQueries;

    expect(responses.every(r => r.status === 200)).toBe(true);
    expect(averageResponseTime).toBeLessThan(500); // 500ms average
    expect(executionTime).toBeLessThan(10000); // 10s total
  });

  it('maintains performance under order creation load', async () => {
    const concurrentOrders = 10;
    const orderData = {
      items: [
        {
          productId: 'prod_empanadas_beef',
          quantity: 1,
          packageSize: 'DOZEN',
        },
      ],
      customerInfo: {
        email: 'load-test@example.com',
        firstName: 'Load',
        lastName: 'Test',
      },
      shippingAddress: {
        street: '123 Load Test St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'US',
      },
      paymentMethodId: 'pm_test_card',
    };

    const startTime = performance.now();

    const promises = Array.from({ length: concurrentOrders }, (_, i) =>
      fetch('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          customerInfo: {
            ...orderData.customerInfo,
            email: `load-test-${i}@example.com`,
          },
        }),
      })
    );

    const responses = await Promise.all(promises);
    const endTime = performance.now();

    const executionTime = endTime - startTime;
    const averageResponseTime = executionTime / concurrentOrders;

    expect(responses.every(r => r.status === 201)).toBe(true);
    expect(averageResponseTime).toBeLessThan(2000); // 2s average for order creation
  });
});
```

## Test Commands and Scripts

### Running Integration Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific integration test suites
pnpm test:integration api
pnpm test:integration database
pnpm test:integration services

# Run integration tests with coverage
pnpm test:integration --coverage

# Run integration tests against staging
pnpm test:staging
```

### CI/CD Integration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: destino_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install

      - name: Set up test database
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/destino_test
        run: |
          pnpm prisma migrate deploy
          pnpm db:seed

      - name: Run integration tests
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/destino_test
          SQUARE_ACCESS_TOKEN: ${{ secrets.SQUARE_TEST_TOKEN }}
          SHIPPO_TOKEN: ${{ secrets.SHIPPO_TEST_TOKEN }}
        run: pnpm test:integration
```

## Best Practices

### Test Isolation

- Use separate test database for each test run
- Clean database state between tests
- Mock external services consistently
- Use transactions for test data cleanup

### Error Handling

- Test both success and failure scenarios
- Verify error messages and status codes
- Test network failure scenarios
- Validate input sanitization

### Performance Considerations

- Monitor test execution time
- Use database indexes for test queries
- Limit test data size
- Run tests in parallel where possible

## Related Documentation

- [Testing Strategy](testing-strategy.md) - Overall testing approach
- [Unit Testing](unit-testing.md) - Component and function testing
- [E2E Testing](e2e-testing/README.md) - Browser automation testing
- [Production Testing](production-testing.md) - Live environment testing

---

Integration tests ensure that different parts of the Destino SF system work together correctly, providing confidence in the complete functionality before deployment to production.
