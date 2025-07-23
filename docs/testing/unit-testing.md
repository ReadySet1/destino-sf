# Unit Testing Guide

Comprehensive guide for writing and maintaining unit tests in the Destino SF platform using Jest and React Testing Library.

## Overview

Unit tests form the foundation of our testing strategy, providing fast feedback and ensuring individual components and functions work correctly in isolation.

## Setup and Configuration

### Jest Configuration

Our Jest setup uses multiple projects to handle different testing environments:

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  projects: [
    // Node.js environment for backend logic
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/__tests__/lib/**/*.test.{ts,tsx}',
        '<rootDir>/src/__tests__/utils/**/*.test.{ts,tsx}',
        '<rootDir>/src/__tests__/app/api/**/*.test.{ts,tsx}',
      ],
    },
    // jsdom environment for React components
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: ['<rootDir>/src/__tests__/components/**/*.test.{ts,tsx}'],
    },
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/__tests__/**/*'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
```

### Testing Utilities

```typescript
// src/__tests__/utils/test-utils.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from '@/contexts/CartContext';

// Create custom render function with providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>{children}</CartProvider>
    </QueryClientProvider>
  );
};

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

## Component Testing Best Practices

### Testing React Components

```typescript
// Example: ProductCard component test
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils';
import { ProductCard } from '@/components/products/ProductCard';
import { mockProduct } from '@/__tests__/fixtures/products';

describe('ProductCard', () => {
  const defaultProps = {
    product: mockProduct(),
    onAddToCart: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays product information correctly', () => {
    render(<ProductCard {...defaultProps} />);

    expect(screen.getByText(defaultProps.product.name)).toBeInTheDocument();
    expect(screen.getByText(`$${defaultProps.product.price}`)).toBeInTheDocument();
    expect(screen.getByAltText(defaultProps.product.images[0].alt)).toBeInTheDocument();
  });

  it('shows out of stock message when product is unavailable', () => {
    const outOfStockProduct = mockProduct({
      inventory: { ...mockProduct().inventory, inStock: false },
    });

    render(<ProductCard {...defaultProps} product={outOfStockProduct} />);

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
  });

  it('calls onAddToCart with correct parameters', async () => {
    render(<ProductCard {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(defaultProps.onAddToCart).toHaveBeenCalledWith(
        defaultProps.product.id,
        1,
        'DOZEN'
      );
    });
  });
});
```

### Testing Custom Hooks

```typescript
// Example: useCart hook test
import { renderHook, act } from '@testing-library/react';
import { useCart } from '@/hooks/useCart';
import { CartProvider } from '@/contexts/CartContext';
import { mockProduct } from '@/__tests__/fixtures/products';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CartProvider>{children}</CartProvider>
);

describe('useCart', () => {
  it('starts with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('adds items to cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = mockProduct();

    act(() => {
      result.current.addItem(product.id, 2, 'DOZEN');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      productId: product.id,
      quantity: 2,
      packageSize: 'DOZEN',
    });
  });
});
```

## Testing Business Logic

### Validation Testing

```typescript
// Example: Form validation tests
import {
  validateEmail,
  validatePhone,
  validateAddress,
  validateCateringInquiry,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('accepts valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'firstname+lastname@example.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('rejects invalid email addresses', () => {
      const invalidEmails = ['invalid-email', '@example.com', 'test@', 'test..test@example.com'];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validateCateringInquiry', () => {
    it('validates complete catering inquiry', () => {
      const validInquiry = {
        eventDetails: {
          eventDate: '2025-03-15T18:00:00Z',
          guestCount: 50,
          eventType: 'CORPORATE' as const,
        },
        contactInfo: {
          name: 'John Doe',
          email: 'john@company.com',
          phone: '(555) 123-4567',
        },
        deliveryAddress: {
          street: '123 Business Ave',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94107',
        },
      };

      expect(validateCateringInquiry(validInquiry)).toEqual({ valid: true });
    });

    it('returns errors for invalid inquiry', () => {
      const invalidInquiry = {
        eventDetails: {
          eventDate: '',
          guestCount: 0,
          eventType: 'CORPORATE' as const,
        },
        contactInfo: {
          name: '',
          email: 'invalid-email',
          phone: '',
        },
      };

      const result = validateCateringInquiry(invalidInquiry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Event date is required');
      expect(result.errors).toContain('Guest count must be at least 1');
      expect(result.errors).toContain('Contact name is required');
    });
  });
});
```

## API Route Testing

### Testing Next.js API Routes

```typescript
// Example: Products API route test
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/products/route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

describe('/api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('returns paginated products', async () => {
      const mockProducts = [mockProduct(), mockProduct()];
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.product.count.mockResolvedValue(25);

      const request = new Request('http://localhost:3000/api/products?page=1&limit=12');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.meta.total).toBe(25);
    });

    it('filters products by category', async () => {
      const mockProducts = [mockProduct({ categoryId: 'cat_pastries' })];
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const request = new Request('http://localhost:3000/api/products?category=pastries');
      const response = await GET(request);
      const data = await response.json();

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { slug: 'pastries' },
          }),
        })
      );
    });
  });

  describe('POST /api/products', () => {
    it('creates a new product with valid data', async () => {
      const newProduct = mockProduct();
      prismaMock.product.create.mockResolvedValue(newProduct);

      const request = new Request('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Empanadas',
          price: 24.99,
          categoryId: 'cat_pastries',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Empanadas');
    });

    it('validates required fields', async () => {
      const request = new Request('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }), // Missing required fields
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

## Mock Management

### Creating Reusable Mocks

```typescript
// src/__tests__/fixtures/products.ts
import type { Product, ProductImage, PackageSize } from '@/types/product';

