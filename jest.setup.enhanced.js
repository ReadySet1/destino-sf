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
  const baseMethods = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    upsert: jest.fn(),
  };

  return {
    $transaction: jest.fn(async operations => {
      if (typeof operations === 'function') {
        return operations({});
      }
      return operations;
    }),
    $disconnect: jest.fn(),
    $connect: jest.fn(),
    $queryRaw: jest.fn(() => [{ status: 1 }]),
    $executeRaw: jest.fn(),
    order: { ...baseMethods },
    product: { ...baseMethods },
    user: { ...baseMethods },
    orderItem: { ...baseMethods },
    emailAlert: { ...baseMethods },
    storeSettings: { ...baseMethods },
    spotlightPick: { ...baseMethods },
    category: { ...baseMethods },
    variant: { ...baseMethods },
    payment: { ...baseMethods },
    customer: { ...baseMethods },
  };
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
