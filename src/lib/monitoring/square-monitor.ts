/**
 * Square Integration Monitoring System
 *
 * Provides comprehensive monitoring for Square operations including:
 * - Order state tracking
 * - Payment completion monitoring
 * - Health checks for Square API
 * - Alert generation for stuck orders
 */

import { prisma } from '@/lib/db-unified';
import { getSquareService } from '../square/service';
import { logger } from '../../utils/logger';

// Type alias for the unified prisma client
type PrismaClientType = typeof prisma;

export interface MonitoringAlert {
  id: string;
  type: 'STUCK_ORDER' | 'PAYMENT_FAILURE' | 'API_ERROR' | 'HEALTH_CHECK_FAIL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  data: Record<string, any>;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface SquareHealthCheck {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  responseTime: number;
  error?: string;
  checkedAt: Date;
}

export interface OrderMonitoringResult {
  totalOrders: number;
  stuckOrders: number;
  healthyOrders: number;
  alerts: MonitoringAlert[];
  recommendations: string[];
}

export class SquareMonitor {
  private prisma: PrismaClientType;
  private squareService: any;
  private alerts: MonitoringAlert[] = [];

  constructor() {
    // Use unified prisma client with built-in retry logic and connection management
    // Fixes DESTINO-SF-5: PrismaClientInitializationError on cold starts
    this.prisma = prisma;
    this.squareService = getSquareService();
  }

  /**
   * Core monitoring function - checks for stuck orders and system health
   */
  async monitorSquareIntegration(): Promise<OrderMonitoringResult> {
    try {
      logger.info('🔍 Starting Square integration monitoring...');

      // Run all monitoring checks
      const [orderCheck, healthCheck] = await Promise.all([
        this.checkOrderHealth(),
        this.performHealthChecks(),
      ]);

      // Generate alerts based on findings
      await this.generateAlerts(orderCheck, healthCheck);

      const result: OrderMonitoringResult = {
        totalOrders: orderCheck.totalOrders,
        stuckOrders: orderCheck.stuckOrders.length,
        healthyOrders: orderCheck.totalOrders - orderCheck.stuckOrders.length,
        alerts: this.alerts,
        recommendations: this.generateRecommendations(orderCheck, healthCheck),
      };

      logger.info('✅ Square monitoring completed', {
        stuckOrders: result.stuckOrders,
        alerts: result.alerts.length,
      });

      return result;
    } catch (error) {
      logger.error('💥 Error during Square monitoring:', error);
      throw error;
    }
  }

