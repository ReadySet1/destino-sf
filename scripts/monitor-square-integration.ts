/**
 * Scheduled Square Integration Monitor
 *
 * This script runs comprehensive monitoring checks on the Square integration
 * and sends alerts when issues are detected.
 *
 * Usage:
 *   pnpm tsx scripts/monitor-square-integration.ts [--silent] [--alerts-off]
 *
 * Recommended Cron Schedule:
 *   0 0/15 * * * * - Every 15 minutes for critical monitoring
 *   0 0 0/2 * * * - Every 2 hours for less critical checks
 *
 * Environment Variables:
 *   MONITORING_ENABLED=true          # Enable/disable monitoring
 *   ALERT_CHANNELS=slack,email       # Comma-separated list of alert channels
 *   SLACK_WEBHOOK_URL=...            # Slack webhook for alerts
 *   DISCORD_WEBHOOK_URL=...          # Discord webhook for alerts
 *   ALERT_EMAIL_TO=admin@domain.com  # Email for alerts
 */

import { getSquareMonitor } from '../src/lib/monitoring/square-monitor';
import { getAlertSystem } from '../src/lib/monitoring/alert-system';
import { logger } from '../src/utils/logger';

interface MonitoringConfig {
  silent: boolean;
  alertsEnabled: boolean;
  checkInterval: number;
  alertThresholds: {
    stuckOrderCount: number;
    apiResponseTime: number;
    failureRate: number;
  };
}

class ScheduledMonitor {
  private config: MonitoringConfig;
  private monitor: any;
  private alertSystem: any;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.monitor = getSquareMonitor();
    this.alertSystem = getAlertSystem();
  }

  /**
   * Run the scheduled monitoring check
   */
  async run(): Promise<void> {
    try {
      if (!this.config.silent) {
        logger.info('🔍 Starting scheduled Square integration monitoring...');
      }

      // Skip if monitoring is disabled
      if (process.env.MONITORING_ENABLED === 'false') {
        logger.info('⏸️  Monitoring disabled via environment variable');
        return;
      }

      // Run comprehensive monitoring
      const result = await this.monitor.monitorSquareIntegration();

      // Log results
      this.logMonitoringResults(result);

      // Send alerts if enabled and issues found
      if (this.config.alertsEnabled && result.alerts.length > 0) {
        await this.processAlerts(result.alerts);
      }

      // Check if immediate action is needed
      await this.checkCriticalIssues(result);

      if (!this.config.silent) {
        logger.info('✅ Monitoring check completed', {
          stuckOrders: result.stuckOrders,
          alerts: result.alerts.length,
          status: this.getOverallStatus(result),
        });
      }
    } catch (error) {
      logger.error('💥 Error during scheduled monitoring:', error);

      // Send critical alert about monitoring failure
      if (this.config.alertsEnabled) {
        await this.sendMonitoringFailureAlert(error);
      }

      throw error;
    }
  }

  /**
   * Log monitoring results based on verbosity settings
   */
  private logMonitoringResults(result: any): void {
    const status = this.getOverallStatus(result);

    if (status === 'CRITICAL' || !this.config.silent) {
      logger.info('📊 Monitoring Results:', {
        status,
        totalOrders: result.totalOrders,
        stuckOrders: result.stuckOrders,
        healthyOrders: result.healthyOrders,
        alertCount: result.alerts.length,
        recommendations: result.recommendations.length,
      });
    }

    // Always log critical alerts
    const criticalAlerts = result.alerts.filter((a: any) => a.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      logger.error('🚨 CRITICAL ALERTS DETECTED:', {
        count: criticalAlerts.length,
        alerts: criticalAlerts.map((a: any) => ({
          type: a.type,
          title: a.title,
          description: a.description,
        })),
      });
    }
  }

  /**
   * Process and send alerts
   */
  private async processAlerts(alerts: any[]): Promise<void> {
    logger.info(`📢 Processing ${alerts.length} alerts...`);

    for (const alert of alerts) {
      try {
        const results = await this.alertSystem.sendAlert(alert);

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        if (!this.config.silent) {
          logger.info(`Alert sent through ${successCount} channels`, {
            alertType: alert.type,
            severity: alert.severity,
            failures: failureCount,
          });
        }

        // Log failures
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          logger.warn('Some alert channels failed:', {
            failures: failures.map(f => ({ channel: f.channel, error: f.error })),
          });
        }
      } catch (error) {
        logger.error('Failed to send alert:', error);
      }
    }
  }

  /**
   * Check for issues that need immediate attention
   */
  private async checkCriticalIssues(result: any): Promise<void> {
    const criticalIssues: string[] = [];

    // High number of stuck orders
    if (result.stuckOrders > this.config.alertThresholds.stuckOrderCount) {
      criticalIssues.push(
        `${result.stuckOrders} stuck orders detected (threshold: ${this.config.alertThresholds.stuckOrderCount})`
      );
    }

    // Critical alerts present
    const criticalAlerts = result.alerts.filter((a: any) => a.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      criticalIssues.push(`${criticalAlerts.length} critical alerts active`);
    }

    // Log critical issues
    if (criticalIssues.length > 0) {
      logger.error('🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:', {
        issues: criticalIssues,
        recommendations: result.recommendations,
      });

      // You could trigger additional escalation here
      // e.g., page on-call engineer, create incident ticket, etc.
    }
  }

  /**
   * Send alert about monitoring system failure
   */
  private async sendMonitoringFailureAlert(error: any): Promise<void> {
    try {
      const alert = {
        id: `monitoring-failure-${Date.now()}`,
        type: 'HEALTH_CHECK_FAIL' as const,
        severity: 'CRITICAL' as const,
        title: 'Square Monitoring System Failure',
        description: `The Square monitoring system has failed and cannot perform health checks. Error: ${error.message}`,
        data: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      };

      await this.alertSystem.sendAlert(alert);
    } catch (alertError) {
      logger.error('Failed to send monitoring failure alert:', alertError);
    }
  }

  /**
   * Get overall system status
   */
  private getOverallStatus(result: any): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    if (result.alerts.some((a: any) => a.severity === 'CRITICAL')) {
      return 'CRITICAL';
    }
    if (result.alerts.some((a: any) => a.severity === 'HIGH')) {
      return 'WARNING';
    }
    return 'HEALTHY';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.monitor.cleanup();
    await this.alertSystem.cleanup();
  }
}

