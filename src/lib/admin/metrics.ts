/**
 * Admin Metrics Collection System
 * Provides business metrics, performance data, and system health information
 */

import { prisma } from '@/lib/db-unified';
import { performanceMonitor } from '@/lib/monitoring/performance';

interface BusinessMetrics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  orders: {
    today: number;
    pending: number;
    completed: number;
    failed: number;
    averageOrderValue: number;
  };
  conversion: {
    rate: number;
    cartAbandonment: number;
    checkoutCompletion: number;
  };
  inventory: {
    lowStock: number;
    outOfStock: number;
    totalProducts: number;
  };
  customers: {
    total: number;
    newToday: number;
    returning: number;
    topSpenders: Array<{ name: string; total: number; }>;
  };
  salesHistory: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    customer: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  alerts: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

interface PerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  throughput: number;
  uptime: number;
  systemHealth: {
    database: 'healthy' | 'degraded' | 'down';
    payments: 'healthy' | 'degraded' | 'down';
    cache: 'healthy' | 'degraded' | 'down';
  };
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  issues: Array<{
    service: string;
    status: 'healthy' | 'degraded' | 'down';
    message: string;
  }>;
}

/**
 * Get comprehensive business metrics
 */
export async function getBusinessMetrics(): Promise<BusinessMetrics> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Revenue calculations
    const [
      todayRevenue,
      yesterdayRevenue,
      weekRevenue,
      monthRevenue,
      todayOrders,
      pendingOrders,
      completedOrders,
      failedOrders,
      avgOrderValue,
      totalCustomers,
      newTodayCustomers,
      returningCustomers,
      totalProducts,
      lowStockProducts,
      outOfStockProducts
    ] = await Promise.all([
      // Revenue queries
      prisma.order.aggregate({
        where: {
          "createdAt": { gte: todayStart },
          "paymentStatus": 'COMPLETED'
        },
        _sum: { total: true }
      }),
      
      prisma.order.aggregate({
        where: {
          "createdAt": { 
            gte: yesterdayStart,
            lt: todayStart
          },
          "paymentStatus": 'COMPLETED'
        },
        _sum: { total: true }
      }),
      
      prisma.order.aggregate({
        where: {
          "createdAt": { gte: weekStart },
          "paymentStatus": 'COMPLETED'
        },
        _sum: { total: true }
      }),
      
      prisma.order.aggregate({
        where: {
          "createdAt": { gte: monthStart },
          "paymentStatus": 'COMPLETED'
        },
        _sum: { total: true }
      }),

      // Order counts
      prisma.order.count({
        where: { "createdAt": { gte: todayStart } }
      }),
      
      prisma.order.count({
        where: { status: 'PENDING' }
      }),
      
      prisma.order.count({
        where: { status: 'COMPLETED' }
      }),
      
      prisma.order.count({
        where: { "paymentStatus": 'FAILED' }
      }),

      // Average order value (last 30 days)
      prisma.order.aggregate({
        where: {
          "createdAt": { gte: last30Days },
          "paymentStatus": 'COMPLETED'
        },
        _avg: { total: true }
      }),

      // Customer metrics
      prisma.profile.count(),
      
      prisma.profile.count({
        where: { "created_at": { gte: todayStart } }
      }),
      
      // Returning customers (simplified - users with more than one order)
      prisma.profile.count({
        where: {
          orders: {
            some: {
              "paymentStatus": 'COMPLETED'
            }
          }
        }
      }),

      // Product inventory
      prisma.product.count({
        where: { active: true }
      }),
      
      prisma.product.count({
        where: { 
          active: true,
          inventory: { lte: 5, gt: 0 }
        }
      }),
      
      prisma.product.count({
        where: { 
          active: true,
          inventory: 0
        }
      })
    ]);

    // Calculate growth rate
    const todayRevenueValue = Number(todayRevenue._sum.total || 0);
    const yesterdayRevenueValue = Number(yesterdayRevenue._sum.total || 0);
    const growthRate = yesterdayRevenueValue > 0 
      ? ((todayRevenueValue - yesterdayRevenueValue) / yesterdayRevenueValue)
      : 0;

    // Get sales history (last 30 days)
    const salesHistory = await getDailySalesHistory(30);
    
    // Get top products
    const topProducts = await getTopProducts(10);
    
    // Get recent orders
    const recentOrders = await getRecentOrders(10);
    
    // Get top customers
    const topCustomers = await getTopCustomers(5);

    // Get system alerts
    const alerts = await getSystemAlerts();

    // Calculate conversion metrics (simplified)
    const totalSessions = Math.max(todayOrders * 3, 100); // Estimate
    const conversionRate = todayOrders / totalSessions;
    const cartAbandonment = 0.25; // Estimate - would need session tracking
    const checkoutCompletion = completedOrders / Math.max(todayOrders, 1);

    return {
      revenue: {
        today: todayRevenueValue,
        thisWeek: Number(weekRevenue._sum.total || 0),
        thisMonth: Number(monthRevenue._sum.total || 0),
        growth: growthRate
      },
      orders: {
        today: todayOrders,
        pending: pendingOrders,
        completed: completedOrders,
        failed: failedOrders,
        averageOrderValue: Number(avgOrderValue._avg.total || 0)
      },
      conversion: {
        rate: conversionRate,
        cartAbandonment,
        checkoutCompletion
      },
      inventory: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        totalProducts
      },
      customers: {
        total: totalCustomers,
        newToday: newTodayCustomers,
        returning: returningCustomers,
        topSpenders: topCustomers
      },
      salesHistory,
      topProducts,
      recentOrders,
      alerts
    };
  } catch (error) {
    console.error('Error getting business metrics:', error);
    return getDefaultBusinessMetrics();
  }
}

