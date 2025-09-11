/**
 * Utility functions for catering API routes to handle database connection failures gracefully
 */

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { isBuildTime } from './build-time-utils';

/**
 * Safely execute a database operation in an API route with proper error handling
 */
export async function safeCateringApiOperation<T>(
  operation: () => Promise<T>,
  fallbackData: T,
  operationName: string = 'catering API operation'
): Promise<NextResponse> {
  // During build time or if database is unavailable, return fallback data
  if (isBuildTime()) {
    logger.info(`🔧 Build-time detected: Using fallback for ${operationName}`);
    return NextResponse.json({
      success: true,
      items: fallbackData,
      count: Array.isArray(fallbackData) ? fallbackData.length : 0,
      note: 'Fallback data used due to build-time constraints'
    });
  }

  try {
    // Add timeout to prevent hanging
    const operationPromise = operation();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timeout after 15 seconds`));
      }, 15000);
    });

    const result = await Promise.race([operationPromise, timeoutPromise]);
    logger.info(`✅ ${operationName} completed successfully`);
    
    return NextResponse.json({
      success: true,
      items: result,
      count: Array.isArray(result) ? result.length : 0,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Data-Timestamp': new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`❌ Failed ${operationName}:`, error);
    
    // Check if it's a connection error
    const isConnectionError = 
      error instanceof Error && (
        error.message.includes("Can't reach database server") ||
        error.message.includes('Connection terminated') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ECONNREFUSED')
      );

    if (isConnectionError) {
      logger.warn(`🔄 Database connection failed for ${operationName}, using fallback data`);
      return NextResponse.json({
        success: true,
        items: fallbackData,
        count: Array.isArray(fallbackData) ? fallbackData.length : 0,
        note: 'Fallback data used due to database connection issues'
      });
    }

    // For non-connection errors, return proper error response
    return NextResponse.json(
      {
        success: false,
        error: `Failed to execute ${operationName}`,
        items: fallbackData,
        count: Array.isArray(fallbackData) ? fallbackData.length : 0,
      },
      { status: 500 }
    );
  }
}

/**
 * Check if an error is database connection related
 */
export function isConnectionError(error: Error): boolean {
  const connectionErrorPatterns = [
    "Can't reach database server",
    'Connection terminated',
    'ECONNRESET',
    'ECONNREFUSED', 
    'ETIMEDOUT',
    'timeout',
    'Engine is not yet connected',
    'Socket timeout',
    'Connection pool timeout',
    'Timed out fetching a new connection',
    'Response from the Engine was empty'
  ];
  
  const connectionCodes = ['P1001', 'P1008', 'P2024'];
  
  return connectionErrorPatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  ) || connectionCodes.includes((error as any).code);
}
