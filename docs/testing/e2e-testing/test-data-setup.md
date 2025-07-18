# 📊 Test Data Setup Guide - Destino SF

## 📋 Overview
This guide covers test data management, setup, and maintenance for Playwright testing in Destino SF.

## 🎯 Test Data Strategy

### Core Principles
- **Isolation**: Each test uses independent data
- **Consistency**: Same data produces same results
- **Realism**: Data reflects actual product catalog
- **Maintainability**: Easy to update and extend

### Data Categories
1. **Product Data**: Menu items, prices, descriptions
2. **Customer Data**: Test user profiles and addresses
3. **Order Data**: Sample orders and payment info
4. **Catering Data**: Package options and inquiries

## 📁 Test Data Structure

### File Organization
```
tests/
├── fixtures/
│   ├── index.ts              # Main exports
│   ├── test-data.ts          # Core test data
│   ├── products.ts           # Product catalog
│   ├── customers.ts          # Customer profiles
│   ├── orders.ts             # Order examples
│   └── catering.ts           # Catering packages
```

### Core Test Data (`test-data.ts`)
```typescript
export const testProducts = {
  // Empanadas
  empanada: {
    id: 'emp-001',
    name: 'Beef Empanada',
    slug: 'beef-empanada',
    price: 4.50,
    category: 'empanadas',
    description: 'Classic Argentine beef empanada',
    image: '/images/products/beef-empanada.jpg',
    inStock: true,
    isVegetarian: false
  },
  
  vegetarian: {
    id: 'emp-002',
    name: 'Spinach & Cheese Empanada',
    slug: 'spinach-cheese-empanada',
    price: 4.00,
    category: 'empanadas',
    description: 'Fresh spinach and ricotta cheese',
    image: '/images/products/spinach-empanada.jpg',
    inStock: true,
    isVegetarian: true
  },

  // Alfajores
  alfajor: {
    id: 'alf-001',
    name: 'Dulce de Leche Alfajor',
    slug: 'dulce-leche-alfajor',
    price: 3.50,
    category: 'alfajores',
    description: 'Traditional alfajor with dulce de leche',
    image: '/images/products/dulce-alfajor.jpg',
    inStock: true,
    isVegetarian: true
  },

  // Out of stock item for testing
  outOfStock: {
    id: 'emp-003',
    name: 'Chicken Empanada',
    slug: 'chicken-empanada',
    price: 4.25,
    category: 'empanadas',
    description: 'Seasoned chicken empanada',
    image: '/images/products/chicken-empanada.jpg',
    inStock: false,
    isVegetarian: false
  }
};

export const testCustomer = {
  email: 'test@example.com',
  phone: '(555) 123-4567',
  firstName: 'John',
  lastName: 'Doe',
  address: {
    street: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'US'
  }
};

export const testPayment = {
  // Test card numbers (Square sandbox)
  visa: '4111111111111111',
  mastercard: '5555555555554444',
  amex: '378282246310005',
  declined: '4000000000000002',
  
  // Test data
  expiryMonth: '12',
  expiryYear: '2025',
  cvv: '123',
  zipCode: '94102'
};
```

### Customer Test Data (`customers.ts`)
```typescript
export const testCustomers = {
  standard: {
    email: 'customer@test.com',
    phone: '(555) 123-4567',
    firstName: 'Jane',
    lastName: 'Smith',
    address: {
      street: '456 Valencia St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110'
    }
  },
  
  premium: {
    email: 'premium@test.com',
    phone: '(555) 987-6543',
    firstName: 'Michael',
    lastName: 'Johnson',
    address: {
      street: '789 Mission St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103'
    }
  },

  // Special addresses for delivery testing
  outsideDelivery: {
    email: 'outside@test.com',
    phone: '(555) 555-5555',
    firstName: 'Remote',
    lastName: 'Customer',
    address: {
      street: '100 Main St',
      city: 'Oakland',
      state: 'CA',
      zipCode: '94607'
    }
  }
};
```

### Catering Test Data (`catering.ts`)
```typescript
export const testCateringPackages = {
  appetizer: {
    id: 'cat-001',
    name: 'Appetizer Package',
    slug: 'appetizer-package',
    basePrice: 120,
    servings: 20,
    description: 'Perfect for small gatherings',
    items: [
      'Mixed empanadas (20 pieces)',
      'Chimichurri sauce',
      'Napkins and utensils'
    ]
  },
  
  lunch: {
    id: 'cat-002',
    name: 'Boxed Lunch Package',
    slug: 'boxed-lunch-package',
    basePrice: 250,
    servings: 10,
    description: 'Individual boxed lunches',
    items: [
      'Empanadas (2 per box)',
      'Alfajor dessert',
      'Beverage',
      'Napkins and utensils'
    ]
  }
};

export const testCateringInquiry = {
  contact: {
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'catering@company.com',
    phone: '(555) 246-8135',
    company: 'Tech Startup Inc'
  },
  
  event: {
    type: 'corporate',
    date: '2024-12-15',
    time: '12:00 PM',
    guestCount: 50,
    location: '123 Business St, San Francisco, CA 94105',
    specialRequests: 'Vegetarian options needed for 15 guests'
  }
};
```

