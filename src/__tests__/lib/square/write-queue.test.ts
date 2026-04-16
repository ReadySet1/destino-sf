/**
 * Unit tests for the Destino → Square write queue.
 *
 * Mocks Prisma and the underlying `catalog-write` client; we exercise the
 * enqueue/drain/backoff logic and the terminal-state handling for permanent
 * vs. retryable failures.
 */

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const prismaMock = {
  squareWriteJob: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  product: {
    update: jest.fn(),
  },
  recentSquareWrite: {
    upsert: jest.fn(),
  },
};
jest.mock('@/lib/db-unified', () => ({ prisma: prismaMock }));

const catalogWriteMock = {
  createSquareItem: jest.fn(),
  updateSquareItem: jest.fn(),
  archiveSquareItem: jest.fn(),
};

import { SquareWriteError } from '@/lib/square/catalog-write';
jest.mock('@/lib/square/catalog-write', () => {
  const actual = jest.requireActual('@/lib/square/catalog-write');
  return {
    ...actual,
    createSquareItem: (...args: unknown[]) => catalogWriteMock.createSquareItem(...args),
    updateSquareItem: (...args: unknown[]) => catalogWriteMock.updateSquareItem(...args),
    archiveSquareItem: (...args: unknown[]) => catalogWriteMock.archiveSquareItem(...args),
  };
});

import {
  enqueueSquareWrite,
  isWritebackEnabled,
  processNextJob,
} from '@/lib/square/write-queue';

beforeEach(() => jest.clearAllMocks());

describe('isWritebackEnabled', () => {
  const orig = process.env.ENABLE_SQUARE_WRITEBACK;
  afterAll(() => {
    process.env.ENABLE_SQUARE_WRITEBACK = orig;
  });

  it('gates on the env flag', () => {
    process.env.ENABLE_SQUARE_WRITEBACK = 'true';
    expect(isWritebackEnabled()).toBe(true);
    process.env.ENABLE_SQUARE_WRITEBACK = 'false';
    expect(isWritebackEnabled()).toBe(false);
    delete process.env.ENABLE_SQUARE_WRITEBACK;
    expect(isWritebackEnabled()).toBe(false);
  });
});

describe('enqueueSquareWrite', () => {
  it('persists a PENDING job with a generated idempotency key', async () => {
    prismaMock.squareWriteJob.create.mockResolvedValue({
      id: 'job-1',
      idempotencyKey: 'idem-1',
    });

    const res = await enqueueSquareWrite({
      productId: 'prod-1',
      operation: 'CREATE',
      payload: { name: 'x', priceDollars: 1 } as any,
    });

    expect(res).toEqual({ jobId: 'job-1', idempotencyKey: 'idem-1' });
    const call = prismaMock.squareWriteJob.create.mock.calls[0][0];
    expect(call.data.productId).toBe('prod-1');
    expect(call.data.operation).toBe('CREATE');
    expect(call.data.status).toBe('PENDING');
    expect(typeof call.data.idempotencyKey).toBe('string');
    expect(call.data.idempotencyKey.length).toBeGreaterThan(10);
  });
});

