# 🚀 Destino SF Pre-Production Fix Plan

## 🎯 Executive Summary

**Status**: ⚠️ **NOT READY FOR PRODUCTION**

Based on comprehensive analysis, your codebase requires critical fixes before merging to main. This plan addresses security vulnerabilities, test failures, performance issues, and deployment requirements.

**Priority**: Critical fixes must be completed before any production deployment.

---

## 📊 Current Status Assessment

### ✅ What's Working
- Next.js 15 with App Router configuration
- TypeScript setup with proper configuration
- Prisma database schema is well-structured
- Comprehensive component library (Radix UI + shadcn/ui)
- Environment variables properly configured
- Git hooks and pre-commit setup

### 🔴 Critical Issues
- **Test Suite**: Extensive test failures requiring immediate attention
- **Security**: Missing Row Level Security (RLS) policies
- **Database**: Performance and security vulnerabilities
- **Environment**: Test environment configuration issues

---

## 🚨 PHASE 1: Critical Security Fixes (MUST DO FIRST)

### Database Security Implementation

#### 1.1 Row Level Security (RLS) Policies

```sql
-- Enable RLS and create policies for all critical tables
-- Run these migrations immediately

-- profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid()::text = id);

-- orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid()::text 
      AND role = 'ADMIN'
    )
  );

-- products table (public read, admin write)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid()::text 
      AND role = 'ADMIN'
    )
  );

-- Add RLS policies for remaining tables:
-- categories, variants, order_items, etc.
```

#### 1.2 Database Performance Indexes

```sql
-- Add missing indexes for foreign keys and frequently queried columns

-- Critical performance indexes
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_order_items_order_id ON order_items(order_id);
CREATE INDEX CONCURRENTLY idx_order_items_product_id ON order_items(product_id);
CREATE INDEX CONCURRENTLY idx_products_category_active ON products(category_id, active) WHERE active = true;
CREATE INDEX CONCURRENTLY idx_products_featured_active ON products(featured, active) WHERE featured = true AND active = true;

-- Query performance indexes
CREATE INDEX CONCURRENTLY idx_orders_status_created ON orders(status, created_at);
CREATE INDEX CONCURRENTLY idx_products_sync_status ON products(sync_status, last_sync_at);
```

#### 1.3 Database Functions Security

```sql
-- Fix security definer functions and search paths
-- Replace any mutable search paths with explicit schema references

-- Example of secure function pattern:
CREATE OR REPLACE FUNCTION secure_get_user_orders(user_uuid uuid)
RETURNS TABLE(order_id uuid, status text, total decimal)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Explicit schema references
  RETURN QUERY
  SELECT o.id, o.status, o.total_amount
  FROM public.orders o
  WHERE o.user_id = user_uuid::text
  AND o.deleted_at IS NULL;
END;
$$;
```

---

## 🧪 PHASE 2: Test Suite Recovery

### 2.1 Test Environment Setup

#### Fix Test Database Configuration

```typescript
// src/__tests__/setup/test-db.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const testDatabaseUrl = process.env.TEST_DATABASE_URL || 
  process.env.DATABASE_URL?.replace('/postgres', '/postgres_test');

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
});

export async function setupTestDatabase() {
  try {
    // Reset test database
    await testPrisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE;`;
    await testPrisma.$executeRaw`CREATE SCHEMA public;`;
    
    // Run migrations on test database
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

export async function resetTestDatabase() {
  const tablesToClear = [
    'order_items',
    'orders', 
    'products',
    'categories',
    'profiles'
  ];

  for (const table of tablesToClear) {
    await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}
```

#### Update Jest Configuration

```typescript
// jest.config.ts - Enhanced configuration
import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.ts',
        '!<rootDir>/src/**/__tests__/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.enhanced.js',
        '<rootDir>/src/__tests__/setup/test-db-setup.ts'
      ],
      globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
      globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      testTimeout: 30000, // Increased timeout for DB operations
    },
    {
      displayName: 'jsdom',
      preset: 'ts-jest', 
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
      },
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.enhanced.js',
        '<rootDir>/src/__tests__/setup/jsdom-setup.ts'
      ],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**',
    '!src/**/*.stories.tsx',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  passWithNoTests: true,
  verbose: true,
  maxWorkers: 1, // Run tests serially to avoid DB conflicts
  bail: false,
};

export default config;
```

### 2.2 Critical Test Fixes

#### API Route Testing with Proper Mocking

```typescript
// src/__tests__/app/api/orders/route.test.ts
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/orders/route';
import { testPrisma, resetTestDatabase } from '@/__tests__/setup/test-db';
import { createMockUser, createMockProduct } from '@/__tests__/factories';

