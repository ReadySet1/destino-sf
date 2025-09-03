/**
 * Tests for Prisma prepared statement connection pool fixes
 * 
 * These tests verify that the database connection manager properly handles
 * prepared statement errors and retries with appropriate backoff.
 */

import { withRetry, withConnectionManagement, checkDatabaseHealth } from '@/lib/db';

// Mock Prisma client for testing
const mockPrisma = {
  $queryRaw: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock console.log to avoid noise during testing
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  jest.clearAllMocks();
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('Database Connection Management', () => {
  describe('Prepared Statement Error Handling', () => {
    it('should retry on prepared statement does not exist error (26000)', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({
          code: '26000',
          message: 'prepared statement "s0" does not exist'
        })
        .mockResolvedValueOnce({ id: '123', data: 'success' });

      const result = await withRetry(mockOperation, 3, 100);

      expect(result).toEqual({ id: '123', data: 'success' });
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should retry on prepared statement already exists error (42P05)', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({
          code: '42P05',
          message: 'prepared statement "s0" already exists'
        })
        .mockResolvedValueOnce({ id: '456', data: 'success' });

      const result = await withRetry(mockOperation, 3, 100);

      expect(result).toEqual({ id: '456', data: 'success' });
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should respect max retries limit for persistent errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue({
          code: '26000',
          message: 'prepared statement error'
        });

      await expect(withRetry(mockOperation, 2, 50)).rejects.toThrow();
      expect(mockOperation).toHaveBeenCalledTimes(2); // initial + 1 retry
    });

    it('should handle prepared statement errors in connection management wrapper', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({
          code: '42P05',
          message: 'prepared statement "stmt1" already exists'
        })
        .mockResolvedValueOnce({ success: true });

      const result = await withConnectionManagement(
        mockOperation,
        'test-operation',
        5000
      );

      expect(result).toEqual({ success: true });
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection Health Check', () => {
    it('should perform basic health check', async () => {
      // This will test against actual environment or mock depending on setup
      const health = await checkDatabaseHealth();
      
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('latency');
      expect(typeof health.connected).toBe('boolean');
      expect(typeof health.latency).toBe('number');
    });
  });

  describe('Error Classification', () => {
    it('should identify retryable connection errors', async () => {
      const connectionErrors = [
        { code: 'P1001', message: "Can't reach database server" },
        { code: 'P1008', message: 'Operations timed out' },
        { code: 'P1017', message: 'Server has closed the connection' },
        { message: 'Connection terminated unexpectedly' },
        { message: 'ECONNRESET' },
        { message: 'ETIMEDOUT' }
      ];

      for (const error of connectionErrors) {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce({ recovered: true });

        const result = await withRetry(mockOperation, 2, 50);
        expect(result).toEqual({ recovered: true });
        expect(mockOperation).toHaveBeenCalledTimes(2);
      }
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = {
        code: 'P2002', // Unique constraint violation
        message: 'Unique constraint failed'
      };

      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(withRetry(mockOperation, 3, 50)).rejects.toMatchObject(nonRetryableError);
      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running operations', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 1000));

      await expect(
        withConnectionManagement(slowOperation, 'slow-test', 500)
      ).rejects.toThrow('slow-test timed out after 500ms');
    });
  });
});

describe('Integration Test Scenarios', () => {
  it('should handle realistic prepared statement error scenarios', async () => {
    // Simulate a scenario where the first query fails with prepared statement error
    // but subsequent queries succeed
    const mockDatabaseOperation = jest.fn()
      .mockRejectedValueOnce({
        code: '26000',
        message: 'prepared statement "s1" does not exist'
      })
      .mockResolvedValueOnce([
        { id: '1', name: 'Test Order 1' },
        { id: '2', name: 'Test Order 2' }
      ]);

    const result = await withConnectionManagement(
      mockDatabaseOperation,
      'fetch-orders',
      10000
    );

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Test Order 1');
    expect(mockDatabaseOperation).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple consecutive prepared statement errors', async () => {
    // Test scenario where multiple retries are needed
    const mockOperation = jest.fn()
      .mockRejectedValueOnce({ code: '26000', message: 'prepared statement "s1" does not exist' })
      .mockRejectedValueOnce({ code: '42P05', message: 'prepared statement "s2" already exists' })
      .mockResolvedValueOnce({ success: true, data: 'finally worked' });

    const result = await withRetry(mockOperation, 3, 50);

    expect(result).toEqual({ success: true, data: 'finally worked' });
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });
});
