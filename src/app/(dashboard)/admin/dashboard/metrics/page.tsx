import { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { getBusinessMetrics, getPerformanceMetrics, getSystemHealth } from '@/lib/admin/metrics';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';
import { MetricCard } from '@/components/admin/MetricCard';
import { Chart } from '@/components/admin/Chart';
import { AlertsList } from '@/components/admin/AlertsList';
import { RecentOrdersList } from '@/components/admin/RecentOrdersList';

export const metadata: Metadata = {
  title: 'Business Metrics Dashboard | Destino SF Admin',
  description: 'Real-time business metrics and performance monitoring',
};

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
    topSpenders: Array<{ name: string; total: number }>;
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

async function MetricsLoader() {
  const [businessMetrics, performanceMetrics, systemHealth] = await Promise.all([
    getBusinessMetrics(),
    getPerformanceMetrics(),
    getSystemHealth(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Metrics</h1>
          <p className="text-muted-foreground">Real-time insights into your business performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={systemHealth.overall === 'healthy' ? 'success' : 'danger'}>
            {systemHealth.overall === 'healthy' ? '🟢 System Healthy' : '🔴 Issues Detected'}
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth.overall !== 'healthy' && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              System Health Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemHealth.issues.map((issue, index) => (
                <div key={index} className="text-sm">
                  <Badge variant="danger" className="mr-2">
                    {issue.service}
                  </Badge>
                  {issue.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Today's Revenue"
              value={formatCurrency(businessMetrics.revenue.today)}
              description={`${businessMetrics.revenue.growth > 0 ? '+' : ''}${formatPercentage(businessMetrics.revenue.growth)} from yesterday`}
              icon={DollarSign}
              trend={businessMetrics.revenue.growth > 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Orders Today"
              value={formatNumber(businessMetrics.orders.today)}
              description={`${businessMetrics.orders.pending} pending`}
              icon={ShoppingCart}
            />
            <MetricCard
              title="Conversion Rate"
              value={formatPercentage(businessMetrics.conversion.rate)}
              description={`${formatPercentage(businessMetrics.conversion.checkoutCompletion)} checkout completion`}
              icon={TrendingUp}
              trend={businessMetrics.conversion.rate > 0.85 ? 'up' : 'down'}
            />
            <MetricCard
              title="Avg Order Value"
              value={formatCurrency(businessMetrics.orders.averageOrderValue)}
              description="Last 30 days"
              icon={CreditCard}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue for the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <Chart
                  type="line"
                  data={businessMetrics.salesHistory}
                  xAxisKey="date"
                  yAxisKey="revenue"
                  className="h-[300px]"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Volume</CardTitle>
                <CardDescription>Daily orders for the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <Chart
                  type="bar"
                  data={businessMetrics.salesHistory}
                  xAxisKey="date"
                  yAxisKey="orders"
                  className="h-[300px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentOrdersList orders={businessMetrics.recentOrders} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>Recent alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertsList alerts={businessMetrics.alerts} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="This Month"
              value={formatCurrency(businessMetrics.revenue.thisMonth)}
              description="Total revenue"
              icon={DollarSign}
            />
            <MetricCard
              title="This Week"
              value={formatCurrency(businessMetrics.revenue.thisWeek)}
              description="Weekly revenue"
              icon={DollarSign}
            />
            <MetricCard
              title="Failed Orders"
              value={formatNumber(businessMetrics.orders.failed)}
              description="Requires attention"
              icon={AlertTriangle}
              trend="down"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Best sellers by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {businessMetrics.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatNumber(product.sales)} units sold
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(product.revenue)}</div>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Total Customers"
              value={formatNumber(businessMetrics.customers.total)}
              description={`${businessMetrics.customers.newToday} new today`}
              icon={Users}
            />
            <MetricCard
              title="Returning Customers"
              value={formatPercentage(
                businessMetrics.customers.returning / businessMetrics.customers.total
              )}
              description="Customer retention rate"
              icon={Users}
            />
            <MetricCard
              title="Cart Abandonment"
              value={formatPercentage(businessMetrics.conversion.cartAbandonment)}
              description="Potential for recovery"
              icon={ShoppingCart}
              trend="down"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Highest spending customers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {businessMetrics.customers.topSpenders.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(customer.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Avg Response Time"
              value={`${performanceMetrics.responseTime.average}ms`}
              description="API response time"
              icon={Clock}
              trend={performanceMetrics.responseTime.average < 200 ? 'up' : 'down'}
            />
            <MetricCard
              title="Error Rate"
              value={formatPercentage(performanceMetrics.errorRate)}
              description="System error rate"
              icon={AlertTriangle}
              trend={performanceMetrics.errorRate < 0.01 ? 'up' : 'down'}
            />
            <MetricCard
              title="Throughput"
              value={`${performanceMetrics.throughput}/min`}
              description="Requests per minute"
              icon={TrendingUp}
            />
            <MetricCard
              title="Uptime"
              value={formatPercentage(performanceMetrics.uptime)}
              description="System availability"
              icon={Clock}
              trend={performanceMetrics.uptime > 0.999 ? 'up' : 'down'}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Database Health</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    performanceMetrics.systemHealth.database === 'healthy' ? 'success' : 'danger'
                  }
                >
                  {performanceMetrics.systemHealth.database}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment System</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    performanceMetrics.systemHealth.payments === 'healthy' ? 'success' : 'danger'
                  }
                >
                  {performanceMetrics.systemHealth.payments}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache System</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    performanceMetrics.systemHealth.cache === 'healthy' ? 'success' : 'danger'
                  }
                >
                  {performanceMetrics.systemHealth.cache}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Low Stock Items"
              value={formatNumber(businessMetrics.inventory.lowStock)}
              description="Requires restocking"
              icon={Package}
              trend="down"
            />
            <MetricCard
              title="Out of Stock"
              value={formatNumber(businessMetrics.inventory.outOfStock)}
              description="Immediate attention needed"
              icon={AlertTriangle}
              trend="down"
            />
            <MetricCard
              title="Total Products"
              value={formatNumber(businessMetrics.inventory.totalProducts)}
              description="Active inventory"
              icon={Package}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Operational Status</CardTitle>
              <CardDescription>Current system status and health checks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Payment Processing</span>
                  <Badge variant="success">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Order Management</span>
                  <Badge variant="success">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Inventory Sync</span>
                  <Badge variant="success">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email Notifications</span>
                  <Badge variant="success">Operational</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Metrics</h1>
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminMetricsPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<LoadingFallback />}>
        <MetricsLoader />
      </Suspense>
    </div>
  );
}
