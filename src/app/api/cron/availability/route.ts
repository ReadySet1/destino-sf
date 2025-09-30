// src/app/api/cron/availability/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityProcessor } from '@/lib/jobs/availability-processor';
import { logger } from '@/utils/logger';
import { env } from '@/env';

/**
 * Cron Job API endpoint for processing scheduled availability changes
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, or external cron)
 * 
 * Schedule: Every 5 minutes
 * Purpose: Process pending availability rule changes and update product states
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = env.CRON_SECRET;
    
    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Verify authorization header
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request attempt', {
        headers: request.headers,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting scheduled availability processing job');

    // Process scheduled changes
    const processor = new AvailabilityProcessor();
    const result = await processor.processScheduledChanges();

    // Log results
    logger.info('Availability processing job completed', {
      processed: result.processed,
      updated: result.updated,
      errors: result.errors.length,
      duration: result.duration
    });

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        updated: result.updated,
        errors: result.errors.length,
        timestamp: new Date().toISOString(),
        duration: result.duration
      }
    });

  } catch (error) {
    logger.error('Cron job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for monitoring
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

// Explicitly handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
