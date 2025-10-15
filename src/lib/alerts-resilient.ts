import { Resend } from 'resend';
import { prisma, withRetry } from '@/lib/db-unified';
import { env } from '@/env';
import { sendEmailWithQueue } from '@/lib/webhook-queue';
import { AlertType, AlertPriority, AlertStatus, OrderStatus } from '@prisma/client';
import { getRecipientEmail } from '@/lib/email-routing';
import {
  AlertResult,
  CreateAlertInput,
  OrderWithItems,
  NewOrderAlertData,
  OrderStatusChangeAlertData,
  PaymentFailedAlertData,
  SystemErrorAlertData,
  RetryConfig,
  CustomerOrderConfirmationData,
  CustomerOrderStatusData,
  CustomerPickupReadyData,
  CustomerFeedbackRequestData,
  ContactFormReceivedData,
} from '@/types/alerts';
import { AdminNewOrderAlert } from '@/emails/alerts/AdminNewOrderAlert';
import { OrderStatusChangeAlert } from '@/emails/alerts/OrderStatusChangeAlert';
import { PaymentFailedAlert } from '@/emails/alerts/PaymentFailedAlert';
import { SystemErrorAlert } from '@/emails/alerts/SystemErrorAlert';
import DailySummaryAlert from '@/emails/alerts/DailySummaryAlert';
import React from 'react';
// Customer emails
import { OrderConfirmationEmail } from '@/emails/customer/OrderConfirmationEmail';
import { OrderStatusUpdateEmail } from '@/emails/customer/OrderStatusUpdateEmail';
import { PickupReadyEmail } from '@/emails/customer/PickupReadyEmail';
import { FeedbackRequestEmail } from '@/emails/customer/FeedbackRequestEmail';

// Initialize Resend with API key
const resend = new Resend(env.RESEND_API_KEY);

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  exponentialBackoff: true,
};

/**
 * Circuit breaker state for database operations
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private maxFailures = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T | null> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker moving to HALF_OPEN state');
      } else {
        console.warn('Circuit breaker is OPEN - skipping database operation');
        return null;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
      console.error(`Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Global circuit breaker for database operations
const dbCircuitBreaker = new CircuitBreaker(5, 60000);

/**
 * Resilient Alert Service Class
 * Handles sending email alerts with circuit breaker pattern to prevent cascading failures
 */
