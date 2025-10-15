import { WebhookProcessor } from '@/lib/webhook-processor';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

/**
 * Vercel cron job for processing webhook queue
 * Runs every minute to ensure webhooks are processed
 */
export async function GET(request: Request) {
  console.log('🔄 Starting webhook queue processing cron job');

  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
    console.error('❌ Unauthorized cron request');
    return new Response('Unauthorized', { status: 401 });
  }

  const processor = new WebhookProcessor();

  // Process for up to 55 seconds (leaving buffer for Vercel timeout)
  const timeout = setTimeout(() => {
    console.log('⏰ Cron job timeout, stopping processor');
    processor.stop();
  }, 55000);

  let processedCount = 0;

  try {
    console.log('🚀 Starting webhook queue processing...');
    const startTime = Date.now();

    await processor.processQueue();

    const duration = Date.now() - startTime;
    console.log(`✅ Webhook queue processing completed in ${duration}ms`);

    clearTimeout(timeout);

    return Response.json({
      success: true,
      duration,
      processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Webhook queue processing failed:', error);
    clearTimeout(timeout);

    return Response.json(
      {
        success: false,
        error: (error as Error).message,
        processedCount,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
