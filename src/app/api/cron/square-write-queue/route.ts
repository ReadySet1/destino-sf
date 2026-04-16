import { NextResponse } from 'next/server';
import { drainOnce, isWritebackEnabled } from '@/lib/square/write-queue';
import { pruneExpiredEchoRecords } from '@/lib/square/echo-suppression';
import { logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isWritebackEnabled()) {
    return NextResponse.json({
      skipped: true,
      reason: 'ENABLE_SQUARE_WRITEBACK=false',
      timestamp: new Date().toISOString(),
    });
  }

  const start = Date.now();
  try {
    const result = await drainOnce(25);
    const pruned = await pruneExpiredEchoRecords().catch(() => 0);

    const duration = Date.now() - start;
    logger.info('[cron:square-write-queue] drain complete', { ...result, pruned, durationMs: duration });
    return NextResponse.json({
      success: true,
      durationMs: duration,
      result,
      echoRecordsPruned: pruned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[cron:square-write-queue] drain failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
