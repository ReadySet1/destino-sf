/**
 * Durable queue for Destino → Square writeback jobs.
 *
 * Admin mutations enqueue a job row; the worker (`/api/cron/square-write-queue`)
 * drains PENDING rows with exponential backoff. The same idempotency key is
 * reused across retries so Square dedupes at its end.
 */

import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import {
  SquareWriteError,
  archiveSquareItem,
  createSquareItem,
  updateSquareItem,
} from './catalog-write';
import { recordSquareWrite } from './echo-suppression';

export type WriteOperation = 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'UNARCHIVE';
export type WriteJobStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'DEAD';

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [
  60_000, // 1m after 1st failure
  5 * 60_000, // 5m
  15 * 60_000, // 15m
  60 * 60_000, // 1h
];

export interface CreateJobPayload {
  name: string;
  description?: string | null;
  priceDollars: number;
  squareCategoryId?: string | null;
  imageIds?: string[];
}

export interface UpdateJobPayload {
  squareId: string;
  squareVariationId: string;
  currentVersion: string; // BigInt serialized
  name: string;
  description?: string | null;
  priceDollars: number;
  squareCategoryId?: string | null;
  imageIds?: string[];
}

export interface ArchiveJobPayload {
  squareId: string;
  squareVariationId?: string;
  currentVersion?: string;
  name?: string;
  priceDollars?: number;
}

export type JobPayload = CreateJobPayload | UpdateJobPayload | ArchiveJobPayload;

export function isWritebackEnabled(): boolean {
  return process.env.ENABLE_SQUARE_WRITEBACK === 'true';
}

export async function enqueueSquareWrite(args: {
  productId: string;
  operation: WriteOperation;
  payload: JobPayload;
}): Promise<{ jobId: string; idempotencyKey: string }> {
  const idempotencyKey = randomUUID();
  const job = await prisma.squareWriteJob.create({
    data: {
      productId: args.productId,
      operation: args.operation,
      payload: args.payload as unknown as Prisma.InputJsonValue,
      idempotencyKey,
      status: 'PENDING',
    },
    select: { id: true, idempotencyKey: true },
  });
  logger.info('[square-write-queue] enqueued', {
    jobId: job.id,
    productId: args.productId,
    operation: args.operation,
  });
  return { jobId: job.id, idempotencyKey: job.idempotencyKey };
}

function nextAttemptDelay(attempts: number): number {
  const idx = Math.min(attempts - 1, BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx];
}

async function markSucceeded(jobId: string): Promise<void> {
  await prisma.squareWriteJob.update({
    where: { id: jobId },
    data: { status: 'SUCCEEDED', succeededAt: new Date(), lastError: null },
  });
}

async function markRetry(jobId: string, attempts: number, error: string): Promise<void> {
  const nextAttemptAt = new Date(Date.now() + nextAttemptDelay(attempts));
  await prisma.squareWriteJob.update({
    where: { id: jobId },
    data: { status: 'PENDING', attempts, lastError: error, nextAttemptAt },
  });
}

async function markDead(jobId: string, attempts: number, error: string): Promise<void> {
  await prisma.squareWriteJob.update({
    where: { id: jobId },
    data: { status: 'DEAD', attempts, lastError: error },
  });
}

async function markFailed(jobId: string, attempts: number, error: string): Promise<void> {
  await prisma.squareWriteJob.update({
    where: { id: jobId },
    data: { status: 'FAILED', attempts, lastError: error },
  });
}

export interface DrainResult {
  attempted: number;
  succeeded: number;
  retried: number;
  dead: number;
  failed: number;
}

/**
 * Processes one job (claiming via conditional update so two workers can't
 * both pick up the same row). Returns `null` if no eligible job exists.
 */
export async function processNextJob(): Promise<
  | null
  | {
      jobId: string;
      outcome: 'SUCCEEDED' | 'RETRY' | 'DEAD' | 'FAILED';
    }
