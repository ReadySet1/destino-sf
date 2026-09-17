/**
 * db-utils must never disconnect the shared db-unified client directly.
 *
 * `prisma.$disconnect()` on the singleton leaves a dead client published for
 * every other request in the process (the 2026-09-16 outage). Recovery has
 * to go through db-unified's own helpers, which unpublish the client before
 * touching it.
 *
 * `@/lib/db-unified` is replaced by the global mock in jest.setup.enhanced.js.
 */
import { prisma, forceResetConnection, shutdown } from '@/lib/db-unified';
import { withDatabaseConnection, gracefulDatabaseShutdown } from '@/lib/db-utils';

// Keep the fallback-value branch deterministic: build-time detection must not
// short-circuit the retry loop under NODE_ENV=test.
jest.mock('@/lib/build-time-utils', () => ({ isBuildTime: () => false }));

const mockedReset = forceResetConnection as jest.MockedFunction<typeof forceResetConnection>;
const mockedShutdown = shutdown as jest.MockedFunction<typeof shutdown>;
const mockedDisconnect = prisma.$disconnect as jest.MockedFunction<typeof prisma.$disconnect>;

describe('db-utils and the shared Prisma client', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('withDatabaseConnection()', () => {
    // The inner withRetry() already discards a dead client and backs off on
    // engine-level errors, and deliberately keeps the client on pool-full
    // errors. This outer loop must only add a longer backoff: resetting the
    // shared client here doubled connection pressure exactly when the pooler
    // was already exhausted.
    it('retries a connection error with backoff without touching the shared client', async () => {
      const connectionError = Object.assign(new Error("Can't reach database server"), {
        code: 'P1001',
      });
      const operation = jest
        .fn<Promise<string>, []>()
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce('ok');

      const result = withDatabaseConnection(operation, 3);

      // Attempt 1 backs off 2^1 * 1000 ms before retrying.
      await jest.advanceTimersByTimeAsync(2_500);

      await expect(result).resolves.toBe('ok');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(mockedReset).not.toHaveBeenCalled();
      expect(mockedDisconnect).not.toHaveBeenCalled();
    });

    it('does not reset the client on a non-connection error', async () => {
      const operation = jest.fn<Promise<string>, []>().mockRejectedValue(new Error('bad input'));

      await expect(withDatabaseConnection(operation, 3)).rejects.toThrow('bad input');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockedReset).not.toHaveBeenCalled();
      expect(mockedDisconnect).not.toHaveBeenCalled();
    });

    it('returns the fallback after every retry fails with a connection error', async () => {
      const poolTimeout = Object.assign(new Error('Timed out fetching a new connection'), {
        code: 'P2024',
      });
      const operation = jest.fn<Promise<string>, []>().mockRejectedValue(poolTimeout);

      const result = withDatabaseConnection(operation, 3, 'fallback');

      // Backoff is 2 s after attempt 1 and 4 s after attempt 2.
      await jest.advanceTimersByTimeAsync(6_500);

      await expect(result).resolves.toBe('fallback');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(mockedReset).not.toHaveBeenCalled();
      expect(mockedDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('gracefulDatabaseShutdown()', () => {
    it('delegates to db-unified shutdown so the singleton is unpublished', async () => {
      await expect(gracefulDatabaseShutdown()).resolves.toBeUndefined();

      expect(mockedShutdown).toHaveBeenCalledTimes(1);
      expect(mockedDisconnect).not.toHaveBeenCalled();
    });

    it('rethrows when db-unified shutdown fails', async () => {
      mockedShutdown.mockRejectedValueOnce(new Error('teardown failed'));

      await expect(gracefulDatabaseShutdown()).rejects.toThrow('teardown failed');

      expect(mockedShutdown).toHaveBeenCalledTimes(1);
      expect(mockedDisconnect).not.toHaveBeenCalled();
    });
  });
});