describe('processNextJob', () => {
  it('returns null when no PENDING job is eligible', async () => {
    prismaMock.squareWriteJob.findFirst.mockResolvedValue(null);
    await expect(processNextJob()).resolves.toBeNull();
  });

  it('marks SUCCEEDED and persists squareId/version on CREATE', async () => {
    prismaMock.squareWriteJob.findFirst.mockResolvedValue({ id: 'job-c' });
    prismaMock.squareWriteJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.squareWriteJob.findUnique.mockResolvedValue({
      id: 'job-c',
      productId: 'prod-c',
      operation: 'CREATE',
      payload: { name: 'Empanada', priceDollars: 8.99 },
      idempotencyKey: 'idem-c',
      attempts: 1,
    });
    catalogWriteMock.createSquareItem.mockResolvedValue({
      squareId: 'SQ-NEW',
      squareVariationId: 'SQ-VAR',
      version: 5n,
    });
    prismaMock.product.update.mockResolvedValue({});
    prismaMock.recentSquareWrite.upsert.mockResolvedValue({});
    prismaMock.squareWriteJob.update.mockResolvedValue({});

    const res = await processNextJob();

    expect(res?.outcome).toBe('SUCCEEDED');
    expect(prismaMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-c' },
        data: expect.objectContaining({ squareId: 'SQ-NEW', squareVersion: 5n, syncStatus: 'SYNCED' }),
      })
    );
    // SUCCEEDED transition
    expect(prismaMock.squareWriteJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-c' },
        data: expect.objectContaining({ status: 'SUCCEEDED' }),
      })
    );
  });

  it('schedules a retry with backoff on a retryable error', async () => {
    prismaMock.squareWriteJob.findFirst.mockResolvedValue({ id: 'job-r' });
    prismaMock.squareWriteJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.squareWriteJob.findUnique.mockResolvedValue({
      id: 'job-r',
      productId: 'prod-r',
      operation: 'CREATE',
      payload: { name: 'x', priceDollars: 1 },
      idempotencyKey: 'idem-r',
      attempts: 1,
    });
    catalogWriteMock.createSquareItem.mockRejectedValue(
      new SquareWriteError('SERVER', '5xx', 502, {})
    );
    prismaMock.squareWriteJob.update.mockResolvedValue({});

    const res = await processNextJob();
    expect(res?.outcome).toBe('RETRY');
    const retryCall = prismaMock.squareWriteJob.update.mock.calls[0][0];
    expect(retryCall.data.status).toBe('PENDING');
    expect(retryCall.data.nextAttemptAt).toBeInstanceOf(Date);
    expect(retryCall.data.lastError).toContain('5xx');
  });

  it('marks FAILED and flags product CONFLICT on VERSION_MISMATCH', async () => {
    prismaMock.squareWriteJob.findFirst.mockResolvedValue({ id: 'job-v' });
    prismaMock.squareWriteJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.squareWriteJob.findUnique.mockResolvedValue({
      id: 'job-v',
      productId: 'prod-v',
      operation: 'UPDATE',
      payload: {
        squareId: 'SQ-1',
        squareVariationId: 'V-1',
        currentVersion: '10',
        name: 'x',
        priceDollars: 2,
      },
      idempotencyKey: 'idem-v',
      attempts: 1,
    });
    catalogWriteMock.updateSquareItem.mockRejectedValue(
      new SquareWriteError('VERSION_MISMATCH', 'version mismatch', 400, {})
    );
    prismaMock.squareWriteJob.update.mockResolvedValue({});
    prismaMock.product.update.mockResolvedValue({});

    const res = await processNextJob();
    expect(res?.outcome).toBe('FAILED');
    // Job marked FAILED
    expect(prismaMock.squareWriteJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
    );
    // Product flagged CONFLICT
    expect(prismaMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-v' },
        data: expect.objectContaining({ syncStatus: 'CONFLICT' }),
      })
    );
  });

  it('marks DEAD after exceeding MAX_ATTEMPTS on retryable errors', async () => {
    prismaMock.squareWriteJob.findFirst.mockResolvedValue({ id: 'job-d' });
    prismaMock.squareWriteJob.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.squareWriteJob.findUnique.mockResolvedValue({
      id: 'job-d',
      productId: 'prod-d',
      operation: 'CREATE',
      payload: { name: 'x', priceDollars: 1 },
      idempotencyKey: 'idem-d',
      attempts: 5, // already at MAX_ATTEMPTS after increment
    });
    catalogWriteMock.createSquareItem.mockRejectedValue(
      new SquareWriteError('SERVER', '5xx', 500, {})
    );
    prismaMock.squareWriteJob.update.mockResolvedValue({});

    const res = await processNextJob();
    expect(res?.outcome).toBe('DEAD');
    expect(prismaMock.squareWriteJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DEAD' }) })
    );
  });

  it('skips when atomic claim loses the race (updateMany count=0)', async () => {
    prismaMock.squareWriteJob.findFirst.mockResolvedValue({ id: 'job-race' });
    prismaMock.squareWriteJob.updateMany.mockResolvedValue({ count: 0 });
    await expect(processNextJob()).resolves.toBeNull();
  });
});
