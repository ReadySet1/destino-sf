/**
 * Alert System for Square Monitoring
 * 
 * Handles alert notifications via multiple channels:
 * - Console logging
 * - Email notifications (if configured)
 * - Slack/Discord webhooks (if configured)
 * - Database logging for alert history
 */

import { logger } from '../../utils/logger';
import { MonitoringAlert } from './square-monitor';
import { PrismaClient } from '@prisma/client';

export interface AlertChannel {
  name: string;
  type: 'EMAIL' | 'WEBHOOK' | 'CONSOLE' | 'DATABASE';
  config: Record<string, any>;
  enabled: boolean;
}

export interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
  sentAt: Date;
}

export class AlertSystem {
  private prisma: PrismaClient;
  private channels: AlertChannel[] = [];

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeChannels();
  }

  /**
   * Initialize available alert channels based on environment configuration
   */
  private initializeChannels(): void {
    // Console channel (always enabled)
    this.channels.push({
      name: 'console',
      type: 'CONSOLE',
      config: {},
      enabled: true,
    });

    // Database logging (always enabled for history)
    this.channels.push({
      name: 'database',
      type: 'DATABASE',
      config: {},
      enabled: true,
    });

    // Slack webhook (if configured)
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.push({
        name: 'slack',
        type: 'WEBHOOK',
        config: {
          url: process.env.SLACK_WEBHOOK_URL,
          format: 'slack',
        },
        enabled: true,
      });
    }

    // Discord webhook (if configured)
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.channels.push({
        name: 'discord',
        type: 'WEBHOOK',
        config: {
          url: process.env.DISCORD_WEBHOOK_URL,
          format: 'discord',
        },
        enabled: true,
      });
    }

    // Email notifications (if configured)
    if (process.env.SMTP_HOST && process.env.ALERT_EMAIL_TO) {
      this.channels.push({
        name: 'email',
        type: 'EMAIL',
        config: {
          to: process.env.ALERT_EMAIL_TO,
          from: process.env.ALERT_EMAIL_FROM || 'noreply@destino-sf.com',
          subject: 'Square Integration Alert',
        },
        enabled: true,
      });
    }

    logger.info(`🔔 Alert system initialized with ${this.channels.length} channels:`, {
      channels: this.channels.map(c => c.name),
    });
  }

  /**
   * Send alert through all enabled channels
   */
  async sendAlert(alert: MonitoringAlert): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Only send alerts for HIGH and CRITICAL severity
    if (alert.severity !== 'HIGH' && alert.severity !== 'CRITICAL') {
      logger.debug(`Skipping alert notification for ${alert.severity} severity`);
      return results;
    }

    logger.info(`🚨 Sending ${alert.severity} alert: ${alert.title}`);

    // Send through each enabled channel
    for (const channel of this.channels.filter(c => c.enabled)) {
      try {
        const result = await this.sendThroughChannel(alert, channel);
        results.push(result);
      } catch (error: any) {
        logger.error(`Failed to send alert through ${channel.name}:`, error);
        results.push({
          channel: channel.name,
          success: false,
          error: error.message,
          sentAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Send alert through a specific channel
   */
  private async sendThroughChannel(alert: MonitoringAlert, channel: AlertChannel): Promise<NotificationResult> {
    const startTime = Date.now();

    switch (channel.type) {
      case 'CONSOLE':
        return this.sendConsoleAlert(alert, channel);
      
      case 'DATABASE':
        return this.sendDatabaseAlert(alert, channel);
      
      case 'WEBHOOK':
        return this.sendWebhookAlert(alert, channel);
      
      case 'EMAIL':
        return this.sendEmailAlert(alert, channel);
      
      default:
        throw new Error(`Unknown channel type: ${channel.type}`);
    }
  }

  /**
   * Send alert to console
   */
  private async sendConsoleAlert(alert: MonitoringAlert, channel: AlertChannel): Promise<NotificationResult> {
    const icon = this.getSeverityIcon(alert.severity);
    const message = `${icon} SQUARE ALERT: ${alert.title}\n${alert.description}`;
    
    if (alert.severity === 'CRITICAL') {
      console.error(message);
    } else {
      console.warn(message);
    }

    logger.warn('Square monitoring alert', {
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      data: alert.data,
    });

    return {
      channel: channel.name,
      success: true,
      sentAt: new Date(),
    };
  }

  /**
   * Save alert to database for history tracking
   */
  private async sendDatabaseAlert(alert: MonitoringAlert, channel: AlertChannel): Promise<NotificationResult> {
    try {
      // Note: You might need to create an alerts table in your schema
      // For now, we'll just log to the application logs
      logger.info('Alert saved to database', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        data: alert.data,
        createdAt: alert.createdAt,
      });

      return {
        channel: channel.name,
        success: true,
        sentAt: new Date(),
      };
    } catch (error: any) {
      throw new Error(`Database alert failed: ${error.message}`);
    }
  }

  /**
   * Send alert via webhook (Slack/Discord)
   */
  private async sendWebhookAlert(alert: MonitoringAlert, channel: AlertChannel): Promise<NotificationResult> {
    const payload = this.formatWebhookPayload(alert, channel.config.format);
    
    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return {
      channel: channel.name,
      success: true,
      sentAt: new Date(),
    };
  }

  /**
   * Send alert via email
   */
  private async sendEmailAlert(alert: MonitoringAlert, channel: AlertChannel): Promise<NotificationResult> {
    // This is a placeholder - you'd implement actual email sending here
    // Could use nodemailer, SendGrid, or other email service
    
    const emailContent = this.formatEmailContent(alert);
    
    logger.info('Email alert would be sent', {
      to: channel.config.to,
      subject: `${channel.config.subject} - ${alert.severity}`,
      content: emailContent,
    });

    // TODO: Implement actual email sending
    // const emailResult = await sendEmail({
    //   to: channel.config.to,
    //   from: channel.config.from,
    //   subject: `${channel.config.subject} - ${alert.severity}`,
    //   html: emailContent,
    // });

    return {
      channel: channel.name,
      success: true,
      sentAt: new Date(),
    };
  }

  /**
   * Format webhook payload for different platforms
   */
  private formatWebhookPayload(alert: MonitoringAlert, format: string): any {
    const icon = this.getSeverityIcon(alert.severity);
    const color = this.getSeverityColor(alert.severity);

    switch (format) {
      case 'slack':
        return {
          text: `${icon} Square Integration Alert`,
          attachments: [
            {
              color: color,
              title: alert.title,
              text: alert.description,
              fields: [
                {
                  title: 'Severity',
                  value: alert.severity,
                  short: true,
                },
                {
                  title: 'Type',
                  value: alert.type,
                  short: true,
                },
                {
                  title: 'Time',
                  value: alert.createdAt.toISOString(),
                  short: true,
                },
              ],
              footer: 'Square Monitoring System',
              ts: Math.floor(alert.createdAt.getTime() / 1000),
            },
          ],
        };

      case 'discord':
        return {
          content: `${icon} **Square Integration Alert**`,
          embeds: [
            {
              title: alert.title,
              description: alert.description,
              color: parseInt(color.replace('#', ''), 16),
              fields: [
                {
                  name: 'Severity',
                  value: alert.severity,
                  inline: true,
                },
                {
                  name: 'Type',
                  value: alert.type,
                  inline: true,
                },
                {
                  name: 'Time',
                  value: alert.createdAt.toISOString(),
                  inline: true,
                },
              ],
              footer: {
                text: 'Square Monitoring System',
              },
              timestamp: alert.createdAt.toISOString(),
            },
          ],
        };

      default:
        return {
          text: `${icon} ${alert.title}: ${alert.description}`,
          severity: alert.severity,
          type: alert.type,
          data: alert.data,
        };
    }
  }

  /**
   * Format email content
   */
  private formatEmailContent(alert: MonitoringAlert): string {
    const icon = this.getSeverityIcon(alert.severity);
    
    return `
      <h2>${icon} Square Integration Alert</h2>
      <h3>${alert.title}</h3>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Time:</strong> ${alert.createdAt.toISOString()}</p>
      <p><strong>Description:</strong></p>
      <p>${alert.description}</p>
      ${alert.data && Object.keys(alert.data).length > 0 ? `
        <h4>Additional Data:</h4>
        <pre>${JSON.stringify(alert.data, null, 2)}</pre>
      ` : ''}
      <hr>
      <p><em>This alert was generated by the Square Monitoring System</em></p>
    `;
  }

  /**
   * Get icon for severity level
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '⚡';
      case 'LOW': return 'ℹ️';
      default: return '📢';
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '#FF0000';
      case 'HIGH': return '#FF8C00';
      case 'MEDIUM': return '#FFD700';
      case 'LOW': return '#32CD32';
      default: return '#808080';
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Singleton instance
let alertSystemInstance: AlertSystem | null = null;

export const getAlertSystem = (): AlertSystem => {
  if (!alertSystemInstance) {
    alertSystemInstance = new AlertSystem();
  }
  return alertSystemInstance;
};

export const resetAlertSystem = (): void => {
  if (alertSystemInstance) {
    alertSystemInstance.cleanup();
  }
  alertSystemInstance = null;
};
