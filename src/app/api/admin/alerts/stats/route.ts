// src/app/api/admin/alerts/stats/route.ts

import { NextResponse } from 'next/server';
import { DashboardAlertService } from '@/lib/notifications/dashboard-alert-service';
import { logger } from '@/utils/logger';

/**
 * Get alert statistics
 */
export async function GET() {
  try {
    const alertService = new DashboardAlertService();
    const stats = await alertService.getAlertStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching alert stats', { error });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
