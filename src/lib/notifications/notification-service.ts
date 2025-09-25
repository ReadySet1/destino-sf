// src/lib/notifications/notification-service.ts

import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db-unified';
import { EmailService } from './email-service';
import { DashboardAlertService } from './dashboard-alert-service';
import { AvailabilityState } from '@/types/availability';

export interface NotificationPayload {
  type: 'availability_change' | 'pre_order_reminder' | 'waitlist_notification' | 'system_alert';
  productId?: string;
  userId?: string;
  data: Record<string, any>;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  dashboardAlerts: boolean;
  preOrderReminders: boolean;
  availabilityUpdates: boolean;
}

/**
 * Centralized notification service for handling all types of notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private emailService: EmailService;
  private dashboardService: DashboardAlertService;

  constructor() {
    this.emailService = new EmailService();
    this.dashboardService = new DashboardAlertService();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send notification based on type and preferences
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      logger.info('Processing notification', {
        type: payload.type,
        productId: payload.productId,
        userId: payload.userId
      });

      switch (payload.type) {
        case 'availability_change':
          await this.handleAvailabilityChange(payload);
          break;

        case 'pre_order_reminder':
          await this.handlePreOrderReminder(payload);
          break;

        case 'waitlist_notification':
          await this.handleWaitlistNotification(payload);
          break;

        case 'system_alert':
          await this.handleSystemAlert(payload);
          break;

        default:
          logger.warn('Unknown notification type', { type: payload.type });
      }

    } catch (error) {
      logger.error('Error sending notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload
      });
    }
  }

  /**
   * Handle product availability change notifications
   */
  private async handleAvailabilityChange(payload: NotificationPayload): Promise<void> {
    const { productId, data } = payload;
    
    if (!productId) {
      throw new Error('Product ID is required for availability change notifications');
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true
      }
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const { oldState, newState, ruleName } = data;

    // Send admin notification
    await this.sendAdminAvailabilityAlert(product, oldState, newState, ruleName);

    // Notify waitlisted customers if product became available
    if (newState === AvailabilityState.AVAILABLE && oldState !== AvailabilityState.AVAILABLE) {
      await this.notifyWaitlistedCustomers(productId);
    }

    // Send dashboard alert
    await this.dashboardService.createAlert({
      type: 'product_availability_changed',
      title: `${product.name} availability changed`,
      message: `Product availability changed from ${oldState} to ${newState}`,
      data: {
        productId,
        productName: product.name,
        oldState,
        newState,
        ruleName
      },
      priority: 'medium'
    });
  }

  /**
   * Handle pre-order reminder notifications
   */
  private async handlePreOrderReminder(payload: NotificationPayload): Promise<void> {
    const { productId, data } = payload;
    
    if (!productId) {
      throw new Error('Product ID is required for pre-order reminders');
    }

    // Get product and pre-order customers
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true
      }
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // TODO: Get customers with pre-orders for this product
    // This would require a pre_orders table
    const mockPreOrderCustomers = data.customers || [];

    for (const customer of mockPreOrderCustomers) {
      await this.emailService.sendPreOrderReminder({
        to: customer.email,
        customerName: customer.name,
        product,
        reminderType: data.reminderType || 'general',
        expectedDate: data.expectedDate
      });
    }

    logger.info('Pre-order reminders sent', {
      productId,
      customerCount: mockPreOrderCustomers.length
    });
  }

  /**
   * Handle waitlist notifications
   */
  private async handleWaitlistNotification(payload: NotificationPayload): Promise<void> {
    const { productId, userId, data } = payload;
    
    if (!productId || !userId) {
      throw new Error('Product ID and User ID are required for waitlist notifications');
    }

    // Get product and user details
    const [product, user] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        include: { category: true }
      }),
      prisma.profile.findUnique({
        where: { id: userId }
      })
    ]);

    if (!product || !user) {
      throw new Error('Product or user not found');
    }

    await this.emailService.sendWaitlistNotification({
      to: user.email,
      customerName: user.firstName || 'Customer',
      product,
      notificationType: data.notificationType || 'available'
    });

    logger.info('Waitlist notification sent', {
      productId,
      userId,
      userEmail: user.email
    });
  }

  /**
   * Handle system alerts
   */
  private async handleSystemAlert(payload: NotificationPayload): Promise<void> {
    const { data } = payload;

    // Send dashboard alert
    await this.dashboardService.createAlert({
      type: 'system',
      title: data.title || 'System Alert',
      message: data.message || 'A system event occurred',
      data: data.alertData || {},
      priority: data.priority || 'medium'
    });

    // Send email to administrators if critical
    if (data.priority === 'critical') {
      await this.sendAdminSystemAlert(data);
    }
  }

  /**
   * Send admin notification for availability changes
   */
  private async sendAdminAvailabilityAlert(
    product: any,
    oldState: string,
    newState: string,
    ruleName?: string
  ): Promise<void> {
    // Get admin emails (TODO: implement admin user management)
    const adminEmails = ['admin@destino-sf.com']; // Placeholder

    await this.emailService.sendAdminAlert({
      to: adminEmails,
      subject: `Product Availability Changed: ${product.name}`,
      product,
      changeDetails: {
        oldState,
        newState,
        ruleName,
        timestamp: new Date()
      }
    });
  }

  /**
   * Notify customers on waitlist when product becomes available
   */
  private async notifyWaitlistedCustomers(productId: string): Promise<void> {
    // TODO: Implement waitlist table and customer management
    // For now, this is a placeholder
    logger.info('Waitlist notification not implemented yet', { productId });
  }

  /**
   * Send system alerts to administrators
   */
  private async sendAdminSystemAlert(data: any): Promise<void> {
    const adminEmails = ['admin@destino-sf.com']; // Placeholder

    await this.emailService.sendSystemAlert({
      to: adminEmails,
      subject: `System Alert: ${data.title}`,
      message: data.message,
      alertData: data.alertData,
      severity: data.priority
    });
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // TODO: Implement user preferences table
    // For now, return default preferences
    return {
      emailNotifications: true,
      dashboardAlerts: true,
      preOrderReminders: true,
      availabilityUpdates: true
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    // TODO: Implement user preferences storage
    logger.info('User preferences update not implemented yet', {
      userId,
      preferences
    });
  }

  /**
   * Batch send notifications for efficiency
   */
  async sendBatchNotifications(payloads: NotificationPayload[]): Promise<void> {
    const promises = payloads.map(payload => this.sendNotification(payload));
    await Promise.allSettled(promises);
    
    logger.info('Batch notifications processed', {
      count: payloads.length
    });
  }
}
