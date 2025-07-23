import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { env } from '@/env';
import { sendEmailWithQueue } from '@/lib/webhook-queue';
import { AlertType, AlertPriority, AlertStatus, OrderStatus } from '@prisma/client';
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
 * Main Alert Service Class
 * Handles sending email alerts and tracking them in the database
 */
export class AlertService {
  /**
   * Send a new order alert to admin
   */
  async sendNewOrderAlert(order: OrderWithItems): Promise<AlertResult> {
    try {
      // Get daily order count for context
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const totalOrdersToday = await prisma.order.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      const alertData: NewOrderAlertData = {
        order,
        timestamp: new Date(),
        totalOrdersToday,
      };

      const subject = `🎉 New Order #${order.id} - $${Number(order.total).toFixed(2)}`;

      // Create alert record in database
      const alertRecord = await this.createAlertRecord({
        type: AlertType.NEW_ORDER,
        priority: AlertPriority.HIGH,
        recipientEmail: env.ADMIN_EMAIL,
        subject,
        metadata: alertData,
        relatedOrderId: order.id,
        relatedUserId: order.userId || undefined,
      });

      // Queue email with rate limiting protection
      try {
        await sendEmailWithQueue({
          from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
          to: env.ADMIN_EMAIL,
          subject,
          react: React.createElement(AdminNewOrderAlert, alertData),
          priority: 'high',
        });

        await this.markAlertAsSent(alertRecord.id, 'queued');
        console.log(`✅ New order alert queued for order ${order.id}`);

        return { success: true, messageId: 'queued' };
      } catch (error: any) {
        await this.markAlertAsFailed(alertRecord.id, error.message);
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
   * Send an order status change alert to customer and admin
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

      // Send to customer
      const customerAlertRecord = await this.createAlertRecord({
        type: AlertType.ORDER_STATUS_CHANGE,
        priority: AlertPriority.MEDIUM,
        recipientEmail: order.email,
        subject,
        metadata: alertData,
        relatedOrderId: order.id,
        relatedUserId: order.userId || undefined,
      });

      const { data: customerData, error: customerError } = await resend.emails.send({
        from: `${env.SHOP_NAME} <${env.FROM_EMAIL}>`,
        to: order.email,
        subject,
        react: React.createElement(OrderStatusChangeAlert, { ...alertData, isCustomer: true }),
      });

      if (customerError) {
        await this.markAlertAsFailed(customerAlertRecord.id, customerError.message);
        console.error('❌ Failed to send customer status change alert:', customerError);
      } else {
        await this.markAlertAsSent(customerAlertRecord.id, customerData?.id);
        console.log(`✅ Customer status change alert sent for order ${order.id}`);
      }

      // Send to admin for important status changes
      if (this.shouldNotifyAdminOfStatusChange(order.status)) {
        const adminAlertRecord = await this.createAlertRecord({
          type: AlertType.ORDER_STATUS_CHANGE,
          priority: AlertPriority.MEDIUM,
          recipientEmail: env.ADMIN_EMAIL,
          subject: `🔄 Admin Alert: ${subject}`,
          metadata: alertData,
          relatedOrderId: order.id,
          relatedUserId: order.userId || undefined,
        });

        const { data: adminData, error: adminError } = await resend.emails.send({
          from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
          to: env.ADMIN_EMAIL,
          subject: `🔄 Admin Alert: ${subject}`,
          react: React.createElement(OrderStatusChangeAlert, { ...alertData, isCustomer: false }),
        });

        if (adminError) {
          await this.markAlertAsFailed(adminAlertRecord.id, adminError.message);
          console.error('❌ Failed to send admin status change alert:', adminError);
        } else {
          await this.markAlertAsSent(adminAlertRecord.id, adminData?.id);
          console.log(`✅ Admin status change alert sent for order ${order.id}`);
        }
      }

      return {
        success: !customerError,
        messageId: customerData?.id,
        error: customerError?.message,
      };
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
   * Send a payment failed alert to admin
   */
  async sendPaymentFailedAlert(order: OrderWithItems, errorMessage: string): Promise<AlertResult> {
    try {
      const alertData: PaymentFailedAlertData = {
        order,
        error: errorMessage,
        timestamp: new Date(),
      };

      const subject = `🚨 Payment Failed - Order #${order.id}`;

      const alertRecord = await this.createAlertRecord({
        type: AlertType.PAYMENT_FAILED,
        priority: AlertPriority.CRITICAL,
        recipientEmail: env.ADMIN_EMAIL,
        subject,
        metadata: alertData,
        relatedOrderId: order.id,
        relatedUserId: order.userId || undefined,
      });

      const { data, error } = await resend.emails.send({
        from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
        to: env.ADMIN_EMAIL,
        subject,
        react: React.createElement(PaymentFailedAlert, alertData),
      });

      if (error) {
        await this.markAlertAsFailed(alertRecord.id, error.message);
        return { success: false, error: error.message, retryable: true };
      }

      await this.markAlertAsSent(alertRecord.id, data?.id);
      console.log(`✅ Payment failed alert sent for order ${order.id}`);

      return { success: true, messageId: data?.id };
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
   * Send a system error alert to admin
   */
  async sendSystemErrorAlert(error: Error, context: object): Promise<AlertResult> {
    try {
      const alertData: SystemErrorAlertData = {
        error,
        context,
        timestamp: new Date(),
      };

      const subject = `🔥 System Error: ${error.name || 'Unknown Error'}`;

      const alertRecord = await this.createAlertRecord({
        type: AlertType.SYSTEM_ERROR,
        priority: AlertPriority.CRITICAL,
        recipientEmail: env.ADMIN_EMAIL,
        subject,
        metadata: alertData,
      });

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `${env.SHOP_NAME} Alerts <${env.FROM_EMAIL}>`,
        to: env.ADMIN_EMAIL,
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
        await this.markAlertAsFailed(alertRecord.id, emailError.message);
        return { success: false, error: emailError.message, retryable: true };
      }

      await this.markAlertAsSent(alertRecord.id, emailData?.id);
      console.log(`✅ System error alert sent: ${error.message}`);

      return { success: true, messageId: emailData?.id };
    } catch (alertError) {
      console.error('❌ Error sending system error alert:', alertError);
      return {
        success: false,
        error: alertError instanceof Error ? alertError.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send daily summary alert to admin
   */
  async sendDailySummary(date: Date = new Date()): Promise<AlertResult> {
    try {
      // Collect daily metrics from database
      const summaryData = await this.collectDailySummaryData(date);

      const subject = `📊 Daily Summary - ${date.toDateString()}`;

      const alertRecord = await this.createAlertRecord({
        type: AlertType.DAILY_SUMMARY,
        priority: AlertPriority.LOW,
        recipientEmail: env.ADMIN_EMAIL,
        subject,
        metadata: { summaryData },
      });

      // Send to admin
      const { data, error } = await resend.emails.send({
        from: `${env.SHOP_NAME} Reports <${env.FROM_EMAIL}>`,
        to: env.ADMIN_EMAIL,
        subject,
        react: DailySummaryAlert({
          summary: summaryData,
          shopName: env.SHOP_NAME,
        }),
      });

      if (error) {
        await this.markAlertAsFailed(alertRecord.id, error.message);
        return { success: false, error: error.message, retryable: true };
      }

      await this.markAlertAsSent(alertRecord.id, data?.id);
      console.log(`✅ Daily summary alert sent for ${date.toDateString()}`);

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('❌ Failed to send daily summary alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Collect daily summary data from database
   */
  private async collectDailySummaryData(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    try {
      // Get orders for the day
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              variant: { select: { name: true } },
            },
          },
        },
      });

      // Calculate metrics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Count by fulfillment type
      const ordersByFulfillment = {
        pickup: orders.filter(o => o.fulfillmentType === 'pickup').length,
        local_delivery: orders.filter(o => o.fulfillmentType === 'local_delivery').length,
        nationwide_shipping: orders.filter(o => o.fulfillmentType === 'nationwide_shipping').length,
      };

      // Get top products
      const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

      orders.forEach(order => {
        order.items.forEach(item => {
          const productName =
            item.product.name + (item.variant?.name ? ` (${item.variant.name})` : '');
          const existing = productSales.get(productName) || {
            name: productName,
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += item.quantity;
          existing.revenue += Number(item.price) * item.quantity;
          productSales.set(productName, existing);
        });
      });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Count failed orders and pending orders
      const failedOrders = orders.filter(o => o.paymentStatus === 'FAILED').length;
      const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

      // Get system errors count for the day
      const systemErrors = await prisma.emailAlert.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          type: AlertType.SYSTEM_ERROR,
        },
      });

      // Get alerts sent count for the day
      const alertsSent = await prisma.emailAlert.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      return {
        date,
        totalOrders,
        totalRevenue,
        ordersByFulfillment,
        topProducts,
        averageOrderValue,
        failedOrders,
        pendingOrders,
        systemErrors,
        alertsSent,
      };
    } catch (error) {
      console.error('Error collecting daily summary data:', error);

      // Return default data in case of error
      return {
        date,
        totalOrders: 0,
        totalRevenue: 0,
        ordersByFulfillment: { pickup: 0, local_delivery: 0, nationwide_shipping: 0 },
        topProducts: [],
        averageOrderValue: 0,
        failedOrders: 0,
        pendingOrders: 0,
        systemErrors: 0,
        alertsSent: 0,
      };
    }
  }

  // ===== PHASE 3: Customer-Facing Email Methods =====

  /**
   * Send order confirmation email to customer
   */
  async sendCustomerOrderConfirmation(
    data: CustomerOrderConfirmationData,
    customerEmail?: string
  ): Promise<AlertResult> {
    try {
      const email = customerEmail || data.order.email;
      const shopName = env.SHOP_NAME || 'Destino SF';
      const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destinosf.com';

      const { data: emailData, error } = await resend.emails.send({
        from: `${shopName} <${env.FROM_EMAIL}>`,
        to: [email],
        subject: `Order Confirmation #${data.order.id} - ${shopName}`,
        react: OrderConfirmationEmail({
          order: {
            id: data.order.id,
            customerName: data.order.customerName,
            email: data.order.email,
            phone: data.order.phone,
            total: Number(data.order.total),
            fulfillmentType: data.order.fulfillmentType ?? undefined,
            pickupTime: data.order.pickupTime,
            deliveryDate: data.order.deliveryDate,
            deliveryTime: data.order.deliveryTime,
            items: data.order.items.map(item => ({
              id: item.id,
              quantity: item.quantity,
              price: Number(item.price),
              product: { name: item.product.name },
              variant: item.variant ? { name: item.variant.name } : undefined,
            })),
            notes: data.order.notes,
          },
          shopName,
          websiteUrl,
          estimatedPreparationTime: data.estimatedPreparationTime,
        }),
      });

      if (error) {
        console.error('Error sending customer order confirmation:', error);
        return { success: false, error: error.message, retryable: true };
      }

      await this.createAlertRecord({
        type: AlertType.CUSTOMER_ORDER_CONFIRMATION,
        priority: AlertPriority.MEDIUM,
        recipientEmail: email,
        subject: `Order Confirmation #${data.order.id}`,
        relatedOrderId: data.order.id,
        metadata: { orderId: data.order.id, fulfillmentType: data.order.fulfillmentType },
      });

      console.log(`✅ Customer order confirmation sent for order ${data.order.id}`);
      return { success: true, messageId: emailData?.id };
    } catch (error) {
      console.error('Error sending customer order confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send order status update email to customer
   */
  async sendCustomerOrderStatusUpdate(
    data: CustomerOrderStatusData,
    customerEmail?: string
  ): Promise<AlertResult> {
    try {
      const email = customerEmail || data.order.email;
      const shopName = env.SHOP_NAME || 'Destino SF';
      const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destinosf.com';

      const { data: emailData, error } = await resend.emails.send({
        from: `${shopName} <${env.FROM_EMAIL}>`,
        to: [email],
        subject: `Order Update #${data.order.id} - ${this.formatStatus(data.order.status as any)}`,
        react: OrderStatusUpdateEmail({
          order: {
            id: data.order.id,
            customerName: data.order.customerName,
            email: data.order.email,
            total: Number(data.order.total),
            status: data.order.status,
            fulfillmentType: data.order.fulfillmentType ?? undefined,
            pickupTime: data.order.pickupTime,
            deliveryDate: data.order.deliveryDate,
            deliveryTime: data.order.deliveryTime,
            trackingNumber: data.order.trackingNumber,
            items: data.order.items.map(item => ({
              id: item.id,
              quantity: item.quantity,
              price: Number(item.price),
              product: { name: item.product.name },
              variant: item.variant ? { name: item.variant.name } : undefined,
            })),
          },
          previousStatus: data.previousStatus,
          statusMessage: data.statusMessage,
          nextSteps: data.nextSteps,
          shopName,
          websiteUrl,
        }),
      });

      if (error) {
        console.error('Error sending customer order status update:', error);
        return { success: false, error: error.message, retryable: true };
      }

      await this.createAlertRecord({
        type: AlertType.CUSTOMER_ORDER_STATUS,
        priority: AlertPriority.MEDIUM,
        recipientEmail: email,
        subject: `Order Update #${data.order.id}`,
        relatedOrderId: data.order.id,
        metadata: {
          orderId: data.order.id,
          newStatus: data.order.status,
          previousStatus: data.previousStatus,
        },
      });

      console.log(`✅ Customer order status update sent for order ${data.order.id}`);
      return { success: true, messageId: emailData?.id };
    } catch (error) {
      console.error('Error sending customer order status update:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send pickup ready notification to customer
   */
  async sendCustomerPickupReady(
    data: CustomerPickupReadyData,
    customerEmail?: string
  ): Promise<AlertResult> {
    try {
      const email = customerEmail || data.order.email;
      const shopName = env.SHOP_NAME || 'Destino SF';
      const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destinosf.com';

      const { data: emailData, error } = await resend.emails.send({
        from: `${shopName} <${env.FROM_EMAIL}>`,
        to: [email],
        subject: `🎉 Order #${data.order.id} Ready for Pickup!`,
        react: PickupReadyEmail({
          order: {
            id: data.order.id,
            customerName: data.order.customerName,
            email: data.order.email,
            total: Number(data.order.total),
            items: data.order.items.map(item => ({
              id: item.id,
              quantity: item.quantity,
              price: Number(item.price),
              product: { name: item.product.name },
              variant: item.variant ? { name: item.variant.name } : undefined,
            })),
            pickupTime: data.order.pickupTime,
            notes: data.order.notes,
          },
          shopName,
          websiteUrl,
          shopAddress: data.shopAddress,
          pickupInstructions: data.pickupInstructions,
          parkingInfo: data.parkingInfo,
        }),
      });

      if (error) {
        console.error('Error sending customer pickup ready notification:', error);
        return { success: false, error: error.message, retryable: true };
      }

      await this.createAlertRecord({
        type: AlertType.CUSTOMER_PICKUP_READY,
        priority: AlertPriority.HIGH,
        recipientEmail: email,
        subject: `Order #${data.order.id} Ready for Pickup`,
        relatedOrderId: data.order.id,
        metadata: { orderId: data.order.id },
      });

      console.log(`✅ Customer pickup ready notification sent for order ${data.order.id}`);
      return { success: true, messageId: emailData?.id };
    } catch (error) {
      console.error('Error sending customer pickup ready notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send feedback request email to customer
   */
  async sendCustomerFeedbackRequest(
    data: CustomerFeedbackRequestData,
    customerEmail?: string,
    delayHours: number = 24
  ): Promise<AlertResult> {
    try {
      const email = customerEmail || data.order.email;
      const shopName = env.SHOP_NAME || 'Destino SF';
      const websiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destinosf.com';

      // For now, send immediately (scheduling can be added later)
      const { data: emailData, error } = await resend.emails.send({
        from: `${shopName} <${env.FROM_EMAIL}>`,
        to: [email],
        subject: `How was your experience with ${shopName}?`,
        react: FeedbackRequestEmail({
          order: {
            id: data.order.id,
            customerName: data.order.customerName,
            email: data.order.email,
            total: Number(data.order.total),
            completedAt: data.order.updatedAt,
            fulfillmentType: data.order.fulfillmentType ?? undefined,
          },
          shopName,
          websiteUrl,
          reviewPlatforms: data.reviewPlatforms,
          incentive: data.incentive,
        }),
      });

      if (error) {
        console.error('Error sending customer feedback request:', error);
        return { success: false, error: error.message, retryable: true };
      }

      await this.createAlertRecord({
        type: AlertType.CUSTOMER_FEEDBACK_REQUEST,
        priority: AlertPriority.LOW,
        recipientEmail: email,
        subject: `Feedback request for order #${data.order.id}`,
        relatedOrderId: data.order.id,
        metadata: { orderId: data.order.id, delayHours },
      });

      console.log(`✅ Customer feedback request sent for order ${data.order.id}`);
      return { success: true, messageId: emailData?.id };
    } catch (error) {
      console.error('Error sending customer feedback request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Send contact form auto-reply and admin notification
   */
  async sendContactFormReceived(data: ContactFormReceivedData): Promise<AlertResult> {
    try {
      const shopName = env.SHOP_NAME || 'Destino SF';

      // Auto-reply to customer
      const { data: customerEmailData, error: customerError } = await resend.emails.send({
        from: `${shopName} <${env.FROM_EMAIL}>`,
        to: [data.email],
        subject: `Thank you for contacting ${shopName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank you for contacting ${shopName}!</h2>
            <p>Hi ${data.name},</p>
            <p>We've received your message and will get back to you within 24 hours.</p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Your message:</strong></p>
              <p>${data.message}</p>
            </div>
            <p>Best regards,<br>The ${shopName} Team</p>
          </div>
        `,
      });

      // Admin notification
      const { data: adminEmailData, error: adminError } = await resend.emails.send({
        from: `${shopName} Alerts <${env.FROM_EMAIL}>`,
        to: [env.ADMIN_EMAIL],
        subject: `New Contact Form: ${data.type} - ${data.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>From:</strong> ${data.name} (${data.email})</p>
              <p><strong>Type:</strong> ${data.type}</p>
              ${data.subject ? `<p><strong>Subject:</strong> ${data.subject}</p>` : ''}
              <p><strong>Message:</strong></p>
              <p>${data.message}</p>
              <p><strong>Received:</strong> ${data.timestamp.toLocaleString()}</p>
            </div>
            <p><a href="mailto:${data.email}?subject=Re: ${data.subject || 'Your inquiry'}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reply to Customer</a></p>
          </div>
        `,
      });

      if (customerError) {
        console.error('Error sending contact form auto-reply:', customerError);
      }

      if (adminError) {
        console.error('Error sending contact form admin notification:', adminError);
      }

      await this.createAlertRecord({
        type: AlertType.CONTACT_FORM_RECEIVED,
        priority: AlertPriority.MEDIUM,
        recipientEmail: data.email,
        subject: `Contact form submission from ${data.name}`,
        metadata: {
          type: data.type,
          subject: data.subject,
          message: data.message.substring(0, 500), // Truncate for storage
        },
      });

      console.log(`✅ Contact form processed for ${data.name} (${data.email})`);
      return { success: !customerError && !adminError };
    } catch (error) {
      console.error('Error processing contact form:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Retry failed alerts
   */
  async retryFailedAlerts(config: RetryConfig = DEFAULT_RETRY_CONFIG): Promise<void> {
    const failedAlerts = await prisma.emailAlert.findMany({
      where: {
        status: AlertStatus.FAILED,
        retryCount: { lt: config.maxRetries },
      },
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
      },
    });

    for (const alert of failedAlerts) {
      try {
        await this.retryAlert(alert, config);
      } catch (error) {
        console.error(`Failed to retry alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Create an alert record in the database
   */
  private async createAlertRecord(input: CreateAlertInput) {
    return await prisma.emailAlert.create({
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
    });
  }

  /**
   * Mark an alert as successfully sent
   */
  private async markAlertAsSent(alertId: string, messageId?: string) {
    await prisma.emailAlert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.SENT,
        sentAt: new Date(),
        metadata: messageId ? { messageId } : undefined,
      },
    });
  }

  /**
   * Mark an alert as failed
   */
  private async markAlertAsFailed(alertId: string, errorMessage: string) {
    await prisma.emailAlert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.FAILED,
        failedAt: new Date(),
        metadata: { error: errorMessage },
        retryCount: { increment: 1 },
      },
    });
  }

  /**
   * Retry a specific alert
   */
  private async retryAlert(alert: any, config: RetryConfig) {
    // Implement delay with exponential backoff
    const delay = config.exponentialBackoff
      ? config.retryDelayMs * Math.pow(2, alert.retryCount)
      : config.retryDelayMs;

    await new Promise(resolve => setTimeout(resolve, delay));

    // Update retry status
    await prisma.emailAlert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.RETRYING,
        retryCount: { increment: 1 },
      },
    });

    // Retry the specific alert type
    if (alert.type === AlertType.NEW_ORDER && alert.relatedOrder) {
      await this.sendNewOrderAlert(alert.relatedOrder);
    } else if (alert.type === AlertType.ORDER_STATUS_CHANGE && alert.relatedOrder) {
      const metadata = alert.metadata as any;
      await this.sendOrderStatusChangeAlert(
        alert.relatedOrder,
        metadata?.previousStatus || 'UNKNOWN'
      );
    }
    // Add other alert type retries as needed
  }

  /**
   * Format order status for display
   */
  private formatStatus(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      READY: 'Ready for Pickup',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      FULFILLMENT_UPDATED: 'Fulfillment Updated',
      SHIPPING: 'Shipping',
      DELIVERED: 'Delivered',
      PAYMENT_FAILED: 'Payment Failed',
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

// Export singleton instance
export const alertService = new AlertService();
