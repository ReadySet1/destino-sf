// src/app/api/admin/alerts/bulk/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DashboardAlertService } from '@/lib/notifications/dashboard-alert-service';
import { logger } from '@/utils/logger';

/**
 * Bulk operations on alerts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertIds } = body;

    const alertService = new DashboardAlertService();

    switch (action) {
      case 'mark_all_read':
        await alertService.markAllAsRead();
        return NextResponse.json({
          success: true,
          message: 'All alerts marked as read',
          timestamp: new Date().toISOString(),
        });

      case 'mark_selected_read':
        if (!alertIds || !Array.isArray(alertIds)) {
          return NextResponse.json(
            { success: false, error: 'alertIds array is required for mark_selected_read' },
            { status: 400 }
          );
        }

        await alertService.markMultipleAsRead(alertIds);
        return NextResponse.json({
          success: true,
          message: `${alertIds.length} alerts marked as read`,
          timestamp: new Date().toISOString(),
        });

      case 'cleanup_old':
        const daysOld = body.daysOld || 30;
        const deletedCount = await alertService.deleteOldAlerts(daysOld);
        return NextResponse.json({
          success: true,
          message: `Cleaned up ${deletedCount} old alerts`,
          deletedCount,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error performing bulk alert operation', { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
