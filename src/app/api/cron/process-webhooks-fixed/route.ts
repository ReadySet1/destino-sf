import { NextRequest, NextResponse } from 'next/server';
import { processWebhookQueue } from '@/lib/webhook-queue-fix';
import { ensureConnection } from '@/lib/db-unified';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Webhook Queue Processor
 *
 * Triggered by the Dokploy schedule every 30 minutes to process queued webhooks.
 *
 * This handler runs inside a long-lived Node process that serves every other
 * request with the same shared Prisma client. It must not tear that client
 * down when it finishes: on 2026-09-16 a `shutdown()` call in `finally` ran
 * while an admin catalog sync had queries in flight, which left the Prisma
 * engine permanently reporting "Engine is not yet connected" until the
 * container was restarted. (db-unified's own retry paths may still recycle the
 * client on connection errors; that is a separate concern.)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('🔄 Starting webhook queue processing cron job');

  // Fail closed: without a configured secret nothing may trigger the queue,
  // matching the sibling cron routes.
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn('⚠️ Invalid cron authorization');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let stats = { processed: 0, failed: 0, skipped: 0 };

  try {
    console.log('🚀 Starting webhook queue processing...');

    // CRITICAL: Ensure database connection before processing
    console.log('🔌 Ensuring database connection...');
    await ensureConnection();
    console.log('✅ Database connection established');

    // Process queue with timeout protection
    stats = await processWebhookQueue({
      maxItems: 50, // Process up to 50 webhooks per run
      timeout: 55000, // per-item timeout, kept under maxDuration
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Queue processing completed in ${duration}ms:`, stats);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Queue processing failed in ${duration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
        stats,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger endpoint for testing (POST)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔧 Manual webhook queue processing trigger');

  // Use same logic as GET but allow manual triggering
  return GET(request);
}
