/**
 * Integration tests for GET /api/admin/sync/history
 *
 * Verifies:
 *  - Admins see syncs across all admins (no userId filter)
 *  - Non-admins (defensive) only see their own syncs (userId filter retained)
 *  - 401/403 short-circuit when verifyAdminAccess fails
 *  - Response shape includes startedBy per row
 */

import { NextRequest } from 'next/server';

const mockVerifyAdminAccess = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockGroupBy = jest.fn();

jest.mock('@/lib/auth/admin-guard', () => ({
  verifyAdminAccess: (...args: unknown[]) => mockVerifyAdminAccess(...args),
}));

jest.mock('@/lib/db-unified', () => ({
  prisma: {
    userSyncLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
  },
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [] })),
}));

function createRequest(qs = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/sync/history${qs}`, {
    method: 'GET',
  });
}

describe('GET /api/admin/sync/history', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ GET } = await import('@/app/api/admin/sync/history/route'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    mockGroupBy.mockResolvedValue([]);
  });

  describe('auth gating', () => {
    it('returns 401 when not authenticated', async () => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: false,
        error: 'Authentication required',
        statusCode: 401,
      });

      const res = await GET(createRequest());
      expect(res.status).toBe(401);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('returns 403 when user is not admin', async () => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: false,
        error: 'Admin access required',
        statusCode: 403,
      });

      const res = await GET(createRequest());
      expect(res.status).toBe(403);
      expect(mockFindMany).not.toHaveBeenCalled();
    });
  });

  describe('cross-admin visibility', () => {
    beforeEach(() => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: true,
        user: { id: 'admin-emmanuel', email: 'emmanuel@test.com', role: 'ADMIN' },
      });
    });

    it('omits userId filter when role is ADMIN (list query)', async () => {
      await GET(createRequest('?days=30&limit=10'));

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('userId');
      expect(callArgs.where.startTime).toBeDefined();
    });

    it('omits userId filter from totalSyncs count for ADMIN', async () => {
      await GET(createRequest());

      expect(mockCount).toHaveBeenCalledTimes(1);
      const where = mockCount.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('userId');
    });

    it('omits userId filter from last7Days groupBy for ADMIN', async () => {
      await GET(createRequest());

      expect(mockGroupBy).toHaveBeenCalledTimes(1);
      const where = mockGroupBy.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('userId');
      expect(where.startTime).toBeDefined();
    });

    it('returns startedBy in formatted history rows', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'log-1',
          syncId: 'sync-abc',
          status: 'COMPLETED',
          startTime: new Date('2026-04-25T00:45:00Z'),
          endTime: new Date('2026-04-25T00:46:00Z'),
          progress: 100,
          message: 'Sync completed successfully - 116 items synced',
          currentStep: null,
          results: { syncedProducts: 116, skippedProducts: 0, warnings: 0, errors: 0 },
          errors: null,
          options: null,
          startedBy: 'Emmanuel (emmanuel@alanis.dev)',
        },
      ]);
      mockCount.mockResolvedValue(1);

      const res = await GET(createRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.history).toHaveLength(1);
      expect(body.history[0].startedBy).toBe('Emmanuel (emmanuel@alanis.dev)');
    });
  });

  describe('non-admin defensive scoping', () => {
    it('retains userId filter when role is CUSTOMER (defensive — route is admin-gated)', async () => {
      // Hypothetical case: verifyAdminAccess returns authorized=true but role=CUSTOMER.
      // The route's per-user fallback should engage so we never accidentally widen scope.
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: true,
        user: { id: 'customer-123', email: 'c@test.com', role: 'CUSTOMER' },
      });

      await GET(createRequest());

      const listWhere = mockFindMany.mock.calls[0][0].where;
      expect(listWhere.userId).toBe('customer-123');

      const countWhere = mockCount.mock.calls[0][0].where;
      expect(countWhere.userId).toBe('customer-123');

      const groupByWhere = mockGroupBy.mock.calls[0][0].where;
      expect(groupByWhere.userId).toBe('customer-123');
    });
  });
});
