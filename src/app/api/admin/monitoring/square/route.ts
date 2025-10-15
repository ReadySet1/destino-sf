/**
 * Square Monitoring API Endpoint
 *
 * Provides monitoring data and health checks for Square integration
 *
 * GET /api/admin/monitoring/square - Get monitoring dashboard data
 * POST /api/admin/monitoring/square - Run monitoring check manually
 */

import { NextResponse } from 'next/server';
import { getSquareMonitor } from '@/lib/monitoring/square-monitor';
import { logger } from '@/utils/logger';

// Rate limiting for monitoring endpoint
const MONITORING_RATE_LIMIT = 60 * 1000; // 1 minute
const lastMonitoringCheck = new Map<string, number>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const lastCheck = lastMonitoringCheck.get(ip) || 0;

  if (now - lastCheck < MONITORING_RATE_LIMIT) {
    return true;
  }

  lastMonitoringCheck.set(ip, now);
  return false;
}

function getClientIP(request: Request): string {
  // Get IP from various possible headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

export async function GET(request: Request) {
  try {
    const clientIP = getClientIP(request);

    // Simple rate limiting
    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limited - monitoring checks can only be run once per minute' },
        { status: 429 }
      );
    }

    logger.info('📊 Monitoring dashboard data requested');

    const monitor = getSquareMonitor();
    const dashboardData = await monitor.getDashboardData();

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('💥 Error getting monitoring data:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve monitoring data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const clientIP = getClientIP(request);

    // Rate limiting for manual monitoring runs
    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limited - monitoring checks can only be run once per minute' },
        { status: 429 }
      );
    }

    logger.info('🔍 Manual monitoring check requested');

    const monitor = getSquareMonitor();
    const result = await monitor.monitorSquareIntegration();

    // Log alerts if any
    if (result.alerts.length > 0) {
      logger.warn(`⚠️  Monitoring found ${result.alerts.length} alerts:`, {
        alerts: result.alerts.map(a => ({
          type: a.type,
          severity: a.severity,
          title: a.title,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      result,
      summary: {
        status: result.alerts.some(a => a.severity === 'CRITICAL')
          ? 'CRITICAL'
          : result.alerts.some(a => a.severity === 'HIGH')
            ? 'WARNING'
            : 'HEALTHY',
        totalOrders: result.totalOrders,
        stuckOrders: result.stuckOrders,
        alertCount: result.alerts.length,
        criticalAlerts: result.alerts.filter(a => a.severity === 'CRITICAL').length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('💥 Error running monitoring check:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run monitoring check',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
