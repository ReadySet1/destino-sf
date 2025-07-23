import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AlertService } from '@/lib/alerts';
import { AlertStatus } from '@prisma/client';
import { z } from 'zod';

interface RetryResponse {
  success: boolean;
  retried: number;
  errors: string[];
}

const RetryRequestSchema = z.object({
  alertIds: z.array(z.string()).optional(),
  maxRetries: z.number().min(1).max(10).optional().default(3),
  retryAllFailed: z.boolean().optional().default(false),
});

/**
 * POST /api/alerts/retry
 * Retry failed email alerts
 */
export async function POST(request: NextRequest): Promise<NextResponse<RetryResponse>> {
  try {
    const body = await request.json();
    const { alertIds, maxRetries, retryAllFailed } = RetryRequestSchema.parse(body);

    const alertService = new AlertService();
    let retried = 0;
    const errors: string[] = [];

    // Build where clause for alerts to retry
    let where: any = {
      status: AlertStatus.FAILED,
      retryCount: { lt: maxRetries },
    };

    if (!retryAllFailed && alertIds) {
      where.id = { in: alertIds };
    }

    // Fetch failed alerts to retry
    const failedAlerts = await prisma.emailAlert.findMany({
      where,
      include: {
        relatedOrder: {
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        },
        relatedUser: true,
      },
      orderBy: { failedAt: 'asc' },
      take: 50, // Limit to prevent overwhelming the system
    });

    console.log(`🔄 Retrying ${failedAlerts.length} failed alerts...`);

    // Retry each alert
    for (const alert of failedAlerts) {
      try {
        // Update status to retrying
        await prisma.emailAlert.update({
          where: { id: alert.id },
          data: {
            status: AlertStatus.RETRYING,
            retryCount: { increment: 1 },
          },
        });

        // Retry based on alert type
        let result;

        switch (alert.type) {
          case 'NEW_ORDER':
            if (alert.relatedOrder) {
              result = await alertService.sendNewOrderAlert(alert.relatedOrder);
            } else {
              throw new Error('No related order found for NEW_ORDER alert');
            }
            break;

          case 'ORDER_STATUS_CHANGE':
            if (alert.relatedOrder && alert.metadata) {
              const metadata = alert.metadata as any;
              result = await alertService.sendOrderStatusChangeAlert(
                alert.relatedOrder,
                metadata.previousStatus || 'UNKNOWN'
              );
            } else {
              throw new Error('No related order or metadata found for ORDER_STATUS_CHANGE alert');
            }
            break;

          case 'PAYMENT_FAILED':
            if (alert.relatedOrder && alert.metadata) {
              const metadata = alert.metadata as any;
              result = await alertService.sendPaymentFailedAlert(
                alert.relatedOrder,
                metadata.error || 'Payment failed during retry'
              );
            } else {
              throw new Error('No related order or metadata found for PAYMENT_FAILED alert');
            }
            break;

          case 'SYSTEM_ERROR':
            if (alert.metadata) {
              const metadata = alert.metadata as any;
              const error = new Error(metadata.error?.message || 'System error during retry');
              result = await alertService.sendSystemErrorAlert(error, {
                retryAttempt: true,
                originalAlertId: alert.id,
                ...metadata.context,
              });
            } else {
              throw new Error('No metadata found for SYSTEM_ERROR alert');
            }
            break;

          default:
            throw new Error(`Unsupported alert type for retry: ${alert.type}`);
        }

        // Update alert status based on result
        if (result.success) {
          await prisma.emailAlert.update({
            where: { id: alert.id },
            data: {
              status: AlertStatus.SENT,
              sentAt: new Date(),
              metadata: {
                ...((alert.metadata as object) || {}),
                retrySuccessful: true,
                retryMessageId: result.messageId,
              },
            },
          });
          retried++;
          console.log(`✅ Successfully retried alert ${alert.id}`);
        } else {
          await prisma.emailAlert.update({
            where: { id: alert.id },
            data: {
              status: AlertStatus.FAILED,
              failedAt: new Date(),
              metadata: {
                ...((alert.metadata as object) || {}),
                lastRetryError: result.error,
                lastRetryAt: new Date().toISOString(),
              },
            },
          });
          errors.push(`Alert ${alert.id}: ${result.error}`);
          console.error(`❌ Failed to retry alert ${alert.id}: ${result.error}`);
        }

        // Add delay between retries to avoid overwhelming email service
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Alert ${alert.id}: ${errorMessage}`);

        // Mark as failed with error
        await prisma.emailAlert.update({
          where: { id: alert.id },
          data: {
            status: AlertStatus.FAILED,
            failedAt: new Date(),
            metadata: {
              ...((alert.metadata as object) || {}),
              retryError: errorMessage,
              lastRetryAt: new Date().toISOString(),
            },
          },
        });

        console.error(`❌ Error retrying alert ${alert.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      retried,
      errors,
    });
  } catch (error) {
    console.error('❌ Error in retry operation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          retried: 0,
          errors: ['Invalid request data: ' + error.errors.map(e => e.message).join(', ')],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        retried: 0,
        errors: [
          'Failed to retry alerts: ' + (error instanceof Error ? error.message : 'Unknown error'),
        ],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/retry/stats
 * Get retry statistics and eligibility
 */
export async function GET(request: NextRequest): Promise<
  NextResponse<{
    eligibleForRetry: number;
    totalFailed: number;
    exceeededMaxRetries: number;
    stats: Array<{
      type: string;
      failed: number;
      eligibleForRetry: number;
    }>;
  }>
> {
  try {
    const maxRetries = 3; // Default max retries

    // Get failed alerts eligible for retry
    const eligibleForRetry = await prisma.emailAlert.count({
      where: {
        status: AlertStatus.FAILED,
        retryCount: { lt: maxRetries },
      },
    });

    // Get total failed alerts
    const totalFailed = await prisma.emailAlert.count({
      where: { status: AlertStatus.FAILED },
    });

    // Get alerts that exceeded max retries
    const exceeededMaxRetries = await prisma.emailAlert.count({
      where: {
        status: AlertStatus.FAILED,
        retryCount: { gte: maxRetries },
      },
    });

    // Get stats by alert type
    const statsByType = await prisma.emailAlert.groupBy({
      by: ['type'],
      where: { status: AlertStatus.FAILED },
      _count: { type: true },
    });

    const eligibleByType = await Promise.all(
      statsByType.map(async stat => {
        const eligible = await prisma.emailAlert.count({
          where: {
            type: stat.type,
            status: AlertStatus.FAILED,
            retryCount: { lt: maxRetries },
          },
        });

        return {
          type: stat.type,
          failed: stat._count.type,
          eligibleForRetry: eligible,
        };
      })
    );

    return NextResponse.json({
      eligibleForRetry,
      totalFailed,
      exceeededMaxRetries,
      stats: eligibleByType,
    });
  } catch (error) {
    console.error('❌ Error fetching retry stats:', error);
    return NextResponse.json(
      {
        eligibleForRetry: 0,
        totalFailed: 0,
        exceeededMaxRetries: 0,
        stats: [],
      },
      { status: 500 }
    );
  }
}