// Mock Supabase auth
jest.mock('@/lib/supabase', () => ({
  createServerComponentClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
    },
  }),
}));

describe('/api/orders', () => {
  beforeAll(async () => {
    // Setup test database once
    await resetTestDatabase();
  });

  beforeEach(async () => {
    // Clear data before each test
    await testPrisma.orderItem.deleteMany();
    await testPrisma.order.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('creates order successfully', async () => {
    // Arrange
    const user = await createMockUser(testPrisma);
    const product = await createMockProduct(testPrisma);
    
    const orderData = {
      items: [{ productId: product.id, quantity: 2, price: 15.99 }],
      shippingAddress: {
        street: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    // Act
    const response = await POST(request);
    const result = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(result.order).toBeDefined();
    expect(result.order.items).toHaveLength(1);
    
    // Verify database state
    const dbOrder = await testPrisma.order.findUnique({
      where: { id: result.order.id },
      include: { items: true },
    });
    
    expect(dbOrder).toBeTruthy();
    expect(dbOrder.items).toHaveLength(1);
  });
});
```

#### Component Testing with MSW

```typescript
// src/__tests__/components/cart/CartSummary.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import CartSummary from '@/components/cart/CartSummary';
import { CartProvider } from '@/store/cart-store';

const server = setupServer(
  http.post('/api/orders', () => {
    return HttpResponse.json({
      order: {
        id: 'test-order-id',
        status: 'pending',
        total: 31.98,
        items: [],
      },
    });
  })
);

describe('CartSummary', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('displays cart total correctly', async () => {
    const mockCart = {
      items: [
        { id: '1', productId: 'prod-1', quantity: 2, price: 15.99, name: 'Test Item' },
      ],
      total: 31.98,
      tax: 2.88,
      shipping: 5.99,
    };

    render(
      <CartProvider initialState={mockCart}>
        <CartSummary />
      </CartProvider>
    );

    expect(screen.getByText('$31.98')).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
  });

  it('handles checkout process', async () => {
    const user = userEvent.setup();
    
    // Test implementation with proper async handling
    render(
      <CartProvider>
        <CartSummary />
      </CartProvider>
    );

    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    await user.click(checkoutButton);

    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });
});
```

---

## ⚡ PHASE 3: Performance & Optimization

### 3.1 Database Query Optimization

```typescript
// src/lib/queries/optimized-queries.ts
import { PrismaClient } from '@prisma/client';
import { unstable_cache } from 'next/cache';

export const getCachedProducts = unstable_cache(
  async (categoryId?: string) => {
    const where = {
      active: true,
      ...(categoryId && { categoryId }),
    };

    return prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          where: { active: true },
          select: { id: true, name: true, price: true, squareId: true },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { ordinal: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  },
  ['products'],
  {
    revalidate: 3600, // 1 hour
    tags: ['products'],
  }
);

export const getOrderWithDetails = unstable_cache(
  async (orderId: string, userId: string) => {
    return prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                price: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  },
  ['order-details'],
  {
    revalidate: 300, // 5 minutes
    tags: ['orders'],
  }
);
```

### 3.2 API Route Performance

```typescript
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedProducts } from '@/lib/queries/optimized-queries';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await rateLimit.limit(identifier);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');

    const products = await getCachedProducts(categoryId || undefined);

    return NextResponse.json(
      { products, count: products.length },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Products API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', products: [] },
      { status: 500 }
    );
  }
}
```

### 3.3 Component Performance

```typescript
// src/components/products/ProductGrid.tsx
import { memo, useMemo } from 'react';
import { Product } from '@prisma/client';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  categoryFilter?: string;
  searchQuery?: string;
}

export const ProductGrid = memo<ProductGridProps>(({ 
  products, 
  categoryFilter, 
  searchQuery 
}) => {
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = !categoryFilter || 
        product.categoryId === categoryFilter;
      
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch && product.active;
    });
  }, [products, categoryFilter, searchQuery]);

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredProducts.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
        />
      ))}
    </div>
  );
});

ProductGrid.displayName = 'ProductGrid';
```

---

## 🔒 PHASE 4: Security Hardening

### 4.1 Middleware Security

```typescript
// src/middleware.ts - Enhanced security
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  const supabase = createMiddlewareClient({ req: request, res: response });

  // Auth check for protected routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // API route rate limiting
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const identifier = request.ip || 'anonymous';
    const { success } = await rateLimit.limit(identifier);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
  }

  return response;
}

export const config =