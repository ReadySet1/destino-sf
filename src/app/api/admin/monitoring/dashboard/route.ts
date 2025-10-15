/**
 * Monitoring Dashboard API
 *
 * Provides a comprehensive dashboard view of Square integration monitoring
 *
 * GET /api/admin/monitoring/dashboard - Get full monitoring dashboard
 */

import { NextResponse } from 'next/server';
import { getSquareMonitor } from '@/lib/monitoring/square-monitor';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    logger.info('📊 Monitoring dashboard requested');

    const monitor = getSquareMonitor();
    const dashboardData = await monitor.getDashboardData();

    // Add additional context for dashboard
    const dashboard = {
      ...dashboardData,
      systemInfo: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      monitoring: {
        enabled: process.env.MONITORING_ENABLED !== 'false',
        alertChannels: getConfiguredAlertChannels(),
        lastHealthCheck: dashboardData.lastCheck,
      },
      quickActions: [
        {
          name: 'Run Cleanup Script',
          description: 'Fix stuck orders in production',
          command: 'pnpm tsx scripts/fix-stuck-square-orders.ts --execute',
          severity: dashboardData.metrics.stuckOrders > 0 ? 'HIGH' : 'LOW',
        },
        {
          name: 'Manual Health Check',
          description: 'Run comprehensive monitoring check',
          endpoint: '/api/admin/monitoring/square',
          method: 'POST',
          severity: 'LOW',
        },
        {
          name: 'View Square Orders',
          description: 'Check orders in Square Dashboard',
          url: 'https://squareup.com/dashboard/orders',
          external: true,
          severity: 'LOW',
        },
      ],
      troubleshooting: generateTroubleshootingTips(dashboardData),
    };

    return NextResponse.json({
      success: true,
      dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('💥 Error getting dashboard data:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load monitoring dashboard',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function getConfiguredAlertChannels(): string[] {
  const channels = ['console', 'database'];

  if (process.env.SLACK_WEBHOOK_URL) channels.push('slack');
  if (process.env.DISCORD_WEBHOOK_URL) channels.push('discord');
  if (process.env.ALERT_EMAIL_TO) channels.push('email');

  return channels;
}

function generateTroubleshootingTips(dashboardData: any): any[] {
  const tips = [];

  if (dashboardData.status === 'CRITICAL') {
    tips.push({
      title: 'Critical Issues Detected',
      description: 'Immediate action required to resolve critical Square integration issues.',
      priority: 'HIGH',
      actions: [
        'Check alerts for specific issues',
        'Run cleanup script if stuck orders detected',
        'Verify Square API credentials',
        'Check network connectivity',
      ],
    });
  }

  if (dashboardData.metrics.stuckOrders > 0) {
    tips.push({
      title: 'Stuck Orders Found',
      description: `${dashboardData.metrics.stuckOrders} orders appear to be stuck in DRAFT state.`,
      priority: 'HIGH',
      actions: [
        'Run: pnpm tsx scripts/fix-stuck-square-orders.ts --dry-run',
        'Review the orders to confirm they need fixing',
        'Run: pnpm tsx scripts/fix-stuck-square-orders.ts --execute',
        'Monitor for new stuck orders',
      ],
    });
  }

  if (dashboardData.metrics.avgResponseTime > 5000) {
    tips.push({
      title: 'Slow API Responses',
      description: 'Square API is responding slowly, which may affect user experience.',
      priority: 'MEDIUM',
      actions: [
        'Check Square API status page',
        'Review network connectivity',
        'Consider implementing request caching',
        'Add retry logic with exponential backoff',
      ],
    });
  }

  if (dashboardData.metrics.apiHealth.includes('0/')) {
    tips.push({
      title: 'API Health Issues',
      description: 'Some Square API endpoints are not responding properly.',
      priority: 'HIGH',
      actions: [
        'Verify Square API credentials',
        'Check SQUARE_ACCESS_TOKEN environment variable',
        'Verify SQUARE_LOCATION_ID is correct',
        'Test API connection manually',
      ],
    });
  }

  if (tips.length === 0) {
    tips.push({
      title: 'System Healthy',
      description: 'No issues detected with Square integration.',
      priority: 'LOW',
      actions: [
        'Continue regular monitoring',
        'Review logs for any warnings',
        'Consider setting up automated monitoring',
      ],
    });
  }

  return tips;
}