// Parse command line arguments
function parseArgs(): MonitoringConfig {
  const args = process.argv.slice(2);

  return {
    silent: args.includes('--silent'),
    alertsEnabled: !args.includes('--alerts-off'),
    checkInterval: 15 * 60 * 1000, // 15 minutes
    alertThresholds: {
      stuckOrderCount: parseInt(process.env.STUCK_ORDER_THRESHOLD || '3'),
      apiResponseTime: parseInt(process.env.API_RESPONSE_THRESHOLD || '5000'),
      failureRate: parseFloat(process.env.FAILURE_RATE_THRESHOLD || '0.1'),
    },
  };
}

// Display startup information
function logStartupInfo(config: MonitoringConfig): void {
  console.log('🔍 SQUARE INTEGRATION MONITOR');
  console.log('═'.repeat(40));
  console.log(`🔧 Silent Mode: ${config.silent}`);
  console.log(`📢 Alerts: ${config.alertsEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`📊 Stuck Order Threshold: ${config.alertThresholds.stuckOrderCount}`);
  console.log(`⏱️  API Response Threshold: ${config.alertThresholds.apiResponseTime}ms`);

  // Show configured alert channels
  const channels = [];
  if (process.env.SLACK_WEBHOOK_URL) channels.push('Slack');
  if (process.env.DISCORD_WEBHOOK_URL) channels.push('Discord');
  if (process.env.ALERT_EMAIL_TO) channels.push('Email');
  channels.push('Console', 'Database');

  console.log(`📡 Alert Channels: ${channels.join(', ')}`);
  console.log('');
}

// Main execution
async function main(): Promise<void> {
  const config = parseArgs();

  if (!config.silent) {
    logStartupInfo(config);
  }

  const monitor = new ScheduledMonitor(config);

  try {
    await monitor.run();
  } finally {
    await monitor.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Monitoring failed:', error.message);
      process.exit(1);
    });
}

export { ScheduledMonitor };
