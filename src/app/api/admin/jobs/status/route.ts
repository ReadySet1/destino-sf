// src/app/api/admin/jobs/status/route.ts

import { NextResponse } from 'next/server';
import { AvailabilityProcessor } from '@/lib/jobs/availability-processor';
import { prisma } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

/**
 * Get current job status and health metrics
 */
export async function GET() {
  try {
    // Get processor status
    const processorStatus = AvailabilityProcessor.getStatus();

    // Calculate health metrics from recent job history
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // For now, we'll use mock data since job history table doesn't exist yet
    // TODO: Create job_history table and store actual job results
    const mockStats = {
      totalRuns: 48, // Mock: 2 runs per hour for 24 hours
      successfulRuns: 46,
      failedRuns: 2,
      avgDuration: 1250, // 1.25 seconds average
      lastError: processorStatus.lastRun ? null : 'No recent runs',
    };

    const successRate =
      mockStats.totalRuns > 0 ? (mockStats.successfulRuns / mockStats.totalRuns) * 100 : 0;

    // Determine health status
    let health: 'healthy' | 'warning' | 'error' = 'healthy';

    if (successRate < 90) {
      health = 'error';
    } else if (successRate < 95 || mockStats.failedRuns > 0) {
      health = 'warning';
    }

    // Check if last run was too long ago (more than 10 minutes)
    if (processorStatus.lastRun) {
      const timeSinceLastRun = now.getTime() - processorStatus.lastRun.getTime();
      if (timeSinceLastRun > 10 * 60 * 1000) {
        // 10 minutes
        health = 'warning';
      }
    } else {
      health = 'warning';
    }

    const status = {
      isRunning: processorStatus.isRunning,
      lastRun: processorStatus.lastRun,
      currentJobId: processorStatus.currentJobId,
      health,
      stats: {
        totalRuns: mockStats.totalRuns,
        successRate: successRate,
        avgDuration: mockStats.avgDuration,
        lastError: mockStats.lastError,
      },
    };

    return NextResponse.json({
      success: true,
      status,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error('Error getting job status', { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function HEAD() {
  const processorStatus = AvailabilityProcessor.getStatus();

  // Return 200 if healthy, 503 if not
  const isHealthy =
    !processorStatus.isRunning ||
    (processorStatus.lastRun && Date.now() - processorStatus.lastRun.getTime() < 15 * 60 * 1000); // 15 minutes

  return new NextResponse(null, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy',
    },
  });
}