> {
  const candidate = await prisma.squareWriteJob.findFirst({
    where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!candidate) return null;

  // Atomic claim: only one worker wins this update.
  const claim = await prisma.squareWriteJob.updateMany({
    where: { id: candidate.id, status: 'PENDING' },
    data: { status: 'PENDING', attempts: { increment: 1 } },
  });
  if (claim.count === 0) return null;

  const job = await prisma.squareWriteJob.findUnique({ where: { id: candidate.id } });
  if (!job) return null;

  try {
    await executeJob(job);
    await markSucceeded(job.id);
    return { jobId: job.id, outcome: 'SUCCEEDED' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryable = error instanceof SquareWriteError && error.retryable;
    const permanent = error instanceof SquareWriteError && !error.retryable;

    if (permanent) {
      await markFailed(job.id, job.attempts, message);
      if (error instanceof SquareWriteError && error.code === 'VERSION_MISMATCH') {
        await markProductConflict(job.productId, 'VERSION_MISMATCH on Square write');
      }
      return { jobId: job.id, outcome: 'FAILED' };
    }
    if (!retryable || job.attempts >= MAX_ATTEMPTS) {
      await markDead(job.id, job.attempts, message);
      return { jobId: job.id, outcome: 'DEAD' };
    }
    await markRetry(job.id, job.attempts, message);
    return { jobId: job.id, outcome: 'RETRY' };
  }
}

export async function drainOnce(maxJobs = 25): Promise<DrainResult> {
  const result: DrainResult = { attempted: 0, succeeded: 0, retried: 0, dead: 0, failed: 0 };
  for (let i = 0; i < maxJobs; i++) {
    const outcome = await processNextJob();
    if (!outcome) break;
    result.attempted += 1;
    if (outcome.outcome === 'SUCCEEDED') result.succeeded += 1;
    else if (outcome.outcome === 'RETRY') result.retried += 1;
    else if (outcome.outcome === 'DEAD') result.dead += 1;
    else if (outcome.outcome === 'FAILED') result.failed += 1;
  }
  return result;
}

async function executeJob(job: {
  id: string;
  productId: string;
  operation: string;
  payload: Prisma.JsonValue;
  idempotencyKey: string;
}): Promise<void> {
  const payload = job.payload as unknown as JobPayload;

  if (job.operation === 'CREATE') {
    const p = payload as CreateJobPayload;
    const res = await createSquareItem({ idempotencyKey: job.idempotencyKey, ...p });
    await prisma.product.update({
      where: { id: job.productId },
      data: {
        squareId: res.squareId,
        squareVersion: res.version,
        squareUpdatedAt: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });
    await recordSquareWrite(res.squareId, res.version);
    return;
  }

  if (job.operation === 'UPDATE' || job.operation === 'UNARCHIVE') {
    const p = payload as UpdateJobPayload;
    const res = await updateSquareItem({
      idempotencyKey: job.idempotencyKey,
      squareId: p.squareId,
      squareVariationId: p.squareVariationId,
      currentVersion: BigInt(p.currentVersion),
      name: p.name,
      description: p.description,
      priceDollars: p.priceDollars,
      squareCategoryId: p.squareCategoryId,
      imageIds: p.imageIds,
    });
    await prisma.product.update({
      where: { id: job.productId },
      data: {
        squareVersion: res.version,
        squareUpdatedAt: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });
    await recordSquareWrite(p.squareId, res.version);
    return;
  }

  if (job.operation === 'ARCHIVE') {
    const p = payload as ArchiveJobPayload;
    await archiveSquareItem({
      idempotencyKey: job.idempotencyKey,
      squareId: p.squareId,
      squareVariationId: p.squareVariationId,
      currentVersion: p.currentVersion ? BigInt(p.currentVersion) : undefined,
      name: p.name,
      priceDollars: p.priceDollars,
    });
    return;
  }

  throw new SquareWriteError('VALIDATION', `Unknown operation: ${job.operation}`);
}

/**
 * Exported for tests and admin tooling — marks a CONFLICT state on the
 * product row when the worker sees VERSION_MISMATCH.
 */
export async function markProductConflict(productId: string, reason: string): Promise<void> {
  await prisma.product.update({
    where: { id: productId },
    data: { syncStatus: 'CONFLICT', lastSyncAt: new Date() },
  });
  logger.warn('[square-write-queue] product marked CONFLICT', { productId, reason });
}
