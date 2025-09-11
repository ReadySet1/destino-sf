import { NextRequest, NextResponse } from 'next/server';
import { processWebhookQueue } from '@/lib/webhook-queue-fix';
import { ensureConnection, shutdown } from '@/lib/db-unified';

// Vercel cron job configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max (Vercel limit)

/**
 * FIXED Webhook Queue Processor
 * 
 * This runs as a Vercel cron job every minute to process queued webhooks
 * Designed for reliability and performance in serverless environment
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('🔄 Starting webhook queue processing cron job');
  
  // Verify cron secret for security (optional but recommended)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
      maxItems: 50,        // Process up to 50 webhooks per run
      timeout: 55000,      // 55 seconds (5 second buffer for Vercel)
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Queue processing completed in ${duration}ms:`, stats);
    
    return NextResponse.json({
      success: true,
      duration_ms: duration,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Queue processing failed in ${duration}ms:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration,
      stats,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    // CRITICAL: Clean up database connections to prevent leaks
    console.log('🧹 Cleaning up database connections...');
    try {
      await shutdown();
      console.log('✅ Database connections cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Error during database cleanup:', cleanupError);
    }
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
