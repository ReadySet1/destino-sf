/**
 * Unit tests for echo-suppression record/check behavior.
 */

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const prismaMock = {
  recentSquareWrite: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};
jest.mock('@/lib/db-unified', () => ({ prisma: prismaMock }));

import {
  recordSquareWrite,
  wasRecentlyWrittenByUs,
  pruneExpiredEchoRecords,
} from '@/lib/square/echo-suppression';

beforeEach(() => jest.clearAllMocks());

describe('recordSquareWrite', () => {
  it('upserts a row keyed by (squareId, version)', async () => {
    prismaMock.recentSquareWrite.upsert.mockResolvedValue({});
    await recordSquareWrite('SQ-1', 17n);
    expect(prismaMock.recentSquareWrite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { squareId_version: { squareId: 'SQ-1', version: 17n } },
      })
    );
  });

  it('coerces a number version to BigInt', async () => {
    prismaMock.recentSquareWrite.upsert.mockResolvedValue({});
    await recordSquareWrite('SQ-2', 3);
    expect(prismaMock.recentSquareWrite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { squareId_version: { squareId: 'SQ-2', version: 3n } },
      })
    );
  });

  it('swallows DB errors (never throws into callers)', async () => {
    prismaMock.recentSquareWrite.upsert.mockRejectedValue(new Error('db down'));
    await expect(recordSquareWrite('SQ-3', 1n)).resolves.toBeUndefined();
  });
});

describe('wasRecentlyWrittenByUs', () => {
  it('returns true for a record inside the TTL window', async () => {
    prismaMock.recentSquareWrite.findUnique.mockResolvedValue({ writtenAt: new Date() });
    await expect(wasRecentlyWrittenByUs('SQ-1', 1n)).resolves.toBe(true);
  });

  it('returns false and GCs a stale record', async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    prismaMock.recentSquareWrite.findUnique.mockResolvedValue({ writtenAt: stale });
    prismaMock.recentSquareWrite.delete.mockResolvedValue({});
    await expect(wasRecentlyWrittenByUs('SQ-1', 1n)).resolves.toBe(false);
    expect(prismaMock.recentSquareWrite.delete).toHaveBeenCalled();
  });

  it('returns false when no record exists', async () => {
    prismaMock.recentSquareWrite.findUnique.mockResolvedValue(null);
    await expect(wasRecentlyWrittenByUs('SQ-1', 1n)).resolves.toBe(false);
  });
});

describe('pruneExpiredEchoRecords', () => {
  it('deletes rows older than TTL and returns count', async () => {
    prismaMock.recentSquareWrite.deleteMany.mockResolvedValue({ count: 3 });
    const count = await pruneExpiredEchoRecords();
    expect(count).toBe(3);
    const call = prismaMock.recentSquareWrite.deleteMany.mock.calls[0][0];
    expect(call.where.writtenAt.lt).toBeInstanceOf(Date);
  });
});
