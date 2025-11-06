// Enhanced Jest setup with comprehensive mocks
const { TextEncoder, TextDecoder } = require('util');

// Fix TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set all required environment variables BEFORE any imports
const requiredEnvVars = {
  // Database
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',

  // Square
  SQUARE_ACCESS_TOKEN: 'test-access-token',
  SQUARE_SANDBOX_TOKEN: 'test-sandbox-token',
  SQUARE_PRODUCTION_TOKEN: 'test-production-token',
  SQUARE_LOCATION_ID: 'test-location-id',
  SQUARE_ENVIRONMENT: 'sandbox',
  SQUARE_WEBHOOK_SECRET: 'test-webhook-secret',
  SQUARE_WEBHOOK_SECRET_SANDBOX: 'test-webhook-secret-sandbox',

  // Email
  RESEND_API_KEY: 'test-resend-key',
  FROM_EMAIL: 'test@example.com',
  ADMIN_EMAIL: 'admin@example.com',
  SUPPORT_EMAIL: 'support@example.com',

  // App
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NODE_ENV: 'test',

  // Shippo
  SHIPPO_API_KEY: 'test-shippo-key',

  // Twilio
  TWILIO_ACCOUNT_SID: 'test-account-sid',
  TWILIO_AUTH_TOKEN: 'test-auth-token',
  TWILIO_PHONE_NUMBER: '+15555555555',

  // Redis/Upstash
  UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-token',
};

// Apply all environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

// Mock problematic ESM modules first
jest.mock('@t3-oss/env-nextjs', () => ({
  createEnv: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    SQUARE_ACCESS_TOKEN: 'test-access-token',
    SQUARE_ENVIRONMENT: 'sandbox',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 'test-resend-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  })),
}));

// Mock the env module directly
jest.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    SQUARE_ACCESS_TOKEN: 'test-access-token',
    SQUARE_SANDBOX_TOKEN: 'test-sandbox-token',
    SQUARE_PRODUCTION_TOKEN: 'test-production-token',
    SQUARE_LOCATION_ID: 'test-location-id',
    SQUARE_ENVIRONMENT: 'sandbox',
    SQUARE_WEBHOOK_SECRET: 'test-webhook-secret',
    SQUARE_WEBHOOK_SECRET_SANDBOX: 'test-webhook-secret-sandbox',
    RESEND_API_KEY: 'test-resend-key',
    FROM_EMAIL: 'test@example.com',
    ADMIN_EMAIL: 'admin@example.com',
    SUPPORT_EMAIL: 'support@example.com',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
    SHIPPO_API_KEY: 'test-shippo-key',
    TWILIO_ACCOUNT_SID: 'test-account-sid',
    TWILIO_AUTH_TOKEN: 'test-auth-token',
    TWILIO_PHONE_NUMBER: '+15555555555',
    UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  },
}));

// Explicitly use manual mocks for Prisma (needed when prisma generate runs in CI)
jest.mock('@prisma/client');
jest.mock('@prisma/client/runtime/library');

