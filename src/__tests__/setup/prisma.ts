import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create a deeply-mocked PrismaClient instance that we can reuse across tests
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Ensure every test starts with a fresh, clean mock state
beforeEach(() => {
  mockReset(prismaMock);
  // Ensure connection methods return promises as expected by tests
  prismaMock.$connect.mockResolvedValue(undefined);
  prismaMock.$disconnect.mockResolvedValue(undefined);
});

// Tell Jest to use the same mock whenever '@/lib/db' is imported.
// This guarantees that db, prisma, and default all point to the same mock instance.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  db: prismaMock,
  prisma: prismaMock,
  default: prismaMock,
}));

// Also mock '@/lib/db-unified' since some routes use this import
jest.mock('@/lib/db-unified', () => ({
  __esModule: true,
  prisma: prismaMock,
  withRetry: jest.fn(fn => fn()), // Execute callback directly in tests
  withTransaction: jest.fn(fn => fn(prismaMock)),
  withWebhookRetry: jest.fn(fn => fn()),
  checkConnection: jest.fn().mockResolvedValue(true),
  ensureConnection: jest.fn().mockResolvedValue(undefined),
  getHealthStatus: jest.fn().mockResolvedValue({
    connected: true,
    latency: 10,
    version: 'test-version',
    circuitBreaker: { state: 'CLOSED', failures: 0, totalTrips: 0 },
    poolMetrics: { successRate: 1, avgLatencyMs: 10, totalAttempts: 1 },
  }),
  shutdown: jest.fn().mockResolvedValue(undefined),
  forceResetConnection: jest.fn().mockResolvedValue(undefined),
  warmConnection: jest.fn().mockResolvedValue(true),
  withServerComponentDb: jest.fn((fn, options) => fn()),
  getConnectionDiagnostics: jest.fn().mockReturnValue({
    lastSuccessfulConnection: Date.now(),
    timeSinceLastSuccess: 0,
    consecutiveFailures: 0,
    isStale: false,
    circuitBreakerState: 'CLOSED',
  }),
}));