## 🔧 Database Setup

### Test Database Configuration
```typescript
// tests/setup/database-setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

export async function setupTestDatabase() {
  // Clear existing data
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  
  // Seed test data
  await seedTestProducts();
  await seedTestCategories();
}

async function seedTestProducts() {
  const products = Object.values(testProducts);
  
  for (const product of products) {
    await prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        description: product.description,
        image: product.image,
        inStock: product.inStock,
        isVegetarian: product.isVegetarian,
        category: {
          connectOrCreate: {
            where: { name: product.category },
            create: { name: product.category }
          }
        }
      }
    });
  }
}

export async function cleanupTestDatabase() {
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
}
```

### Environment-Specific Data
```typescript
// Different data for different environments
export const getTestData = (environment: string) => {
  const baseData = testProducts;
  
  switch (environment) {
    case 'staging':
      return {
        ...baseData,
        // Staging-specific overrides
        empanada: { ...baseData.empanada, price: 5.00 }
      };
      
    case 'production':
      return {
        ...baseData,
        // Production uses real data, minimal test data
      };
      
    default:
      return baseData;
  }
};
```

## 🎭 Test Helpers Integration

### Using Test Data in Tests
```typescript
import { test, expect } from '@playwright/test';
import { testProducts, testCustomer } from '../fixtures';

test('should add product to cart', async ({ page }) => {
  // Use consistent test data
  const product = testProducts.empanada;
  
  await page.goto(`/products/${product.slug}`);
  await expect(page.getByText(product.name)).toBeVisible();
  await expect(page.getByText(`$${product.price}`)).toBeVisible();
  
  await page.click('[data-testid="add-to-cart"]');
  // ... rest of test
});
```

### Dynamic Data Generation
```typescript
// For tests that need unique data
export const generateTestData = {
  customer: (override = {}) => ({
    ...testCustomer,
    email: `test-${Date.now()}@example.com`,
    ...override
  }),
  
  order: (override = {}) => ({
    id: `order-${Date.now()}`,
    items: [testProducts.empanada],
    total: 4.50,
    ...override
  })
};
```

## 🔄 Data Maintenance

### Updating Test Data
When product catalog changes:

1. Update `test-data.ts` with new products/prices
2. Update related test expectations
3. Verify image paths exist
4. Run tests to ensure compatibility

### Data Validation
```typescript
// Validate test data structure
export function validateTestData() {
  Object.entries(testProducts).forEach(([key, product]) => {
    if (!product.id || !product.name || !product.price) {
      throw new Error(`Invalid product data for ${key}`);
    }
  });
}
```

### Sync with Production
```bash
# Script to sync test data with production catalog
pnpm run sync-test-data
```

## 🚀 Advanced Patterns

### Parameterized Tests
```typescript
// Test multiple products with same logic
Object.entries(testProducts).forEach(([key, product]) => {
  test(`should handle ${product.name}`, async ({ page }) => {
    await page.goto(`/products/${product.slug}`);
    await expect(page.getByText(product.name)).toBeVisible();
  });
});
```

### Test Data Factories
```typescript
export class TestDataFactory {
  static createOrder(items: Product[], customer = testCustomer) {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    
    return {
      id: `order-${Date.now()}`,
      items,
      customer,
      total,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }
  
  static createCateringInquiry(overrides = {}) {
    return {
      ...testCateringInquiry,
      id: `inquiry-${Date.now()}`,
      ...overrides
    };
  }
}
```

## 📊 Monitoring & Analytics

### Test Data Usage Tracking
```typescript
// Track which test data is being used
export const dataUsageTracker = {
  used: new Set<string>(),
  
  markUsed(dataKey: string) {
    this.used.add(dataKey);
  },
  
  getUnusedData() {
    const allKeys = Object.keys(testProducts);
    return allKeys.filter(key => !this.used.has(key));
  }
};
```

### Data Quality Checks
```typescript
// Automated checks for data quality
export function checkDataQuality() {
  const issues: string[] = [];
  
  // Check for missing images
  Object.entries(testProducts).forEach(([key, product]) => {
    if (!product.image || !product.image.startsWith('/images/')) {
      issues.push(`${key}: Invalid image path`);
    }
  });
  
  // Check for price consistency
  if (testProducts.empanada.price <= 0) {
    issues.push('Empanada price should be positive');
  }
  
  return issues;
}
```

## 🔧 Troubleshooting

### Common Issues

#### Test Data Not Found
```bash
# Verify test data is properly imported
pnpm run validate-test-data
```

#### Database Sync Issues
```bash
# Reset test database
pnpm run reset-test-db
pnpm run seed-test-data
```

#### Image Path Issues
```bash
# Verify image paths exist
pnpm run check-test-images
```

### Debugging Tips
1. Log test data being used
2. Verify database state before/after tests
3. Check for data conflicts between tests
4. Validate API responses match expected data

---

*Keep this guide updated as test data evolves and new testing patterns emerge.* 