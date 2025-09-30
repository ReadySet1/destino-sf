// src/app/api/admin/jobs/stop/route.ts

import { NextResponse } from 'next/server';
import { AvailabilityProcessor } from '@/lib/jobs/availability-processor';
import { logger } from '@/utils/logger';

/**
 * Emergency stop for running availability processing job
 * Should only be used in emergency situations
 */
export async function POST() {
  try {
    const status = AvailabilityProcessor.getStatus();
    
    if (!status.isRunning) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No job is currently running',
          message: 'Cannot stop a job that is not running'
        },
        { status: 400 }
      );
    }

    logger.warn('Emergency job stop requested by admin', {
      currentJobId: status.currentJobId,
      runningFor: status.lastRun ? Date.now() - status.lastRun.getTime() : 'unknown'
    });

    // Force stop the processor
    AvailabilityProcessor.forceStop();

    logger.info('Job force stopped by admin');

    return NextResponse.json({
      success: true,
      message: 'Job stopped successfully',
      stoppedJobId: status.currentJobId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error stopping job', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to stop job',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Check if stop is available
 */
export async function GET() {
  const status = AvailabilityProcessor.getStatus();
  
  return NextResponse.json({
    canStop: status.isRunning,
    currentStatus: status,
    timestamp: new Date().toISOString()
  });
}