// Create comprehensive Prisma mock
const createPrismaMock = () => {
  // In-memory store for each model to enable persistence across operations
  const stores = {
    order: [],
    orderItem: [],
    product: [],
    user: [],
    profile: [],
    payment: [],
    customer: [],
    emailAlert: [],
    storeSettings: [],
    spotlightPick: [],
    category: [],
    variant: [],
  };

  // Create base methods with realistic default return values and persistence
  const createBaseMethods = (modelName = 'Model') => {
    const storeName = modelName.toLowerCase();

    // Initialize store if it doesn't exist
    if (!stores[storeName]) {
      stores[storeName] = [];
    }

    return {
      create: jest.fn(async ({ data, include }) => {
        const id = `test-${storeName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdItem = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        };

        // Handle nested creates for relations
        if (data.items && data.items.create) {
          const itemsData = Array.isArray(data.items.create) ? data.items.create : [data.items.create];
          createdItem.items = itemsData.map((item, idx) => ({
            id: `item-${idx}-${Date.now()}`,
            orderId: id,
            createdAt: new Date(),
            ...item
          }));
          // Store order items
          stores.orderitem.push(...createdItem.items);
        }

        // Add to store
        stores[storeName].push(createdItem);

        return createdItem;
      }),
      update: jest.fn(async ({ where, data }) => {
        const item = stores[storeName].find(i => i.id === where.id);
        if (item) {
          Object.assign(item, data, { updatedAt: new Date() });
          return item;
        }
        return { id: where.id || 'test-id', ...data };
      }),
      findUnique: jest.fn(async ({ where, include }) => {
        const item = stores[storeName].find(i => i.id === where.id || i.email === where.email);
        if (!item) return null;

        // Handle includes
        if (include && include.items && item.items) {
          return { ...item };
        }
        return item;
      }),
      findMany: jest.fn(async ({ where, include, orderBy, take } = {}) => {
        let results = [...stores[storeName]];

        // Apply where filters
        if (where) {
          results = results.filter(item => {
            // Check all where conditions
            return Object.keys(where).every(key => {
              if (key === 'createdAt' && where[key]?.gte) {
                return new Date(item.createdAt) >= new Date(where[key].gte);
              }
              if (key === 'status' && where[key]?.in) {
                return where[key].in.includes(item.status);
              }
              if (Array.isArray(where[key])) {
                // OR conditions
                return where[key].some(condition =>
                  Object.keys(condition).every(k => item[k] === condition[k])
                );
              }
              return item[key] === where[key];
            });
          });
        }

        // Apply ordering
        if (orderBy) {
          const [field, direction] = Object.entries(orderBy)[0];
          results.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            if (direction === 'desc') {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }

        // Apply take limit
        if (take) {
          results = results.slice(0, take);
        }

        // Handle includes
        if (include && include.items) {
          results = results.map(order => ({
            ...order,
            items: stores.orderitem
              .filter(item => item.orderId === order.id)
              .map(item => {
                const itemWithIncludes = { ...item };
                // Handle nested includes for product and variant
                if (include.items.include) {
                  if (include.items.include.product && item.productId) {
                    itemWithIncludes.product = { id: item.productId, name: `Product ${item.productId}` };
                  }
                  if (include.items.include.variant && item.variantId) {
                    itemWithIncludes.variant = { id: item.variantId, name: `Variant ${item.variantId}` };
                  }
                }
                return itemWithIncludes;
              })
          }));
        }

        return results;
      }),
      findFirst: jest.fn(async ({ where } = {}) => {
        if (!where) return stores[storeName][0] || null;
        const result = stores[storeName].find(item => {
          return Object.keys(where).every(key => item[key] === where[key]);
        });
        return result || null;
      }),
      delete: jest.fn(async ({ where }) => {
        const index = stores[storeName].findIndex(i => i.id === where.id);
        if (index > -1) {
          const deleted = stores[storeName].splice(index, 1)[0];
          return deleted;
        }
        return { id: where.id || 'test-id' };
      }),
      deleteMany: jest.fn(async ({ where } = {}) => {
        const initialLength = stores[storeName].length;
        if (where) {
          stores[storeName] = stores[storeName].filter(item => {
            return !Object.keys(where).every(key => item[key] === where[key]);
          });
        } else {
          stores[storeName] = [];
        }
        const count = initialLength - stores[storeName].length;
        return { count };
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
      count: jest.fn(async () => stores[storeName].length),
      createMany: jest.fn(async ({ data }) => {
        const items = Array.isArray(data) ? data : [data];
        items.forEach(itemData => {
          const id = `test-${storeName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          stores[storeName].push({ id, ...itemData });
        });
        return { count: items.length };
      }),
      upsert: jest.fn(async ({ where, create, update }) => {
        const existing = stores[storeName].find(i => i.id === where.id);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const id = `test-${storeName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const created = { id, ...create };
        stores[storeName].push(created);
        return created;
      }),
    };
  };

  const prismaMock = {
    $disconnect: jest.fn(),
    $connect: jest.fn(),
    $queryRaw: jest.fn(() => [{ status: 1 }]),
    $executeRaw: jest.fn(),
    order: createBaseMethods('Order'),
    product: createBaseMethods('Product'),
    user: createBaseMethods('User'),
    orderItem: createBaseMethods('OrderItem'),
    emailAlert: createBaseMethods('EmailAlert'),
    storeSettings: createBaseMethods('StoreSettings'),
    spotlightPick: createBaseMethods('SpotlightPick'),
    category: createBaseMethods('Category'),
    variant: createBaseMethods('Variant'),
    payment: createBaseMethods('Payment'),
    customer: createBaseMethods('Customer'),
    profile: createBaseMethods('Profile'),
  };

  // $transaction must pass the full prismaMock to callback functions
  prismaMock.$transaction = jest.fn(async operations => {
    if (typeof operations === 'function') {
      return operations(prismaMock);
    }
    return operations;
  });

  return prismaMock;
};

// Mock modules that cause issues
jest.mock('@/lib/db', () => {
  const prismaMock = createPrismaMock();
  return {
    prisma: prismaMock,
    db: prismaMock,
    withRetry: jest.fn(async operation => operation()),
    withConnectionManagement: jest.fn(async operation => operation()),
    withPreparedStatementHandling: jest.fn(async operation => operation()),
    checkDatabaseHealth: jest.fn(async () => ({
      connected: true,
      latency: 150,
    })),
    ensureConnection: jest.fn(),
    withTransaction: jest.fn(async operation => operation(prismaMock)),
    executeWithConnectionManagement: jest.fn(async operation => operation()),
  };
});

// Mock db-unified module (used by concurrency tests)
jest.mock('@/lib/db-unified', () => {
  const prismaMock = createPrismaMock();
  return {
    prisma: prismaMock,
    checkConnection: jest.fn(async () => true),
    ensureConnection: jest.fn(async () => {}),
    withRetry: jest.fn(async operation => operation()),
    withTransaction: jest.fn(async operation => operation(prismaMock)),
    withWebhookRetry: jest.fn(async operation => operation()),
    getHealthStatus: jest.fn(async () => ({
      connected: true,
      latency: 150,
      version: 'test',
    })),
    shutdown: jest.fn(async () => {}),
    forceResetConnection: jest.fn(async () => {}),
  };
});

// Enhanced Supabase mocking
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      }),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  })),
}));

// Mock Square modules based on actual structure
jest.mock('@/lib/square/payments-api', () => ({
  createPayment: jest.fn().mockResolvedValue({
    id: 'payment-123',
    status: 'COMPLETED',
    amountMoney: { amount: 2500, currency: 'USD' },
  }),
  processGiftCardPayment: jest.fn(),
  handlePaymentWebhook: jest.fn(),
}));

jest.mock('@/lib/square/orders', () => ({
  createOrder: jest.fn().mockResolvedValue({
    id: 'order-123',
    totalMoney: { amount: 2500, currency: 'USD' },
  }),
  createPayment: jest.fn().mockResolvedValue({
    id: 'payment-123',
    status: 'COMPLETED',
  }),
}));

jest.mock('@/lib/square/client', () => ({
  getSquareClient: jest.fn(() => ({
    paymentsApi: {
      createPayment: jest.fn().mockResolvedValue({
        result: {
          payment: {
            id: 'payment-123',
            status: 'COMPLETED',
          },
        },
      }),
    },
    ordersApi: {
      createOrder: jest.fn().mockResolvedValue({
        result: {
          order: {
            id: 'order-123',
          },
        },
      }),
    },
  })),
  resetSquareClient: jest.fn(),
}));

jest.mock('@/lib/square/service', () => ({
  SquareService: jest.fn().mockImplementation(() => ({
    createPayment: jest.fn(),
    createOrder: jest.fn(),
  })),
  getSquareService: jest.fn(() => ({
    createPayment: jest.fn(),
    createOrder: jest.fn(),
  })),
}));

jest.mock('@/lib/square', () => ({
  squareClient: {
    paymentsApi: {
      createPayment: jest.fn(),
    },
    ordersApi: {
      createOrder: jest.fn(),
    },
  },
}));

// Mock Shippo client
jest.mock('shippo', () => {
  return jest.fn().mockImplementation(() => ({
    transaction: {
      create: jest.fn(),
      list: jest.fn(),
      retrieve: jest.fn(),
    },
    shipment: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    rate: {
      retrieve: jest.fn(),
    },
  }));
});

jest.mock('@/lib/shippo/client', () => ({
  ShippoClientManager: {
    getInstance: jest.fn(() => ({
      transaction: {
        create: jest.fn().mockResolvedValue({
          object_id: 'transaction-123',
          status: 'SUCCESS',
          tracking_number: '1Z123456789',
          label_url: 'https://shippo.com/label.pdf',
        }),
      },
    })),
    setMockClient: jest.fn(),
    validateConnection: jest.fn().mockResolvedValue({
      connected: true,
      version: 'mock',
    }),
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => new Map()),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: jest.fn(),
}));

// Mock Resend email service
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        id: 'test-email-id',
        from: 'test@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Email',
        html: '<p>Test content</p>',
      }),
    },
  })),
}));

// Mock performance monitor
jest.mock('@/lib/performance-monitor', () => ({
  performanceMonitor: {
    getPerformanceSummary: jest.fn(() => ({
      apiPerformance: {
        averageResponseTime: 250,
        errorRate: 0.01,
        slowRequestCount: 2,
      },
      databasePerformance: {
        averageQueryTime: 100,
      },
    })),
  },
}));

// Mock cache service
jest.mock('@/lib/cache-service', () => ({
  cacheService: {
    healthCheck: jest.fn(async () => ({
      status: 'healthy',
      details: { connected: true, responseTime: 50 },
    })),
  },
}));

// Mock database optimized
jest.mock('@/lib/db-optimized', () => ({
  dbManager: {
    checkHealth: jest.fn(async () => ({
      status: 'healthy',
      details: {
        connected: true,
        responseTime: 150,
        connectionAttempts: 1,
        lastHealthCheck: new Date(),
      },
    })),
    getConnectionStats: jest.fn(() => ({
      maxConnections: 10,
      connectionTimeout: 5000,
      idleTimeout: 300000,
      slowQueryThreshold: 1000,
      performanceTrackingEnabled: true,
    })),
  },
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '',
    headers: new Headers(),
  })
);

// Mock alert service
jest.mock('@/lib/alerts', () => ({
  alertService: {
    sendNewOrderAlert: jest.fn().mockResolvedValue({ success: true }),
    sendOrderStatusChangeAlert: jest.fn().mockResolvedValue({ success: true }),
    sendPaymentFailedAlert: jest.fn().mockResolvedValue({ success: true }),
    sendSystemErrorAlert: jest.fn().mockResolvedValue({ success: true }),
    sendDailySummary: jest.fn().mockResolvedValue({ success: true }),
    sendCustomerOrderConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendCustomerPickupReady: jest.fn().mockResolvedValue({ success: true }),
    retryFailedAlerts: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock store settings
jest.mock('@/lib/store-settings', () => ({
  StoreSettingsService: {
    getInstance: jest.fn(() => ({
      getSettings: jest.fn().mockResolvedValue({
        minOrderAmount: 25.0,
        cateringMinimumAmount: 100.0,
        deliveryRadius: 10,
        deliveryFee: 5.99,
      }),
    })),
  },
}));

// Mock store settings functions
jest.mock('@/lib/store-settings', () => ({
  isStoreOpen: jest.fn().mockResolvedValue(true),
  getStoreSettings: jest.fn().mockResolvedValue({
    minOrderAmount: 25.0,
    cateringMinimumAmount: 100.0,
    deliveryRadius: 10,
    deliveryFee: 5.99,
  }),
  StoreSettingsService: {
    getInstance: jest.fn(() => ({
      getSettings: jest.fn().mockResolvedValue({
        minOrderAmount: 25.0,
        cateringMinimumAmount: 100.0,
        deliveryRadius: 10,
        deliveryFee: 5.99,
      }),
    })),
  },
}));

// Mock webhook queue
jest.mock('@/lib/webhook-queue', () => ({
  handleWebhookWithQueue: jest.fn().mockResolvedValue({ success: true }),
}));

// Suppress console errors in tests
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Not implemented') ||
      args[0].includes('Warning:') ||
      args[0].includes('Invalid') ||
      args[0].includes("Can't reach database") ||
      args[0].includes('Connection test failed'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('Connection test failed'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};