export const mockProductImage = (overrides: Partial<ProductImage> = {}): ProductImage => ({
  id: 'img_test_1',
  url: '/test-images/empanadas.jpg',
  alt: 'Test empanadas',
  order: 1,
  ...overrides,
});

export const mockPackageSize = (overrides: Partial<PackageSize> = {}): PackageSize => ({
  id: 'size_dozen',
  name: 'Dozen',
  servingSize: 12,
  priceMultiplier: 1,
  isDefault: true,
  ...overrides,
});

export const mockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod_test_123',
  name: 'Test Beef Empanadas',
  description: 'Delicious test empanadas',
  price: 24.99,
  categoryId: 'cat_pastries',
  squareItemId: 'sq_item_123',
  images: [mockProductImage()],
  inventory: {
    inStock: true,
    quantity: 50,
    lowStockThreshold: 10,
  },
  packageSizes: [mockPackageSize()],
  tags: ['beef', 'pastry', 'frozen'],
  allergens: ['gluten', 'egg'],
  nutritionalInfo: {
    calories: 280,
    protein: 12,
    carbs: 25,
    fat: 15,
    fiber: 2,
    sodium: 450,
  },
  isActive: true,
  isFeatured: false,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
  ...overrides,
});
```

### External Service Mocks

```typescript
// src/__tests__/mocks/square.ts
export const mockSquareClient = {
  paymentsApi: {
    createPayment: jest.fn(),
    getPayment: jest.fn(),
  },
  catalogApi: {
    searchCatalogItems: jest.fn(),
    batchRetrieveCatalogObjects: jest.fn(),
  },
  ordersApi: {
    createOrder: jest.fn(),
    retrieveOrder: jest.fn(),
  },
};

// src/__tests__/mocks/shippo.ts
export const mockShippoClient = {
  shipment: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  rate: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
};
```

## Test Commands and Scripts

### Running Tests

```bash
# Run all unit tests
pnpm test:unit

# Run component tests only
pnpm test:components

# Run tests in watch mode
pnpm test:unit:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/__tests__/components/ProductCard.test.tsx

# Run tests matching pattern
pnpm test --testNamePattern="cart functionality"
```

### Debugging Tests

```typescript
// Add debugging output
it('debugs test data', () => {
  const product = mockProduct();
  console.log('Product data:', JSON.stringify(product, null, 2));

  render(<ProductCard product={product} />);

  // Use screen.debug() to see rendered HTML
  screen.debug();

  expect(screen.getByText(product.name)).toBeInTheDocument();
});

// Use only/skip for focused testing
it.only('runs only this test', () => {
  // This test will run exclusively
});

it.skip('skips this test', () => {
  // This test will be skipped
});
```

## Coverage and Quality Gates

### Coverage Configuration

```typescript
// jest.config.ts coverage settings
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Per-directory thresholds
  './src/components/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './src/lib/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
},
```

### Quality Metrics

- **Test Execution Time**: Unit tests should complete in under 30 seconds
- **Test Isolation**: Each test should be independent and not rely on test order
- **Mock Usage**: External dependencies should be mocked appropriately
- **Assertion Quality**: Use specific assertions rather than generic truthiness checks

## Best Practices

### Writing Effective Unit Tests

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Descriptive Test Names**: Test names should clearly describe the scenario
3. **Follow AAA Pattern**: Arrange, Act, Assert structure
4. **Test Edge Cases**: Include boundary conditions and error scenarios
5. **Keep Tests Simple**: One assertion per test when possible

### Maintenance Guidelines

1. **Update Tests with Code Changes**: Keep tests synchronized with implementation
2. **Remove Obsolete Tests**: Delete tests for removed functionality
3. **Refactor Test Code**: Apply same quality standards to test code
4. **Review Test Coverage**: Regularly review and improve coverage gaps

## Common Patterns and Solutions

### Testing Async Operations

```typescript
it('handles async operations', async () => {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: 'test' }),
  });
  global.fetch = mockFetch;

  render(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded data')).toBeInTheDocument();
  });
});
```

### Testing Error Boundaries

```typescript
// Mock console.error to avoid test output noise
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

it('handles component errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

## Related Documentation

- [Testing Strategy](testing-strategy.md) - Overall testing approach
- [Integration Testing](integration-testing.md) - API and database testing
- [E2E Testing Setup](e2e-testing/README.md) - Browser automation testing
- [Performance Testing](../operations/monitoring/performance.md) - Load and performance testing

---

Unit tests provide the foundation for reliable software development, ensuring individual components work correctly and providing fast feedback during development cycles.