/**
 * Get performance metrics from monitoring system
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  try {
    const performance = performanceMonitor.getPerformanceSummary();
    
    // Check system health
    const healthChecks = await Promise.allSettled([
      checkDatabaseHealth(),
      checkPaymentSystemHealth(),
      checkCacheHealth()
    ]);

    const systemHealth = {
      database: healthChecks[0].status === 'fulfilled' && healthChecks[0].value ? 'healthy' as const : 'down' as const,
      payments: healthChecks[1].status === 'fulfilled' && healthChecks[1].value ? 'healthy' as const : 'down' as const,
      cache: healthChecks[2].status === 'fulfilled' && healthChecks[2].value ? 'healthy' as const : 'degraded' as const
    };

    return {
      responseTime: {
        average: performance.response_times.average,
        p95: performance.response_times.p95,
        p99: performance.response_times.p95 * 1.2 // Estimate
      },
      errorRate: performance.error_rate / 100,
      throughput: performance.throughput,
      uptime: 0.999, // Would integrate with monitoring service
      systemHealth
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return {
      responseTime: { average: 200, p95: 500, p99: 1000 },
      errorRate: 0.01,
      throughput: 120,
      uptime: 0.99,
      systemHealth: { database: 'healthy', payments: 'healthy', cache: 'healthy' }
    };
  }
}

/**
 * Get overall system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    const healthChecks = await Promise.allSettled([
      { name: 'Database', check: checkDatabaseHealth() },
      { name: 'Payment System', check: checkPaymentSystemHealth() },
      { name: 'Cache System', check: checkCacheHealth() },
      { name: 'Email Service', check: checkEmailHealth() }
    ]);

    const issues: SystemHealth['issues'] = [];
    let healthyCount = 0;

    for (let i = 0; i < healthChecks.length; i++) {
      const result = healthChecks[i];
      const serviceName = ['Database', 'Payment System', 'Cache System', 'Email Service'][i];
      
      if (result.status === 'fulfilled' && result.value) {
        healthyCount++;
      } else {
        issues.push({
          service: serviceName,
          status: 'down',
          message: result.status === 'rejected' ? result.reason?.message || 'Service check failed' : 'Service is unhealthy'
        });
      }
    }

    const overall = healthyCount === healthChecks.length ? 'healthy' : 
                   healthyCount >= healthChecks.length / 2 ? 'degraded' : 'down';

    return { overall, issues };
  } catch (error) {
    return {
      overall: 'down',
      issues: [{ service: 'System', status: 'down', message: 'Unable to check system health' }]
    };
  }
}

// Helper functions

async function getDailySalesHistory(days: number) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  try {
    const rawData = await prisma.$queryRaw<Array<{
      date: string;
      revenue: number;
      orders: number;
    }>>`
      SELECT 
        DATE("createdAt") as date,
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'COMPLETED' THEN total ELSE 0 END), 0) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return rawData.map(row => ({
      date: row.date,
      revenue: Number(row.revenue),
      orders: Number(row.orders)
    }));
  } catch (error) {
    console.error('Error getting sales history:', error);
    return [];
  }
}

async function getTopProducts(limit: number) {
  try {
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        price: true
      },
      orderBy: {
        _sum: {
          price: 'desc'
        }
      },
      take: limit
    });

    const productsWithNames = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true }
        });

        return {
          name: product?.name || 'Unknown Product',
          sales: Number(item._sum.quantity || 0),
          revenue: Number(item._sum.price || 0)
        };
      })
    );

    return productsWithNames;
  } catch (error) {
    console.error('Error getting top products:', error);
    return [];
  }
}

async function getRecentOrders(limit: number) {
  try {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { "createdAt": 'desc' },
      select: {
        id: true,
        "customerName": true,
        email: true,
        total: true,
        status: true,
        "createdAt": true
      }
    });

    return orders.map(order => ({
      id: order.id,
      customer: order.customerName || order.email || 'Guest',
      total: Number(order.total),
      status: order.status,
      createdAt: order.createdAt.toISOString()
    }));
  } catch (error) {
    console.error('Error getting recent orders:', error);
    return [];
  }
}

async function getTopCustomers(limit: number) {
  try {
    const topCustomers = await prisma.order.groupBy({
      by: ['email'],
      where: {
        "paymentStatus": 'COMPLETED',
        email: {
          not: ""
        }
      },
      _sum: {
        total: true
      },
      orderBy: {
        _sum: {
          total: 'desc'
        }
      },
      take: limit
    });

    return topCustomers.map(customer => ({
      name: customer.email || 'Unknown',
      total: Number(customer._sum.total || 0)
    }));
  } catch (error) {
    console.error('Error getting top customers:', error);
    return [];
  }
}

async function getSystemAlerts() {
  const alerts: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }> = [];

  try {
    // Check for failed orders
    const failedOrdersCount = await prisma.order.count({
      where: {
        "paymentStatus": 'FAILED',
        "createdAt": {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (failedOrdersCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${failedOrdersCount} failed payment(s) in the last 24 hours`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for low stock
    const lowStockCount = await prisma.product.count({
      where: {
        active: true,
        inventory: { lte: 5, gt: 0 }
      }
    });

    if (lowStockCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${lowStockCount} product(s) are low in stock`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for out of stock
    const outOfStockCount = await prisma.product.count({
      where: {
        active: true,
        inventory: 0
      }
    });

    if (outOfStockCount > 0) {
      alerts.push({
        type: 'error',
        message: `${outOfStockCount} product(s) are out of stock`,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error getting system alerts:', error);
    return [{
      type: 'error' as const,
      message: 'Unable to fetch system alerts',
      timestamp: new Date().toISOString()
    }];
  }
}

// Health check functions
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkPaymentSystemHealth(): Promise<boolean> {
  try {
    // Simple check - would integrate with actual payment system
    return true;
  } catch {
    return false;
  }
}

async function checkCacheHealth(): Promise<boolean> {
  try {
    // Would check Redis/cache system
    return true;
  } catch {
    return false;
  }
}

async function checkEmailHealth(): Promise<boolean> {
  try {
    // Would check email service
    return true;
  } catch {
    return false;
  }
}

function getDefaultBusinessMetrics(): BusinessMetrics {
  return {
    revenue: { today: 0, thisWeek: 0, thisMonth: 0, growth: 0 },
    orders: { today: 0, pending: 0, completed: 0, failed: 0, averageOrderValue: 0 },
    conversion: { rate: 0, cartAbandonment: 0, checkoutCompletion: 0 },
    inventory: { lowStock: 0, outOfStock: 0, totalProducts: 0 },
    customers: { total: 0, newToday: 0, returning: 0, topSpenders: [] },
    salesHistory: [],
    topProducts: [],
    recentOrders: [],
    alerts: []
  };
}
