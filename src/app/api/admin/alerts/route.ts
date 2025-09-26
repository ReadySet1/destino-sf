// src/app/api/admin/alerts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DashboardAlertService } from '@/lib/notifications/dashboard-alert-service';
import { logger } from '@/utils/logger';

/**
 * Get dashboard alerts with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const options = {
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      priority: searchParams.get('priority') || undefined,
      type: searchParams.get('type') || undefined,
      unreadOnly: searchParams.get('unreadOnly') === 'true'
    };

    const alertService = new DashboardAlertService();
    const result = await alertService.getAlerts(options);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching alerts', { error });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new alert (for testing/manual creation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { type, title, message, priority, data } = body;
    
    if (!type || !title || !message || !priority) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title, message, priority' },
        { status: 400 }
      );
    }

    const alertService = new DashboardAlertService();
    const alert = await alertService.createAlert({
      type,
      title,
      message,
      priority,
      data: data || {}
    });

    return NextResponse.json({
      success: true,
      data: alert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error creating alert', { error });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
