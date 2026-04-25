/**
 * Tests for the Square writeback health endpoint.
 *
 * Verifies admin auth gating and the shape/semantics of the health payload
 * (job counts, conflict count, lag math, recent failures, echo records).
 */

const mockVerifyAdminAccess = jest.fn();

jest.mock('@/lib/auth/admin-guard', () => ({
  verifyAdminAccess: (...args: unknown[]) => mockVerifyAdminAccess(...args),
}));

const prismaMock = {
  squareWriteJob: {
    groupBy: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  product: { count: jest.fn() },
  recentSquareWrite: { count: jest.fn() },
};
jest.mock('@/lib/db-unified', () => ({ prisma: prismaMock, withRetry: (fn: () => unknown) => fn() }));

jest.mock('@/lib/square/write-queue', () => ({
  isWritebackEnabled: jest.fn(() => true),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [] })),
}));

import { GET } from '@/app/api/admin/square-writeback-health/route';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/square-writeback-health', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerifyAdminAccess.mockResolvedValue({
      authorized: false,
      error: 'Authentication required',
      statusCode: 401,
    });

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required' });
  });

  it('returns 403 when authenticated but not admin', async () => {
    mockVerifyAdminAccess.mockResolvedValue({
      authorized: false,
      error: 'Admin access required',
      statusCode: 403,
    });

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns healthy when no failures and no lag', async () => {
    mockVerifyAdminAccess.mockResolvedValue({ authorized: true, user: { id: 'u', email: 'a@b', role: 'ADMIN' } });
    prismaMock.squareWriteJob.groupBy.mockResolvedValue([
      { status: 'SUCCEEDED', _count: { _all: 12 } },
    ]);
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.squareWriteJob.findFirst
      .mockResolvedValueOnce({
        succeededAt: new Date(Date.now() - 30_000),
        operation: 'CREATE',
        productId: 'p1',
      })
      .mockResolvedValueOnce(null);
    prismaMock.squareWriteJob.findMany.mockResolvedValue([]);
    prismaMock.recentSquareWrite.count.mockResolvedValue(2);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.health).toBe('healthy');
    expect(body.featureEnabled).toBe(true);
    expect(body.jobs.counts).toEqual({ PENDING: 0, SUCCEEDED: 12, FAILED: 0, DEAD: 0 });
    expect(body.jobs.lastSucceeded.ageMs).toBeGreaterThanOrEqual(30_000);
    expect(body.jobs.oldestPending).toBeNull();
    expect(body.products.conflictCount).toBe(0);
    expect(body.echoSuppression.activeRecords).toBe(2);
  });

  it('returns degraded when there are FAILED jobs', async () => {
    mockVerifyAdminAccess.mockResolvedValue({ authorized: true, user: { id: 'u', email: 'a@b', role: 'ADMIN' } });
    prismaMock.squareWriteJob.groupBy.mockResolvedValue([
      { status: 'SUCCEEDED', _count: { _all: 10 } },
      { status: 'FAILED', _count: { _all: 1 } },
    ]);
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.squareWriteJob.findFirst.mockResolvedValue(null);
    prismaMock.squareWriteJob.findMany.mockResolvedValue([
      {
        id: 'j1',
        status: 'FAILED',
        operation: 'UPDATE',
        productId: 'p1',
        attempts: 1,
        lastError: 'VERSION_MISMATCH',
        updatedAt: new Date(),
      },
    ]);
    prismaMock.recentSquareWrite.count.mockResolvedValue(0);

    const res = await GET();
    const body = await res.json();
    expect(body.health).toBe('degraded');
    expect(body.jobs.recentFailures).toHaveLength(1);
    expect(body.jobs.recentFailures[0].lastError).toBe('VERSION_MISMATCH');
  });

  it('returns unhealthy when there are DEAD jobs', async () => {
    mockVerifyAdminAccess.mockResolvedValue({ authorized: true, user: { id: 'u', email: 'a@b', role: 'ADMIN' } });
    prismaMock.squareWriteJob.groupBy.mockResolvedValue([
      { status: 'DEAD', _count: { _all: 1 } },
    ]);
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.squareWriteJob.findFirst.mockResolvedValue(null);
    prismaMock.squareWriteJob.findMany.mockResolvedValue([]);
    prismaMock.recentSquareWrite.count.mockResolvedValue(0);

    const res = await GET();
    const body = await res.json();
    expect(body.health).toBe('unhealthy');
  });

  it('returns unhealthy when there are CONFLICT products', async () => {
    mockVerifyAdminAccess.mockResolvedValue({ authorized: true, user: { id: 'u', email: 'a@b', role: 'ADMIN' } });
    prismaMock.squareWriteJob.groupBy.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(3);
    prismaMock.squareWriteJob.findFirst.mockResolvedValue(null);
    prismaMock.squareWriteJob.findMany.mockResolvedValue([]);
    prismaMock.recentSquareWrite.count.mockResolvedValue(0);

    const res = await GET();
    const body = await res.json();
    expect(body.health).toBe('unhealthy');
    expect(body.products.conflictCount).toBe(3);
  });

  it('returns degraded when oldest pending job is older than 5 minutes', async () => {
    mockVerifyAdminAccess.mockResolvedValue({ authorized: true, user: { id: 'u', email: 'a@b', role: 'ADMIN' } });
    prismaMock.squareWriteJob.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { _all: 1 } },
    ]);
    prismaMock.product.count.mockResolvedValue(0);
    const sixMinAgo = new Date(Date.now() - 6 * 60_000);
    prismaMock.squareWriteJob.findFirst
      .mockResolvedValueOnce(null) // last succeeded
      .mockResolvedValueOnce({
        createdAt: sixMinAgo,
        attempts: 0,
        operation: 'CREATE',
        productId: 'p2',
      });
    prismaMock.squareWriteJob.findMany.mockResolvedValue([]);
    prismaMock.recentSquareWrite.count.mockResolvedValue(0);

    const res = await GET();
    const body = await res.json();
    expect(body.health).toBe('degraded');
    expect(body.jobs.oldestPending.ageMs).toBeGreaterThan(5 * 60_000);
  });
});
