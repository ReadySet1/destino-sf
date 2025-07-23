# Database Testing Setup Guide

## 🎯 RECOMMENDED APPROACH: Comprehensive Mocking

**For 90% of your tests, use the mock strategy we've already implemented.**

### Current Mock Coverage:

- ✅ Business logic tests (shipping, delivery calculations)
- ✅ Component tests with data dependencies
- ✅ API route validation
- ✅ Unit tests for utilities

### Benefits:

- **Fast execution** (milliseconds vs seconds)
- **No additional infrastructure required**
- **Works with Supabase free tier**
- **Deterministic and reliable**

---

## 🗃️ WHEN YOU NEED A REAL TEST DATABASE

Only consider a real test database for:

- **End-to-end integration tests**
- **Database schema validation**
- **Complex query testing**
- **Performance testing**

---

## 🐘 OPTION 1: Coolify PostgreSQL (Recommended)

### Setup on Your VPS with Coolify:

1. **Deploy PostgreSQL on Coolify:**

```yaml
# docker-compose.test-db.yml
version: '3.8'
services:
  test-postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: destino_sf_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - '5433:5432'
    volumes:
      - test_db_data:/var/lib/postgresql/data
    command: postgres -c shared_preload_libraries=pg_stat_statements

volumes:
  test_db_data:
```

2. **Environment Configuration:**

```bash
# .env.test
DATABASE_URL="postgresql://test_user:test_password@your-vps-ip:5433/destino_sf_test"
DIRECT_URL="postgresql://test_user:test_password@your-vps-ip:5433/destino_sf_test"
```

3. **Test Database Setup Script:**

```typescript
// src/__tests__/setup/real-db-setup.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export async function setupTestDatabase() {
  try {
    // Reset database schema
    execSync('pnpm prisma migrate reset --force --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    // Run migrations
    execSync('pnpm prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    // Seed test data
    await seedTestData();

    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

async function seedTestData() {
  // Add test shipping configurations
  await prisma.shippingConfiguration.createMany({
    data: [
      {
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      },
      {
        productName: 'empanadas',
        baseWeightLb: 1.0,
        weightPerUnitLb: 0.8,
        isActive: true,
        applicableForNationwideOnly: true,
      },
    ],
    skipDuplicates: true,
  });
}

export async function cleanupTestDatabase() {
  await prisma.$executeRaw`TRUNCATE TABLE "ShippingConfiguration", "Order", "OrderItem" RESTART IDENTITY CASCADE`;
}

export { prisma as testPrisma };
```

4. **Integration Test Example:**

```typescript
// src/__tests__/integration/shipping-e2e.test.ts
import { setupTestDatabase, cleanupTestDatabase, testPrisma } from '../setup/real-db-setup';
import { calculateShippingWeight } from '@/lib/shippingUtils';

describe('Shipping Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    // Re-seed fresh data for each test
  });

  test('calculates shipping with real database configuration', async () => {
    const items = [{ id: '1', name: 'Traditional Alfajores', quantity: 2 }];

    const weight = await calculateShippingWeight(items, 'nationwide_shipping');
    expect(weight).toBe(0.9); // 0.5 + (1 * 0.4)
  });
});
```

---

## 🧪 OPTION 2: Supabase Test Project

If you want to stick with Supabase:

1. **Create a second Supabase project** (also free tier)
2. **Use for testing only**
3. **Same schema, separate data**

```bash
# .env.test
SUPABASE_URL="https://your-test-project.supabase.co"
SUPABASE_ANON_KEY="your-test-anon-key"
DATABASE_URL="postgresql://postgres:[password]@db.your-test-project.supabase.co:5432/postgres"
```

---

## 🐳 OPTION 3: Docker Test Database (Local)

For local development only:

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:15
    environment:
      POSTGRES_DB: destino_sf_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - '5434:5432'
    tmpfs:
      - /var/lib/postgresql/data # In-memory, faster tests
```

---

## 📋 IMPLEMENTATION STRATEGY

### Phase 1: Start with Mocks (Current - Week 1)

```bash
# Use existing mock setup for all tests
pnpm test:unit      # Business logic with mocks
pnpm test:components # UI components with mocks
pnpm test:api       # API routes with mocks
```

### Phase 2: Add Real DB for Integration (Week 2-3, if needed)

```bash
# Only for complex integration tests
pnpm test:integration:db    # Real database tests
pnpm test:e2e              # End-to-end with real DB
```

### Test Configuration Strategy:

```typescript
// jest.config.ts - Add database project if needed
const config: Config = {
  projects: [
    // Existing projects...

    // Optional: Real database integration tests
    {
      ...baseConfig,
      displayName: 'integration-db',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.db.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/real-db-setup.ts'],
      globalSetup: '<rootDir>/src/__tests__/setup/global-db-setup.ts',
      globalTeardown: '<rootDir>/src/__tests__/setup/global-db-teardown.ts',
    },
  ],
};
```

---

## 🎯 MY RECOMMENDATION FOR YOU

### **Start with Mocks (This Week)**

1. ✅ **Use the mock setup we created** - handles 90% of your testing needs
2. ✅ **Fast, reliable, no additional infrastructure**
3. ✅ **Works perfectly with your current Supabase setup**

### **Add Real DB Later (If Needed)**

1. 🐘 **Use Coolify PostgreSQL** on your VPS for integration tests
2. 🔧 **Only when you need to test complex database interactions**
3. 📊 **For performance and schema validation testing**

### **Immediate Action Plan:**

```bash
# 1. Test current mock setup (should work great)
pnpm test:unit
pnpm test:components
pnpm test:api

# 2. If 90%+ tests pass, you're good to go with mocks
# 3. Only add real DB if you find specific integration issues
```

### **Cost Breakdown:**

- **Mocks**: $0 (recommended for now)
- **Coolify PostgreSQL**: ~$0 (uses your existing VPS)
- **Second Supabase Project**: $0 (free tier)

**My advice: Start with mocks, add real database testing only if you encounter specific integration issues that mocks can't handle.**

Want me to help you set up the Coolify PostgreSQL option, or should we stick with mocks for now?
