// src/app/api/admin/alerts/[alertId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DashboardAlertService } from '@/lib/notifications/dashboard-alert-service';
import { logger } from '@/utils/logger';

type Props = {
  params: Promise<{ alertId: string }>;
};

/**
 * Mark alert as read
 */
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { alertId } = await params;
    const body = await request.json();

    const alertService = new DashboardAlertService();

    if (body.action === 'mark_read') {
      await alertService.markAsRead(alertId);

      return NextResponse.json({
        success: true,
        message: 'Alert marked as read',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Error updating alert', { error });

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
 * Delete alert
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { alertId } = await params;

    const alertService = new DashboardAlertService();
    await alertService.deleteAlert(alertId);

    return NextResponse.json({
      success: true,
      message: 'Alert deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting alert', { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
