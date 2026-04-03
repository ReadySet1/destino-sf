import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, User } from 'lucide-react';

interface AccountStatsProps {
  userId: string;
  userCreatedAt: string;
}

export async function AccountStats({ userId, userCreatedAt }: AccountStatsProps) {
  let orderCount = 0;
  let recentOrders = 0;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orderStats = await prisma.$queryRaw<Array<{ totalCount: bigint; recentCount: bigint }>>`
      SELECT
        (SELECT COUNT(*) FROM "orders" WHERE "userId" = ${userId}::uuid) +
        (SELECT COUNT(*) FROM "catering_orders" WHERE "customerId" = ${userId}::uuid) as "totalCount",
        (SELECT COUNT(*) FROM "orders" WHERE "userId" = ${userId}::uuid AND "createdAt" >= ${thirtyDaysAgo}) +
        (SELECT COUNT(*) FROM "catering_orders" WHERE "customerId" = ${userId}::uuid AND "createdAt" >= ${thirtyDaysAgo}) as "recentCount"
    `;

    if (orderStats && orderStats.length > 0) {
      orderCount = Number(orderStats[0].totalCount);
      recentOrders = Number(orderStats[0].recentCount);
    }
  } catch (error) {
    console.error('Failed to fetch order stats:', error);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-white/95 backdrop-blur-sm border-destino-yellow/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destino-charcoal">
            Total Orders
          </CardTitle>
          <Package className="h-4 w-4 text-destino-orange" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destino-charcoal">{orderCount}</div>
          <p className="text-xs text-gray-600 mt-1">All time</p>
        </CardContent>
      </Card>

      <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destino-charcoal">
            Recent Orders
          </CardTitle>
          <Clock className="h-4 w-4 text-destino-orange" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destino-charcoal">{recentOrders}</div>
          <p className="text-xs text-gray-600 mt-1">Last 30 days</p>
        </CardContent>
      </Card>

      <Card className="bg-white/95 backdrop-blur-sm border-green-300/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destino-charcoal">
            Account Status
          </CardTitle>
          <User className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">Active</div>
          <p className="text-xs text-gray-600 mt-1">
            Since {new Date(userCreatedAt).getFullYear()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map(i => (
        <Card key={i} className="bg-white/95 backdrop-blur-sm shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
