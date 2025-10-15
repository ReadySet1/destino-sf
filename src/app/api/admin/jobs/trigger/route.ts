// src/app/api/admin/jobs/trigger/route.ts

import { NextResponse } from 'next/server';
import { AvailabilityProcessor } from '@/lib/jobs/availability-processor';
import { logger } from '@/utils/logger';

/**
 * Manually trigger the availability processing job
 * Used by administrators for immediate processing
 */
export async function POST() {
  try {
    // Check if a job is already running
    const status = AvailabilityProcessor.getStatus();

    if (status.isRunning) {
      return NextResponse.json(
        {
          success: false,
          error: 'A job is already running',
          currentJobId: status.currentJobId,
        },
        { status: 409 }
      );
    }

    logger.info('Manual job trigger requested by admin');

    // Create and run the processor
    const processor = new AvailabilityProcessor();
    const result = await processor.processScheduledChanges();

    logger.info('Manual job completed', {
      processed: result.processed,
      updated: result.updated,
      errors: result.errors.length,
      duration: result.duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Job completed successfully',
      result: {
        processed: result.processed,
        updated: result.updated,
        errors: result.errors.length,
        duration: result.duration,
        summary: result.summary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Manual job trigger failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Job execution failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get trigger endpoint status
 */
export async function GET() {
  const status = AvailabilityProcessor.getStatus();

  return NextResponse.json({
    canTrigger: !status.isRunning,
    currentStatus: status,
    timestamp: new Date().toISOString(),
  });
}
