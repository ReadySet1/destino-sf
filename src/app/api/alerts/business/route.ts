import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/alerts';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    let result;

    switch (type) {
      case 'inventory_low_stock':
        // Mock low stock alert for demo
        result = await alertService.sendSystemErrorAlert(
          new Error(`Low stock alert: ${data.productName} (${data.currentStock} remaining)`),
          {
            type: 'inventory_alert',
            productId: data.productId,
            productName: data.productName,
            currentStock: data.currentStock,
            threshold: data.threshold,
            category: data.category,
          }
        );
        break;

      case 'sales_trend_alert':
        // Mock sales trend alert for demo
        result = await alertService.sendSystemErrorAlert(
          new Error(`Sales trend alert: ${data.metric} changed by ${data.changePercentage}%`),
          {
            type: 'sales_trend',
            metric: data.metric,
            currentValue: data.currentValue,
            previousValue: data.previousValue,
            changePercentage: data.changePercentage,
            period: data.period,
          }
        );
        break;

      case 'revenue_milestone':
        // Mock revenue milestone alert for demo
        result = await alertService.sendSystemErrorAlert(
          new Error(`Revenue milestone reached: $${data.milestone} in ${data.period} period`),
          {
            type: 'revenue_milestone',
            milestone: data.milestone,
            currentRevenue: data.currentRevenue,
            period: data.period,
          }
        );
        break;

      case 'order_volume_alert':
        // Get current order volume data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayOrders = await prisma.order.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        const alertThreshold = data.threshold || 50;
        const volumeType = todayOrders > alertThreshold ? 'high' : 'low';

        result = await alertService.sendSystemErrorAlert(
          new Error(`${volumeType === 'high' ? 'High' : 'Low'} order volume alert: ${todayOrders} orders today`),
          {
            type: 'order_volume',
            currentVolume: todayOrders,
            threshold: alertThreshold,
            volumeType,
            date: today.toISOString(),
          }
        );
        break;

      case 'payment_gateway_alert':
        // Mock payment gateway alert for demo
        result = await alertService.sendSystemErrorAlert(
          new Error(`Payment gateway alert: ${data.gateway} - ${data.issue}`),
          {
            type: 'payment_gateway',
            gateway: data.gateway || 'Square',
            issue: data.issue || 'Connection timeout',
            severity: data.severity || 'medium',
          }
        );
        break;

      case 'website_performance_alert':
        // Mock website performance alert for demo
        result = await alertService.sendSystemErrorAlert(
          new Error(`Website performance alert: ${data.metric} is ${data.value}${data.unit}`),
          {
            type: 'website_performance',
            metric: data.metric || 'response_time',
            value: data.value || 5000,
            unit: data.unit || 'ms',
            threshold: data.threshold || 3000,
          }
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid business alert type' }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        message: `Business alert sent successfully` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in business alerts API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const days = parseInt(searchParams.get('days') || '7');

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get business metrics for the specified period
    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    const businessAlertTypes = [
      'INVENTORY_LOW_STOCK',
      'SALES_TREND_ALERT',
      'REVENUE_MILESTONE',
      'ORDER_VOLUME_ALERT',
      'PAYMENT_GATEWAY_ALERT',
      'WEBSITE_PERFORMANCE_ALERT',
    ];

    if (type && businessAlertTypes.includes(type.toUpperCase())) {
      whereClause.type = type.toUpperCase();
    } else {
      whereClause.type = { in: businessAlertTypes };
    }

    const alerts = await prisma.emailAlert.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        recipientEmail: true,
        subject: true,
        sentAt: true,
        failedAt: true,
        retryCount: true,
        createdAt: true,
        metadata: true,
      },
    });

    // Get business metrics summary
    const totalOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const totalRevenue = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: { not: 'CANCELLED' },
      },
      _sum: {
        total: true,
      },
    });

    const metrics = {
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days,
      },
      orders: {
        total: totalOrders,
        averagePerDay: Math.round(totalOrders / days),
      },
      revenue: {
        total: Number(totalRevenue._sum.total || 0),
        averagePerDay: Math.round(Number(totalRevenue._sum.total || 0) / days),
      },
      alerts: {
        total: alerts.length,
        byType: alerts.reduce((acc: any, alert) => {
          acc[alert.type] = (acc[alert.type] || 0) + 1;
          return acc;
        }, {}),
      },
    };

    return NextResponse.json({
      success: true,
      alerts,
      metrics,
    });

  } catch (error) {
    console.error('Error fetching business alerts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch business alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 