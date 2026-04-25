/**
 * Integration tests for Destino → Square writeback.
 *
 * Uses the real test database. Mocks only the Square HTTP client so we
 * don't hit the network. Verifies the full enqueue → drain → product-update
 * pipeline, plus echo suppression and conflict handling.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getTestPrismaClient } from '../utils/database-test-utils';

declare global {
  // eslint-disable-next-line no-var
  var __DATABASE_AVAILABLE__: (() => boolean) | undefined;
}

const isDbAvailable = () =>
  typeof global.__DATABASE_AVAILABLE__ === 'function' && global.__DATABASE_AVAILABLE__();

const skipIfNoDb = () => !isDbAvailable();

// Mock the Square HTTPS client at module boundary so the queue worker
// exercises real Prisma writes without calling Square.
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockArchive = jest.fn();

jest.mock('@/lib/square/catalog-write', () => {
  const actual = jest.requireActual('@/lib/square/catalog-write');
  return {
    ...actual,
    createSquareItem: (...args: unknown[]) => mockCreate(...args),
    updateSquareItem: (...args: unknown[]) => mockUpdate(...args),
    archiveSquareItem: (...args: unknown[]) => mockArchive(...args),
  };
});

// Ensure the unified Prisma singleton points at the test DB.
jest.mock('@/lib/db-unified', () => {
  const { getTestPrismaClient } = require('../utils/database-test-utils');
  return { prisma: getTestPrismaClient(), withRetry: (fn: () => unknown) => fn() };
});

import {
  enqueueSquareWrite,
  processNextJob,
  drainOnce,
} from '@/lib/square/write-queue';
import { SquareWriteError } from '@/lib/square/catalog-write';
import {
  recordSquareWrite,
  wasRecentlyWrittenByUs,
  pruneExpiredEchoRecords,
} from '@/lib/square/echo-suppression';

const prisma = getTestPrismaClient();

async function seedCategory(name = 'Integration Test Cat'): Promise<string> {
  const cat = await prisma.category.create({
    data: { name, slug: `integration-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
  });
  return cat.id;
}

async function seedProduct(params: {
  categoryId: string;
  squareId?: string;
  squareVersion?: bigint | null;
}): Promise<{ id: string; squareId: string }> {
  const squareId = params.squareId ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const product = await prisma.product.create({
    data: {
      name: 'Test Empanada',
      description: 'Test',
      price: 8.99,
      categoryId: params.categoryId,
      images: [],
      squareId,
      squareVersion: params.squareVersion ?? null,
      slug: `test-empanada-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      syncStatus: params.squareId ? 'SYNCED' : 'PENDING',
      syncSource: 'LOCAL',
    },
  });
  return { id: product.id, squareId: product.squareId };
}

beforeAll(() => {
  if (skipIfNoDb()) {
    console.log('⚠️ Skipping Square writeback integration tests — no DB available');
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  if (isDbAvailable()) {
    await prisma.$disconnect();
  }
});

describe('enqueue → drain: CREATE', () => {
  it('persists real Square ID + version and records echo row', async () => {
    if (skipIfNoDb()) return;
    const categoryId = await seedCategory();
    const product = await seedProduct({ categoryId });

    mockCreate.mockResolvedValue({
      squareId: 'SQ-CREATED-1',
      squareVariationId: 'SQ-VAR-1',
      version: 12n,
    });

    const { jobId } = await enqueueSquareWrite({
      productId: product.id,
      operation: 'CREATE',
      payload: {
        name: 'Test Empanada',
        description: 'Test',
        priceDollars: 8.99,
        squareCategoryId: null,
        imageIds: [],
      },
    });
    expect(jobId).toBeTruthy();

    const outcome = await processNextJob();
    expect(outcome?.outcome).toBe('SUCCEEDED');
    expect(mockCreate).toHaveBeenCalledTimes(1);

    const updatedJob = await prisma.squareWriteJob.findUnique({ where: { id: jobId } });
    expect(updatedJob?.status).toBe('SUCCEEDED');
    expect(updatedJob?.succeededAt).toBeInstanceOf(Date);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.squareId).toBe('SQ-CREATED-1');
    expect(updatedProduct?.squareVersion?.toString()).toBe('12');
    expect(updatedProduct?.syncStatus).toBe('SYNCED');

    // Echo record persisted
    const echo = await prisma.recentSquareWrite.findUnique({
      where: { squareId_version: { squareId: 'SQ-CREATED-1', version: 12n } },
    });
    expect(echo).not.toBeNull();
  });
});

describe('enqueue → drain: UPDATE with VERSION_MISMATCH', () => {
  it('marks job FAILED and product CONFLICT', async () => {
    if (skipIfNoDb()) return;
    const categoryId = await seedCategory();
    const product = await seedProduct({
      categoryId,
      squareId: 'SQ-EXIST-1',
      squareVersion: 10n,
    });
    // Ensure there's a variant record so the real admin path would work, though
    // this test enqueues directly, so variant is not required.

    mockUpdate.mockRejectedValue(new SquareWriteError('VERSION_MISMATCH', 'stale version', 400, {}));

    const { jobId } = await enqueueSquareWrite({
      productId: product.id,
      operation: 'UPDATE',
      payload: {
        squareId: 'SQ-EXIST-1',
        squareVariationId: 'SQ-VAR-X',
        currentVersion: '10',
        name: 'Renamed',
        description: null,
        priceDollars: 9.99,
        squareCategoryId: null,
        imageIds: [],
      },
    });
    const outcome = await processNextJob();
    expect(outcome?.outcome).toBe('FAILED');

    const updatedJob = await prisma.squareWriteJob.findUnique({ where: { id: jobId } });
    expect(updatedJob?.status).toBe('FAILED');
    expect(updatedJob?.lastError).toMatch(/stale version/);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.syncStatus).toBe('CONFLICT');
  });
});

describe('enqueue → drain: ARCHIVE', () => {
  it('calls Square archive and marks the job SUCCEEDED', async () => {
    if (skipIfNoDb()) return;
    const categoryId = await seedCategory();
    const product = await seedProduct({
      categoryId,
      squareId: 'SQ-ARCH-1',
      squareVersion: 3n,
    });

    mockArchive.mockResolvedValue(undefined);

    const { jobId } = await enqueueSquareWrite({
      productId: product.id,
      operation: 'ARCHIVE',
      payload: {
        squareId: 'SQ-ARCH-1',
        squareVariationId: 'SQ-VAR-ARCH',
        currentVersion: '3',
        name: 'Test Empanada',
        priceDollars: 8.99,
      },
    });
    const outcome = await processNextJob();
    expect(outcome?.outcome).toBe('SUCCEEDED');
    expect(mockArchive).toHaveBeenCalledTimes(1);

    const updatedJob = await prisma.squareWriteJob.findUnique({ where: { id: jobId } });
    expect(updatedJob?.status).toBe('SUCCEEDED');
  });
});

describe('drainOnce retry behavior', () => {
  it('schedules a retry (PENDING with nextAttemptAt in the future) on a 5xx', async () => {
    if (skipIfNoDb()) return;
    const categoryId = await seedCategory();
    const product = await seedProduct({ categoryId });

    mockCreate.mockRejectedValue(new SquareWriteError('SERVER', '5xx', 502, {}));

    const { jobId } = await enqueueSquareWrite({
      productId: product.id,
      operation: 'CREATE',
      payload: {
        name: 'Test',
        description: null,
        priceDollars: 1,
        squareCategoryId: null,
        imageIds: [],
      },
    });

    const result = await drainOnce(5);
    expect(result.attempted).toBe(1);
    expect(result.retried).toBe(1);

    const updatedJob = await prisma.squareWriteJob.findUnique({ where: { id: jobId } });
    expect(updatedJob?.status).toBe('PENDING');
    expect(updatedJob?.attempts).toBe(1);
    expect(updatedJob!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('echo suppression via real DB', () => {
  it('records and recognizes our own writes; cleans up stale rows', async () => {
    if (skipIfNoDb()) return;

    await recordSquareWrite('SQ-ECHO-1', 42n);
    await expect(wasRecentlyWrittenByUs('SQ-ECHO-1', 42n)).resolves.toBe(true);
    await expect(wasRecentlyWrittenByUs('SQ-ECHO-1', 43n)).resolves.toBe(false);

    // Backdate the row to simulate a stale echo record and verify GC
    await prisma.recentSquareWrite.updateMany({
      where: { squareId: 'SQ-ECHO-1', version: 42n },
      data: { writtenAt: new Date(Date.now() - 60 * 60 * 1000) },
    });
    await expect(wasRecentlyWrittenByUs('SQ-ECHO-1', 42n)).resolves.toBe(false);

    // pruneExpired should be idempotent / not error on an empty table
    await expect(pruneExpiredEchoRecords()).resolves.toBeGreaterThanOrEqual(0);
  });
});
