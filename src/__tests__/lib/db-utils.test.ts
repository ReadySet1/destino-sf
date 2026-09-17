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
    it('recovers from a connection error through forceResetConnection, not a direct $disconnect', async () => {
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
      expect(mockedReset).toHaveBeenCalledTimes(1);
      expect(mockedDisconnect).not.toHaveBeenCalled();
    });

    it('does not reset the client on a non-connection error', async () => {
      const operation = jest.fn<Promise<string>, []>().mockRejectedValue(new Error('bad input'));

      await expect(withDatabaseConnection(operation, 3)).rejects.toThrow('bad input');

      expect(operation).toHaveBeenCalledTimes(1);
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
  });
});
