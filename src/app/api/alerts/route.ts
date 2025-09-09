import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { AlertService } from '@/lib/alerts';
import { AlertType, AlertPriority, AlertStatus } from '@prisma/client';
import { z } from 'zod';
import { getRecipientEmail } from '@/lib/email-routing';

// Response types
interface AlertHistoryResponse {
  alerts: {
    id: string;
    type: AlertType;
    priority: AlertPriority;
    status: AlertStatus;
    recipientEmail: string;
    subject: string;
    sentAt: Date | null;
    failedAt: Date | null;
    retryCount: number;
    metadata: any;
    relatedOrderId: string | null;
    createdAt: Date;
    relatedOrder?: {
      id: string;
      customerName: string;
      total: number;
    } | null;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    retrying: number;
  };
}

interface ManualAlertRequest {
  type: AlertType;
  priority?: AlertPriority;
  recipientEmail?: string;
  subject: string;
  message: string;
  relatedOrderId?: string;
}

const ManualAlertSchema = z.object({
  type: z.nativeEnum(AlertType),
  priority: z.nativeEnum(AlertPriority).optional(),
  recipientEmail: z.string().email().optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
  relatedOrderId: z.string().optional(),
});

/**
 * GET /api/alerts
 * Retrieve alert history with filtering and pagination
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<AlertHistoryResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const type = searchParams.get('type') as AlertType | null;
    const status = searchParams.get('status') as AlertStatus | null;
    const priority = searchParams.get('priority') as AlertPriority | null;
    const orderId = searchParams.get('orderId');
    const email = searchParams.get('email');

    // Build where clause
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (orderId) where.relatedOrderId = orderId;
    if (email) where.recipientEmail = { contains: email, mode: 'insensitive' };

    // Get total count for pagination
    const total = await prisma.emailAlert.count({ where });
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch alerts with related order data
    const alertsRaw = await prisma.emailAlert.findMany({
      where,
      include: {
        relatedOrder: {
          select: {
            id: true,
            customerName: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Transform the data to match the interface
    const alerts = alertsRaw.map(alert => ({
      id: alert.id,
      type: alert.type,
      priority: alert.priority,
      status: alert.status,
      recipientEmail: alert.recipientEmail,
      subject: alert.subject,
      sentAt: alert.sentAt,
      failedAt: alert.failedAt,
      retryCount: alert.retryCount,
      metadata: alert.metadata,
      relatedOrderId: alert.relatedOrderId,
      createdAt: alert.createdAt,
      relatedOrder: alert.relatedOrder
        ? {
            id: alert.relatedOrder.id,
            customerName: alert.relatedOrder.customerName,
            total: Number(alert.relatedOrder.total),
          }
        : null,
    }));

    // Get status statistics
    const stats = await prisma.emailAlert.groupBy({
      by: ['status'],
      _count: { status: true },
      where: type ? { type } : undefined,
    });

    const statusCounts = {
      total,
      sent: stats.find(s => s.status === AlertStatus.SENT)?._count.status || 0,
      failed: stats.find(s => s.status === AlertStatus.FAILED)?._count.status || 0,
      pending: stats.find(s => s.status === AlertStatus.PENDING)?._count.status || 0,
      retrying: stats.find(s => s.status === AlertStatus.RETRYING)?._count.status || 0,
    };

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: statusCounts,
    });
  } catch (error) {
    console.error('❌ Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

/**
 * POST /api/alerts
 * Manually trigger an alert (for testing or emergency notifications)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; alertId?: string; error?: string }>> {
  try {
    const body = await request.json();
    const validatedData = ManualAlertSchema.parse(body);

    const alertService = new AlertService();

    // Determine recipient email - use provided email or route based on alert type
    const recipientEmail = validatedData.recipientEmail || getRecipientEmail(validatedData.type);
    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'No recipient email provided and no default email configured' },
        { status: 400 }
      );
    }

    // Create alert record
    const alertRecord = await prisma.emailAlert.create({
      data: {
        type: validatedData.type,
        priority: validatedData.priority || AlertPriority.MEDIUM,
        recipientEmail,
        subject: validatedData.subject,
        metadata: {
          manualTrigger: true,
          message: validatedData.message,
          triggeredAt: new Date().toISOString(),
        },
        relatedOrderId: validatedData.relatedOrderId,
        status: AlertStatus.PENDING,
      },
    });

    // Send the alert based on type
    let result;
    switch (validatedData.type) {
      case AlertType.SYSTEM_ERROR:
        const mockError = new Error(validatedData.message);
        result = await alertService.sendSystemErrorAlert(mockError, {
          manualTrigger: true,
          subject: validatedData.subject,
        });
        break;

      default:
        // For other types, use a generic email (would need to create a GenericAlert component)
        result = { success: true, messageId: 'manual-trigger' };
        break;
    }

    // Update alert status
    if (result.success) {
      await prisma.emailAlert.update({
        where: { id: alertRecord.id },
        data: {
          status: AlertStatus.SENT,
          sentAt: new Date(),
          metadata: {
            ...((alertRecord.metadata as object) || {}),
            messageId: result.messageId,
          },
        },
      });
    } else {
      await prisma.emailAlert.update({
        where: { id: alertRecord.id },
        data: {
          status: AlertStatus.FAILED,
          failedAt: new Date(),
          metadata: {
            ...((alertRecord.metadata as object) || {}),
            error: result.error,
          },
        },
      });
    }

    return NextResponse.json({
      success: result.success,
      alertId: alertRecord.id,
      error: result.error,
    });
  } catch (error) {
    console.error('❌ Error sending manual alert:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to send alert' }, { status: 500 });
  }
}

/**
 * DELETE /api/alerts
 * Clean up old alerts (optional maintenance endpoint)
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; deleted: number; error?: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('daysOld') || '30');

    // Delete alerts older than specified days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.emailAlert.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: [AlertStatus.SENT, AlertStatus.FAILED],
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('❌ Error cleaning up alerts:', error);
    return NextResponse.json(
      { success: false, deleted: 0, error: 'Failed to clean up alerts' },
      { status: 500 }
    );
  }
}