export class ResilientAlertService {
  /**
   * Send a new order alert to admin with resilient database handling
   */
  async sendNewOrderAlert(order: OrderWithItems): Promise<AlertResult> {
    try {
      // Get daily order count for context with circuit breaker protection
      let totalOrdersToday = 0;
      try {
        const countResult = await dbCircuitBreaker.execute(async () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          return await withRetry(
            () =>
              prisma.order.count({
                where: {
                  createdAt: {
                    gte: today,
                    lt: tomorrow,
                  },
                },
              }),
            3, // maxRetries
            'daily order count query'
          );
        });

        totalOrdersToday = countResult || 0;
      } catch (error) {
        console.warn('Failed to get daily order count, using fallback:', error);
        totalOrdersToday = 0; // Fallback value
      }

      const alertData: NewOrderAlertData = {
        order,
        timestamp: new Date(),
        totalOrdersToday,
      };

      const subject = `🎉 New Order #${order.id} - $${Number(order.total).toFixed(2)}`;
      const recipientEmail = getRecipientEmail(AlertType.NEW_ORDER);

      // Try to create alert record with circuit breaker protection
      let alertRecord: any = null;
      try {
        alertRecord = await dbCircuitBreaker.execute(() =>
          this.createAlertRecord({
            type: AlertType.NEW_ORDER,
            priority: AlertPriority.HIGH,
            recipientEmail,
            subject,
            metadata: alertData,
            relatedOrderId: order.id,
            relatedUserId: order.userId || undefined,
          })
        );
      } catch (error) {
        console.warn('Failed to create alert record, proceeding with email only:', error);
      }

      // Send email regardless of database record creation
      try {
        await sendEmailWithQueue({
          from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
          to: recipientEmail,
          subject,
          react: React.createElement(AdminNewOrderAlert, alertData),
          priority: 'high',
        });

        // Try to mark as sent if we have a record
        if (alertRecord) {
          try {
            await dbCircuitBreaker.execute(() => this.markAlertAsSent(alertRecord.id, 'queued'));
          } catch (error) {
            console.warn('Failed to mark alert as sent, but email was successful:', error);
          }
        }

        console.log(`✅ New order alert queued for order ${order.id} to ${recipientEmail}`);
        return { success: true, messageId: 'queued' };
      } catch (error: any) {
        // Try to mark as failed if we have a record
        if (alertRecord) {
          try {
            await dbCircuitBreaker.execute(() =>
              this.markAlertAsFailed(alertRecord.id, error.message)
            );
          } catch (dbError) {
            console.warn('Failed to mark alert as failed in database:', dbError);
          }
        }
        return { success: false, error: error.message, retryable: true };
      }
    } catch (error) {
      console.error('❌ Error sending new order alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send an order status change alert to customer and admin with resilient database handling
   */
  async sendOrderStatusChangeAlert(
    order: OrderWithItems,
    previousStatus: OrderStatus
  ): Promise<AlertResult> {
    try {
      const alertData: OrderStatusChangeAlertData = {
        order,
        previousStatus,
        newStatus: order.status,
        timestamp: new Date(),
      };

      const subject = `📦 Order #${order.id} Status Update: ${this.formatStatus(order.status)}`;

      // Try to send to customer
      let customerAlertRecord: any = null;
      try {
        customerAlertRecord = await dbCircuitBreaker.execute(() =>
          this.createAlertRecord({
            type: AlertType.ORDER_STATUS_CHANGE,
            priority: AlertPriority.MEDIUM,
            recipientEmail: order.email,
            subject,
            metadata: alertData,
            relatedOrderId: order.id,
            relatedUserId: order.userId || undefined,
          })
        );
      } catch (error) {
        console.warn(
          'Failed to create customer status change alert record, proceeding with email only:',
          error
        );
      }

      try {
        const { data: customerData, error: customerError } = await resend.emails.send({
          from: `${env.SHOP_NAME} <${env.FROM_EMAIL}>`,
          to: order.email,
          subject,
          react: React.createElement(OrderStatusChangeAlert, { ...alertData, isCustomer: true }),
        });

        if (customerError) {
          if (customerAlertRecord) {
            try {
              await dbCircuitBreaker.execute(() =>
                this.markAlertAsFailed(customerAlertRecord.id, customerError.message)
              );
            } catch (markError) {
              console.warn('Failed to mark customer alert as failed:', markError);
            }
          }
          console.error('❌ Failed to send customer status change alert:', customerError);
        } else {
          if (customerAlertRecord) {
            try {
              await dbCircuitBreaker.execute(() =>
                this.markAlertAsSent(customerAlertRecord.id, customerData?.id)
              );
            } catch (markError) {
              console.warn('Failed to mark customer alert as sent:', markError);
            }
          }
          console.log(`✅ Customer status change alert sent for order ${order.id}`);
        }
      } catch (error) {
        console.error('❌ Failed to send customer status change email:', error);
      }

      // Send to admin for important status changes
      if (this.shouldNotifyAdminOfStatusChange(order.status)) {
        const recipientEmail = getRecipientEmail(AlertType.ORDER_STATUS_CHANGE);

        let adminAlertRecord: any = null;
        try {
          adminAlertRecord = await dbCircuitBreaker.execute(() =>
            this.createAlertRecord({
              type: AlertType.ORDER_STATUS_CHANGE,
              priority: AlertPriority.MEDIUM,
              recipientEmail,
              subject: `🔔 Admin: ${subject}`,
              metadata: alertData,
              relatedOrderId: order.id,
              relatedUserId: order.userId || undefined,
            })
          );
        } catch (error) {
          console.warn(
            'Failed to create admin status change alert record, proceeding with email only:',
            error
          );
        }

        try {
          const { data: adminData, error: adminError } = await resend.emails.send({
            from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
            to: recipientEmail,
            subject: `🔔 Admin: ${subject}`,
            react: React.createElement(OrderStatusChangeAlert, { ...alertData, isCustomer: false }),
          });

          if (adminError) {
            if (adminAlertRecord) {
              try {
                await dbCircuitBreaker.execute(() =>
                  this.markAlertAsFailed(adminAlertRecord.id, adminError.message)
                );
              } catch (markError) {
                console.warn('Failed to mark admin alert as failed:', markError);
              }
            }
            console.error('❌ Failed to send admin status change alert:', adminError);
          } else {
            if (adminAlertRecord) {
              try {
                await dbCircuitBreaker.execute(() =>
                  this.markAlertAsSent(adminAlertRecord.id, adminData?.id)
                );
              } catch (markError) {
                console.warn('Failed to mark admin alert as sent:', markError);
              }
            }
            console.log(`✅ Admin status change alert sent for order ${order.id}`);
          }
        } catch (error) {
          console.error('❌ Failed to send admin status change email:', error);
        }
      }

      return { success: true, messageId: 'status-change-sent' };
    } catch (error) {
      console.error('❌ Error sending order status change alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send a payment failed alert with resilient database handling
   */
  async sendPaymentFailedAlert(order: OrderWithItems, errorMessage: string): Promise<AlertResult> {
    try {
      const alertData: PaymentFailedAlertData = {
        order,
        error: errorMessage,
        timestamp: new Date(),
      };

      const subject = `🚨 Payment Failed - Order #${order.id}`;
      const recipientEmail = getRecipientEmail(AlertType.PAYMENT_FAILED);

      let alertRecord: any = null;
      try {
        alertRecord = await dbCircuitBreaker.execute(() =>
          this.createAlertRecord({
            type: AlertType.PAYMENT_FAILED,
            priority: AlertPriority.CRITICAL,
            recipientEmail,
            subject,
            metadata: alertData,
            relatedOrderId: order.id,
            relatedUserId: order.userId || undefined,
          })
        );
      } catch (error) {
        console.warn(
          'Failed to create payment failed alert record, proceeding with email only:',
          error
        );
      }

      try {
        const { data, error } = await resend.emails.send({
          from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
          to: recipientEmail,
          subject,
          react: React.createElement(PaymentFailedAlert, alertData),
        });

        if (error) {
          if (alertRecord) {
            try {
              await dbCircuitBreaker.execute(() =>
                this.markAlertAsFailed(alertRecord.id, error.message)
              );
            } catch (markError) {
              console.warn('Failed to mark payment failed alert as failed:', markError);
            }
          }
          return { success: false, error: error.message, retryable: true };
        }

        if (alertRecord) {
          try {
            await dbCircuitBreaker.execute(() => this.markAlertAsSent(alertRecord.id, data?.id));
          } catch (markError) {
            console.warn('Failed to mark payment failed alert as sent:', markError);
          }
        }

        console.log(`✅ Payment failed alert sent for order ${order.id} to ${recipientEmail}`);
        return { success: true, messageId: data?.id };
      } catch (error) {
        console.error('❌ Failed to send payment failed email:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Email send failed',
          retryable: true,
        };
      }
    } catch (error) {
      console.error('❌ Error sending payment failed alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send a system error alert with circuit breaker protection
   */
  async sendSystemErrorAlert(error: Error, context: object): Promise<AlertResult> {
    try {
      const alertData: SystemErrorAlertData = {
        error,
        context,
        timestamp: new Date(),
      };

      const subject = `🔥 System Error: ${error.name || 'Unknown Error'}`;
      const recipientEmail = getRecipientEmail(AlertType.SYSTEM_ERROR);

      // Try to create alert record with circuit breaker protection
      let alertRecord: any = null;
      try {
        alertRecord = await dbCircuitBreaker.execute(() =>
          this.createAlertRecord({
            type: AlertType.SYSTEM_ERROR,
            priority: AlertPriority.CRITICAL,
            recipientEmail,
            subject,
            metadata: alertData,
          })
        );
      } catch (dbError) {
        console.warn(
          'Failed to create system error alert record, proceeding with email only:',
          dbError
        );
        // If we can't even log the alert, this might be a database issue
        // In this case, we still want to try sending the email but be more careful
      }

      // Send email with fallback if database is failing
      try {
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
          to: recipientEmail,
          subject,
          react: SystemErrorAlert({
            error: alertData.error,
            context: {
              ...alertData.context,
              timestamp: alertData.timestamp,
            },
            shopName: env.SHOP_NAME,
          }),
        });

        if (emailError) {
          // Try to mark as failed if we have a record
          if (alertRecord) {
            try {
              await dbCircuitBreaker.execute(() =>
                this.markAlertAsFailed(alertRecord.id, emailError.message)
              );
            } catch (markError) {
              console.warn('Failed to mark alert as failed:', markError);
            }
          }
          return { success: false, error: emailError.message, retryable: true };
        }

        // Try to mark as sent if we have a record
        if (alertRecord) {
          try {
            await dbCircuitBreaker.execute(() =>
              this.markAlertAsSent(alertRecord.id, emailData?.id)
            );
          } catch (markError) {
            console.warn('Failed to mark alert as sent, but email was successful:', markError);
          }
        }

        console.log(`✅ System error alert sent: ${error.message} to ${recipientEmail}`);
        return { success: true, messageId: emailData?.id };
      } catch (emailError) {
        console.error('❌ Failed to send system error email:', emailError);
        return {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Email send failed',
          retryable: true,
        };
      }
    } catch (alertError) {
      console.error('❌ Error in system error alert handler:', alertError);
      return {
        success: false,
        error: alertError instanceof Error ? alertError.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Create an alert record in the database with connection management
   */
  private async createAlertRecord(input: CreateAlertInput) {
    return await withRetry(
      () =>
        prisma.emailAlert.create({
          data: {
            type: input.type,
            priority: input.priority,
            recipientEmail: input.recipientEmail,
            subject: input.subject,
            metadata: input.metadata,
            relatedOrderId: input.relatedOrderId,
            relatedUserId: input.relatedUserId,
            status: AlertStatus.PENDING,
          },
        }),
      3, // maxRetries
      'create alert record'
    );
  }

  /**
   * Mark an alert as successfully sent with connection management
   */
  private async markAlertAsSent(alertId: string, messageId?: string) {
    await withRetry(
      () =>
        prisma.emailAlert.update({
          where: { id: alertId },
          data: {
            status: AlertStatus.SENT,
            sentAt: new Date(),
            metadata: {
              messageId,
            },
          },
        }),
      3, // maxRetries
      'mark alert as sent'
    );
  }

  /**
   * Mark an alert as failed with connection management
   */
  private async markAlertAsFailed(alertId: string, errorMessage: string) {
    await withRetry(
      () =>
        prisma.emailAlert.update({
          where: { id: alertId },
          data: {
            status: AlertStatus.FAILED,
            failedAt: new Date(),
            metadata: {
              error: errorMessage,
            },
          },
        }),
      3, // maxRetries
      'mark alert as failed'
    );
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return dbCircuitBreaker.getState();
  }

  /**
   * Format order status for display
   */
  private formatStatus(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.PROCESSING]: 'Processing',
      [OrderStatus.READY]: 'Ready for Pickup',
      [OrderStatus.COMPLETED]: 'Completed',
      [OrderStatus.CANCELLED]: 'Cancelled',
      [OrderStatus.FULFILLMENT_UPDATED]: 'Fulfillment Updated',
      [OrderStatus.SHIPPING]: 'Shipping',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.PAYMENT_FAILED]: 'Payment Failed',
    };

    return statusMap[status] || status;
  }

  /**
   * Determine if admin should be notified of status change
   */
  private shouldNotifyAdminOfStatusChange(status: OrderStatus): boolean {
    const adminNotificationStatuses: OrderStatus[] = [
      OrderStatus.CANCELLED,
      OrderStatus.READY,
      OrderStatus.COMPLETED,
      OrderStatus.DELIVERED,
    ];
    return adminNotificationStatuses.includes(status);
  }
}

// Export a singleton instance
export const resilientAlertService = new ResilientAlertService();