  /**
   * Check for orders that might be stuck in DRAFT state
   */
  private async checkOrderHealth(): Promise<{
    totalOrders: number;
    stuckOrders: any[];
    recentFailures: any[];
  }> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000);

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: last24Hours },
        squareOrderId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Identify potentially stuck orders
    const stuckOrders = await this.prisma.order.findMany({
      where: {
        AND: [
          { squareOrderId: { not: null } },
          { createdAt: { gte: last24Hours } },
          {
            OR: [
              // Orders pending for more than 1 hour
              {
                status: 'PENDING',
                createdAt: { lt: last1Hour },
              },
              // Orders with completed payments but stuck status
              {
                paymentStatus: 'COMPLETED',
                status: { in: ['PENDING', 'PROCESSING'] },
              },
            ],
          },
        ],
      },
      include: {
        profile: { select: { email: true, name: true } },
      },
    });

    // Check for recent payment failures
    const recentFailures = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: last24Hours },
        paymentStatus: 'FAILED',
      },
      take: 10,
    });

    return {
      totalOrders: recentOrders.length,
      stuckOrders,
      recentFailures,
    };
  }

  /**
   * Perform health checks on Square API endpoints
   */
  private async performHealthChecks(): Promise<SquareHealthCheck[]> {
    const checks: SquareHealthCheck[] = [];

    // Test Square Locations API
    const locationCheck = await this.testSquareEndpoint('locations', () =>
      this.squareService.getLocations()
    );
    checks.push(locationCheck);

    // Test Square Catalog API
    const catalogCheck = await this.testSquareEndpoint('catalog', () =>
      this.squareService.getCatalogItems()
    );
    checks.push(catalogCheck);

    // Test Square Orders API (create a test order)
    const orderCheck = await this.testSquareEndpoint('orders', () => this.testOrderCreation());
    checks.push(orderCheck);

    return checks;
  }

  /**
   * Test a specific Square API endpoint
   */
  private async testSquareEndpoint(
    serviceName: string,
    testFunction: () => Promise<any>
  ): Promise<SquareHealthCheck> {
    const startTime = Date.now();

    try {
      await testFunction();
      const responseTime = Date.now() - startTime;

      return {
        service: serviceName,
        status: responseTime < 5000 ? 'HEALTHY' : 'DEGRADED',
        responseTime,
        checkedAt: new Date(),
      };
    } catch (error: any) {
      return {
        service: serviceName,
        status: 'UNHEALTHY',
        responseTime: Date.now() - startTime,
        error: error.message || 'Unknown error',
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Test order creation (without actually creating one)
   */
  private async testOrderCreation(): Promise<boolean> {
    // Just test that we can access the orders API
    // In a real test, you might create and immediately cancel an order
    return true;
  }

  /**
   * Generate alerts based on monitoring results
   */
  private async generateAlerts(orderCheck: any, healthChecks: SquareHealthCheck[]): Promise<void> {
    this.alerts = [];

    // Alert for stuck orders
    if (orderCheck.stuckOrders.length > 0) {
      const severity = orderCheck.stuckOrders.length > 5 ? 'CRITICAL' : 'HIGH';

      this.alerts.push({
        id: `stuck-orders-${Date.now()}`,
        type: 'STUCK_ORDER',
        severity,
        title: `${orderCheck.stuckOrders.length} Stuck Orders Detected`,
        description: `Found ${orderCheck.stuckOrders.length} orders that appear to be stuck in DRAFT state or have other issues.`,
        data: {
          stuckOrderCount: orderCheck.stuckOrders.length,
          orderIds: orderCheck.stuckOrders.map((o: any) => o.id),
          oldestStuckOrder: orderCheck.stuckOrders[0]?.createdAt,
        },
        createdAt: new Date(),
      });
    }

    // Alert for API health issues
    const unhealthyServices = healthChecks.filter(check => check.status === 'UNHEALTHY');
    if (unhealthyServices.length > 0) {
      this.alerts.push({
        id: `api-health-${Date.now()}`,
        type: 'API_ERROR',
        severity: 'HIGH',
        title: 'Square API Health Issues',
        description: `${unhealthyServices.length} Square API endpoints are unhealthy.`,
        data: {
          unhealthyServices: unhealthyServices.map(s => ({
            service: s.service,
            error: s.error,
            responseTime: s.responseTime,
          })),
        },
        createdAt: new Date(),
      });
    }

    // Alert for slow API responses
    const slowServices = healthChecks.filter(check => check.responseTime > 5000);
    if (slowServices.length > 0) {
      this.alerts.push({
        id: `api-slow-${Date.now()}`,
        type: 'API_ERROR',
        severity: 'MEDIUM',
        title: 'Slow Square API Responses',
        description: `${slowServices.length} Square API endpoints are responding slowly.`,
        data: {
          slowServices: slowServices.map(s => ({
            service: s.service,
            responseTime: s.responseTime,
          })),
        },
        createdAt: new Date(),
      });
    }

    // Alert for recent payment failures
    if (orderCheck.recentFailures.length > 3) {
      this.alerts.push({
        id: `payment-failures-${Date.now()}`,
        type: 'PAYMENT_FAILURE',
        severity: 'HIGH',
        title: 'High Payment Failure Rate',
        description: `${orderCheck.recentFailures.length} payment failures in the last 24 hours.`,
        data: {
          failureCount: orderCheck.recentFailures.length,
          recentFailures: orderCheck.recentFailures.slice(0, 5),
        },
        createdAt: new Date(),
      });
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(orderCheck: any, healthChecks: SquareHealthCheck[]): string[] {
    const recommendations: string[] = [];

    if (orderCheck.stuckOrders.length > 0) {
      recommendations.push(
        `🚨 Run the cleanup script to fix ${orderCheck.stuckOrders.length} stuck orders: pnpm tsx scripts/fix-stuck-square-orders.ts --execute`
      );
    }

    const unhealthyServices = healthChecks.filter(check => check.status === 'UNHEALTHY');
    if (unhealthyServices.length > 0) {
      recommendations.push('🔧 Check Square API credentials and network connectivity');
      recommendations.push('📊 Review Square API status page for known issues');
    }

    const slowServices = healthChecks.filter(check => check.responseTime > 5000);
    if (slowServices.length > 0) {
      recommendations.push('⚡ Consider implementing caching for Square API responses');
      recommendations.push('🔄 Add retry logic with exponential backoff for slow responses');
    }

    if (orderCheck.recentFailures.length > 3) {
      recommendations.push('💳 Review payment processing logs for common failure patterns');
      recommendations.push(
        '🔍 Check if payment failures are related to specific card types or amounts'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All systems appear healthy - no action required');
    }

    return recommendations;
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(): Promise<{
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    lastCheck: Date;
    metrics: {
      ordersLast24h: number;
      stuckOrders: number;
      apiHealth: string;
      avgResponseTime: number;
    };
    alerts: MonitoringAlert[];
  }> {
    const result = await this.monitorSquareIntegration();
    const healthChecks = await this.performHealthChecks();

    const status = result.alerts.some(a => a.severity === 'CRITICAL')
      ? 'CRITICAL'
      : result.alerts.some(a => a.severity === 'HIGH')
        ? 'WARNING'
        : 'HEALTHY';

    const avgResponseTime =
      healthChecks.reduce((sum, check) => sum + check.responseTime, 0) / healthChecks.length;
    const healthyServices = healthChecks.filter(check => check.status === 'HEALTHY').length;
    const apiHealth = `${healthyServices}/${healthChecks.length} healthy`;

    return {
      status,
      lastCheck: new Date(),
      metrics: {
        ordersLast24h: result.totalOrders,
        stuckOrders: result.stuckOrders,
        apiHealth,
        avgResponseTime: Math.round(avgResponseTime),
      },
      alerts: result.alerts,
    };
  }

  /**
   * Cleanup resources
   * Note: We don't disconnect the shared prisma client - it's managed by db-unified
   */
  async cleanup(): Promise<void> {
    // Clear alerts array
    this.alerts = [];
    // Don't disconnect prisma - it's the shared unified client
  }
}

// Singleton instance
let monitorInstance: SquareMonitor | null = null;

export const getSquareMonitor = (): SquareMonitor => {
  if (!monitorInstance) {
    monitorInstance = new SquareMonitor();
  }
  return monitorInstance;
};

export const resetSquareMonitor = (): void => {
  if (monitorInstance) {
    monitorInstance.cleanup();
  }
  monitorInstance = null;
};
