/**
 * Admin Auth Guard Integration Tests
 *
 * Verifies that admin API routes properly enforce authentication
 * by mocking verifyAdminAccess at the module level and testing
 * representative routes respond correctly to different auth states.
 */

import { NextRequest } from 'next/server';

const mockVerifyAdminAccess = jest.fn();

// Mock the admin guard module
jest.mock('@/lib/auth/admin-guard', () => ({
  verifyAdminAccess: (...args: unknown[]) => mockVerifyAdminAccess(...args),
  requireAdminAccess: jest.fn(),
}));

// Mock DB to prevent real queries
jest.mock('@/lib/db-unified', () => ({
  prisma: {
    setting: { findMany: jest.fn().mockResolvedValue([]) },
    webhookLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  },
  withRetry: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [] })),
}));

function createRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method: 'GET' });
}

describe('Admin Route Auth Guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/settings', () => {
    let GET: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      ({ GET } = await import('@/app/api/admin/settings/route'));
    });

    it('returns 401 when not authenticated', async () => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: false,
        error: 'Authentication required',
        statusCode: 401,
      });

      const response = await GET(createRequest('/api/admin/settings'));
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 when not admin', async () => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: false,
        error: 'Admin access required',
        statusCode: 403,
      });

      const response = await GET(createRequest('/api/admin/settings'));
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Admin access required');
    });

    it('allows admin users through', async () => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: true,
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
      });

      const response = await GET(createRequest('/api/admin/settings'));
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/admin/webhook-metrics', () => {
    let GET: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      ({ GET } = await import('@/app/api/admin/webhook-metrics/route'));
    });

    it('returns 401 when not authenticated', async () => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: false,
        error: 'Authentication required',
        statusCode: 401,
      });

      const response = await GET(createRequest('/api/admin/webhook-metrics'));
      expect(response.status).toBe(401);
    });

    it('returns 403 when not admin', async () => {
      mockVerifyAdminAccess.mockResolvedValue({
        authorized: false,
        error: 'Admin access required',
        statusCode: 403,
      });

      const response = await GET(createRequest('/api/admin/webhook-metrics'));
      expect(response.status).toBe(403);
    });
  });
});
