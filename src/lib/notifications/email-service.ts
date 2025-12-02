// src/lib/notifications/email-service.ts

import { logger } from '@/utils/logger';
import { env } from '@/env';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface PreOrderReminderData {
  to: string;
  customerName: string;
  product: any;
  reminderType: 'general' | 'shipping_soon' | 'ready_for_pickup';
  expectedDate?: Date;
}

interface WaitlistNotificationData {
  to: string;
  customerName: string;
  product: any;
  notificationType: 'available' | 'pre_order_open' | 'coming_soon';
}

interface AdminAlertData {
  to: string | string[];
  subject: string;
  product: any;
  changeDetails: {
    oldState: string;
    newState: string;
    ruleName?: string;
    timestamp: Date;
  };
}

interface SystemAlertData {
  to: string | string[];
  subject: string;
  message: string;
  alertData: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Email service for sending transactional emails
 * Currently using console logging as placeholder for actual email service
 */
export class EmailService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://destinosf.com';
  }

  /**
   * Send pre-order reminder email
   */
  async sendPreOrderReminder(data: PreOrderReminderData): Promise<void> {
    const template = this.generatePreOrderReminderTemplate(data);

    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info('Pre-order reminder sent', {
      to: data.to,
      productId: data.product.id,
      reminderType: data.reminderType,
    });
  }

  /**
   * Send waitlist notification email
   */
  async sendWaitlistNotification(data: WaitlistNotificationData): Promise<void> {
    const template = this.generateWaitlistTemplate(data);

    await this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info('Waitlist notification sent', {
      to: data.to,
      productId: data.product.id,
      notificationType: data.notificationType,
    });
  }

  /**
   * Send admin alert email
   */
  async sendAdminAlert(data: AdminAlertData): Promise<void> {
    const template = this.generateAdminAlertTemplate(data);
    const recipients = Array.isArray(data.to) ? data.to : [data.to];

    for (const email of recipients) {
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    }

    logger.info('Admin alert sent', {
      recipients: recipients.length,
      productId: data.product.id,
      changeType: `${data.changeDetails.oldState} → ${data.changeDetails.newState}`,
    });
  }

  /**
   * Send system alert email
   */
  async sendSystemAlert(data: SystemAlertData): Promise<void> {
    const template = this.generateSystemAlertTemplate(data);
    const recipients = Array.isArray(data.to) ? data.to : [data.to];

    for (const email of recipients) {
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    }

    logger.info('System alert sent', {
      recipients: recipients.length,
      severity: data.severity,
      subject: data.subject,
    });
  }

  /**
   * Generate pre-order reminder email template
   */
  private generatePreOrderReminderTemplate(data: PreOrderReminderData): EmailTemplate {
    const { customerName, product, reminderType, expectedDate } = data;

    let subject = '';
    let message = '';

    switch (reminderType) {
      case 'shipping_soon':
        subject = `Your pre-order is shipping soon: ${product.name}`;
        message = `Great news! Your pre-order for ${product.name} is shipping soon.`;
        break;
      case 'ready_for_pickup':
        subject = `Your pre-order is ready for pickup: ${product.name}`;
        message = `Your pre-order for ${product.name} is ready for pickup at Destino SF.`;
        break;
      default:
        subject = `Pre-order update: ${product.name}`;
        message = `We have an update on your pre-order for ${product.name}.`;
    }

    const html = this.generateEmailHTML({
      title: subject,
      greeting: `Hi ${customerName},`,
      message,
      productName: product.name,
      productImage: product.images?.[0] || '',
      expectedDate: expectedDate ? `Expected: ${expectedDate.toLocaleDateString()}` : '',
      ctaText: 'View Your Order',
      ctaUrl: `${this.baseUrl}/account/orders`,
      footer: 'Thank you for your business!',
    });

    const text = this.generateEmailText({
      greeting: `Hi ${customerName},`,
      message,
      productName: product.name,
      expectedDate: expectedDate ? `Expected: ${expectedDate.toLocaleDateString()}` : '',
      ctaText: 'View Your Order',
      ctaUrl: `${this.baseUrl}/account/orders`,
    });

    return { subject, html, text };
  }

  /**
   * Generate waitlist notification email template
   */
  private generateWaitlistTemplate(data: WaitlistNotificationData): EmailTemplate {
    const { customerName, product, notificationType } = data;

    let subject = '';
    let message = '';

    switch (notificationType) {
      case 'available':
        subject = `Back in stock: ${product.name}`;
        message = `Good news! ${product.name} is now available for purchase.`;
        break;
      case 'pre_order_open':
        subject = `Pre-orders now open: ${product.name}`;
        message = `Pre-orders are now open for ${product.name}. Reserve yours today!`;
        break;
      case 'coming_soon':
        subject = `Coming soon: ${product.name}`;
        message = `${product.name} will be available soon. We'll notify you when it's ready.`;
        break;
    }

    const html = this.generateEmailHTML({
      title: subject,
      greeting: `Hi ${customerName},`,
      message,
      productName: product.name,
      productImage: product.images?.[0] || '',
      ctaText: notificationType === 'coming_soon' ? 'Learn More' : 'Shop Now',
      ctaUrl: `${this.baseUrl}/products/${product.slug}`,
      footer: 'Happy shopping!',
    });

    const text = this.generateEmailText({
      greeting: `Hi ${customerName},`,
      message,
      productName: product.name,
      ctaText: notificationType === 'coming_soon' ? 'Learn More' : 'Shop Now',
      ctaUrl: `${this.baseUrl}/products/${product.slug}`,
    });

    return { subject, html, text };
  }

  /**
   * Generate admin alert email template
   */
  private generateAdminAlertTemplate(data: AdminAlertData): EmailTemplate {
    const { product, changeDetails } = data;
    const { oldState, newState, ruleName, timestamp } = changeDetails;

    const subject = `[Admin Alert] Product Availability Changed: ${product.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Product Availability Alert</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>${product.name}</h3>
          <p><strong>Category:</strong> ${product.category?.name || 'N/A'}</p>
          <p><strong>Change:</strong> ${oldState} → ${newState}</p>
          ${ruleName ? `<p><strong>Rule:</strong> ${ruleName}</p>` : ''}
          <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <a href="${this.baseUrl}/admin/products/${product.id}" 
             style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Product
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated alert from the Destino SF availability system.
        </p>
      </div>
    `;

    const text = `
Product Availability Alert

${product.name}
Category: ${product.category?.name || 'N/A'}
Change: ${oldState} → ${newState}
${ruleName ? `Rule: ${ruleName}` : ''}
Time: ${timestamp.toLocaleString()}

View Product: ${this.baseUrl}/admin/products/${product.id}

This is an automated alert from the Destino SF availability system.
    `;

    return { subject, html, text };
  }

  /**
   * Generate system alert email template
   */
  private generateSystemAlertTemplate(data: SystemAlertData): EmailTemplate {
    const { subject, message, alertData, severity } = data;

    const severityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${severityColors[severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">System Alert - ${severity.toUpperCase()}</h2>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h3>${subject}</h3>
          <p>${message}</p>
          
          ${
            alertData
              ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Additional Data:</strong>
              <pre style="font-size: 12px; color: #374151;">${JSON.stringify(alertData, null, 2)}</pre>
            </div>
          `
              : ''
          }
          
          <div style="margin: 20px 0;">
            <a href="${this.baseUrl}/admin/jobs" 
               style="background: #1f2937; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Admin Dashboard
            </a>
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
          Destino SF System Monitoring - ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    const text = `
System Alert - ${severity.toUpperCase()}

${subject}

${message}

${alertData ? `Additional Data:\n${JSON.stringify(alertData, null, 2)}` : ''}

View Admin Dashboard: ${this.baseUrl}/admin/jobs

Destino SF System Monitoring - ${new Date().toLocaleString()}
    `;

    return { subject, html, text };
  }

  /**
   * Generate HTML email template
   */
  private generateEmailHTML(data: {
    title: string;
    greeting: string;
    message: string;
    productName: string;
    productImage?: string;
    expectedDate?: string;
    ctaText: string;
    ctaUrl: string;
    footer: string;
  }): string {
    const {
      title,
      greeting,
      message,
      productName,
      productImage,
      expectedDate,
      ctaText,
      ctaUrl,
      footer,
    } = data;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #1f2937; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Destino SF</h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">${title}</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">${greeting}</p>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">${message}</p>
          
          <div style="background: #f9fafb; padding: 25px; border-radius: 10px; margin: 30px 0; text-align: center;">
            ${productImage ? `<img src="${productImage}" alt="${productName}" style="max-width: 200px; height: auto; border-radius: 8px; margin-bottom: 15px;">` : ''}
            <h3 style="color: #1f2937; margin: 0 0 10px 0;">${productName}</h3>
            ${expectedDate ? `<p style="color: #6b7280; margin: 0; font-size: 14px;">${expectedDate}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${ctaUrl}" 
               style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ${ctaText}
            </a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">${footer}</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280;">
          <p>Destino SF • San Francisco, CA</p>
          <p>If you no longer wish to receive these emails, you can <a href="${this.baseUrl}/unsubscribe" style="color: #dc2626;">unsubscribe here</a>.</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate plain text email
   */
  private generateEmailText(data: {
    greeting: string;
    message: string;
    productName: string;
    expectedDate?: string;
    ctaText: string;
    ctaUrl: string;
  }): string {
    const { greeting, message, productName, expectedDate, ctaText, ctaUrl } = data;

    return `
DESTINO SF

${greeting}

${message}

Product: ${productName}
${expectedDate ? `${expectedDate}` : ''}

${ctaText}: ${ctaUrl}

---
Destino SF • San Francisco, CA
Unsubscribe: ${this.baseUrl}/unsubscribe
    `.trim();
  }

  /**
   * Send email (placeholder implementation)
   * TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
   */
  private async sendEmail(data: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // Placeholder: In production, integrate with actual email service
    logger.info('Email would be sent', {
      to: data.to,
      subject: data.subject,
      htmlLength: data.html.length,
      textLength: data.text.length,
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
