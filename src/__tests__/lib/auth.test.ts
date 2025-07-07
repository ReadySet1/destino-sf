import { getCurrentUser, requireAdmin, checkIsAdmin } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';

// Mock dependencies
jest.mock('@/utils/supabase/server');

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
} as any;

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Authentication System (Phase 2 - Security & Access Control)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabase);
    
    // Default successful auth response
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123', 
          email: 'test@example.com',
          user_metadata: {},
          app_metadata: {},
        } 
      },
      error: null,
    });
    
    // Setup default profile query chain
    const mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    
    mockSupabase.from.mockReturnValue(mockQueryChain);
    mockQueryChain.single.mockResolvedValue({
      data: { role: 'ADMIN' },
      error: null,
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authentication is valid', async () => {
      const user = await getCurrentUser();

      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
        app_metadata: {},
      });

      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
    });

    it('should return null when no user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null when authentication error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT token' },
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should handle Supabase client creation errors', async () => {
      mockCreateClient.mockRejectedValue(new Error('Supabase connection failed'));

      await expect(getCurrentUser()).rejects.toThrow('Supabase connection failed');
    });

    it('should handle malformed user data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: null, email: undefined } },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toEqual({ id: null, email: undefined });
    });
  });

  describe('requireAdmin', () => {
    it('should return user and profile for valid admin', async () => {
      const result = await requireAdmin();

      expect(result).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
          app_metadata: {},
        },
        profile: { role: 'ADMIN' },
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should throw error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(requireAdmin()).rejects.toThrow('Authentication required');
    });

    it('should throw error when user is not admin', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'USER' },
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });

    it('should throw error when profile query fails', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' },
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });

    it('should throw error when profile has no role', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: null },
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });

    it('should handle database connection errors', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Database connection lost');
    });

    it('should verify correct user ID is used in profile query', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'ADMIN' },
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await requireAdmin();

      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'user-123');
    });
  });

  describe('checkIsAdmin', () => {
    it('should return true for admin user', async () => {
      const isAdmin = await checkIsAdmin('user-456');

      expect(isAdmin).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should return false for non-admin user', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'USER' },
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      const isAdmin = await checkIsAdmin('user-456');

      expect(isAdmin).toBe(false);
    });

    it('should return false when profile query fails', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' },
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      const isAdmin = await checkIsAdmin('user-456');

      expect(isAdmin).toBe(false);
    });

    it('should return false when user has no role', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: null },
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      const isAdmin = await checkIsAdmin('user-456');

      expect(isAdmin).toBe(false);
    });

    it('should return false when exception occurs', async () => {
      mockCreateClient.mockRejectedValue(new Error('Database unreachable'));

      const isAdmin = await checkIsAdmin('user-456');

      expect(isAdmin).toBe(false);
    });

    it('should handle invalid user IDs gracefully', async () => {
      const isAdmin = await checkIsAdmin('');

      expect(isAdmin).toBe(false);
    });

    it('should handle null user ID gracefully', async () => {
      const isAdmin = await checkIsAdmin(null as any);

      expect(isAdmin).toBe(false);
    });

    it('should verify correct user ID is used in query', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'ADMIN' },
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await checkIsAdmin('specific-user-id');

      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'specific-user-id');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle concurrent authentication checks', async () => {
      const promises = Array.from({ length: 10 }, () => getCurrentUser());
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(results.every(user => user?.id === 'user-123')).toBe(true);
    });

    it('should handle admin check race conditions', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const promises = userIds.map(id => checkIsAdmin(id));
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results.every(result => typeof result === 'boolean')).toBe(true);
    });

    it('should handle malformed JWT tokens', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { 
          message: 'Invalid JWT: malformed token',
          status: 401,
        },
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should handle expired tokens', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { 
          message: 'JWT expired',
          status: 401,
        },
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      
      mockSupabase.auth.getUser.mockRejectedValue(timeoutError);

      await expect(getCurrentUser()).rejects.toThrow('Network timeout');
    });

    it('should validate role string comparison is case-sensitive', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' }, // lowercase
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });

    it('should handle role with extra whitespace', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: ' ADMIN ' }, // with whitespace
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });

    it('should handle multiple roles (should fail)', async () => {
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'USER,ADMIN' }, // multiple roles
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });
  });

  describe('Performance and Caching', () => {
    it('should perform authentication check efficiently', async () => {
      const startTime = Date.now();
      
      await getCurrentUser();
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete quickly (under 100ms in test environment)
      expect(executionTime).toBeLessThan(100);
    });

    it('should handle high-volume admin checks', async () => {
      const startTime = Date.now();
      
      // Simulate checking admin status for 50 users
      const promises = Array.from({ length: 50 }, (_, i) => 
        checkIsAdmin(`user-${i}`)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should handle volume efficiently (under 500ms for 50 checks)
      expect(executionTime).toBeLessThan(500);
    });

    it('should not create excessive database connections', async () => {
      await getCurrentUser();
      await requireAdmin();
      await checkIsAdmin('user-123');

      // Each function should create its own client
      expect(mockCreateClient).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration with Error Monitoring', () => {
    it('should propagate authentication errors for monitoring', async () => {
      const authError = new Error('Authentication service unavailable');
      authError.name = 'AuthServiceError';
      
      mockSupabase.auth.getUser.mockRejectedValue(authError);

      await expect(getCurrentUser()).rejects.toThrow('Authentication service unavailable');
    });

    it('should propagate database errors for monitoring', async () => {
      const dbError = new Error('Database connection pool exhausted');
      dbError.name = 'DatabaseError';
      
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(dbError),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Database connection pool exhausted');
    });

    it('should handle permission errors appropriately', async () => {
      const permissionError = new Error('Insufficient privileges');
      permissionError.name = 'PermissionError';
      
      const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(permissionError),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryChain);

      await expect(requireAdmin()).rejects.toThrow('Insufficient privileges');
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should handle user data with XSS attempts', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123',
            email: '<script>alert("xss")</script>@test.com',
            user_metadata: {
              name: '<img src=x onerror=alert(1)>',
            },
          } 
        },
        error: null,
      });

      const user = await getCurrentUser();

      // Should return the data as-is (sanitization should happen at display level)
      expect(user?.email).toBe('<script>alert("xss")</script>@test.com');
      expect(user?.user_metadata.name).toBe('<img src=x onerror=alert(1)>');
    });

    it('should handle SQL injection attempts in user ID', async () => {
      const maliciousUserId = "'; DROP TABLE profiles; --";
      
      // Should not cause SQL injection (parameterized queries should protect)
      const isAdmin = await checkIsAdmin(maliciousUserId);

      expect(isAdmin).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should handle extremely long user IDs', async () => {
      const longUserId = 'a'.repeat(10000);
      
      const isAdmin = await checkIsAdmin(longUserId);

      expect(isAdmin).toBe(false);
    });

    it('should handle unicode characters in user IDs', async () => {
      const unicodeUserId = '用户-123-🚀';
      
      const isAdmin = await checkIsAdmin(unicodeUserId);

      expect(isAdmin).toBe(false);
    });
  });
}); 