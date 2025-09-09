import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { AccountProfile, AccountProfileProps } from '@/components/store/AccountProfile';
import { OrderHistory, OrderHistoryProps } from '@/components/store/OrderHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { Profile } from '@prisma/client';
import { handleSignOut } from './actions';
import { User, Package, Clock, Settings, ShoppingBag, Calendar } from 'lucide-react';

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
        <div className="container mx-auto py-16 text-center">
          <div className="mx-auto max-w-md bg-white/95 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-destino-yellow/30">
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-destino-yellow to-destino-orange p-6 shadow-lg">
                <User className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="mb-4 text-3xl font-bold text-destino-charcoal">Welcome to Your Account</h1>
            <p className="mb-8 text-gray-600">
              Please sign in to access your account and order history.
            </p>
            <Button asChild size="lg" className="bg-gradient-to-r from-destino-yellow to-yellow-400 hover:from-yellow-400 hover:to-destino-yellow text-destino-charcoal shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  let profile: Profile | null = null;
  let orderCount = 0;
  let recentOrders = 0;

  try {
    // Get user data from middleware headers to avoid extra auth call
    const userId = user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Single optimized query using raw SQL for better performance
    const [profileResult, orderStats] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: userId },
      }),
      // Use raw SQL for faster aggregation
      prisma.$queryRaw<Array<{totalCount: bigint, recentCount: bigint}>>`
        SELECT 
          (SELECT COUNT(*) FROM "orders" WHERE "userId" = ${userId}) +
          (SELECT COUNT(*) FROM "catering_orders" WHERE "customerId" = ${userId}) as "totalCount",
          (SELECT COUNT(*) FROM "orders" WHERE "userId" = ${userId} AND "createdAt" >= ${thirtyDaysAgo}) +
          (SELECT COUNT(*) FROM "catering_orders" WHERE "customerId" = ${userId} AND "createdAt" >= ${thirtyDaysAgo}) as "recentCount"
      `
    ]);

    profile = profileResult;
    
    if (orderStats && orderStats.length > 0) {
      orderCount = Number(orderStats[0].totalCount);
      recentOrders = Number(orderStats[0].recentCount);
    }
  } catch (error) {
    console.error('Failed to fetch profile or order data:', error);
    // Set safe defaults if queries fail
    profile = null;
    orderCount = 0;
    recentOrders = 0;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-destino-charcoal">My Account</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {profile?.name || user.email?.split('@')[0] || 'Guest'}!
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="self-start sm:self-auto border-destino-yellow/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all"
            >
              <Settings className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm border-destino-yellow/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destino-charcoal">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-destino-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destino-charcoal">{orderCount}</div>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destino-charcoal">Recent Orders</CardTitle>
              <Clock className="h-4 w-4 text-destino-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destino-charcoal">{recentOrders}</div>
              <p className="text-xs text-gray-600 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-green-300/30 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destino-charcoal">Account Status</CardTitle>
              <User className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-gray-600 mt-1">
                Since {new Date(user.created_at).getFullYear()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col border-destino-yellow/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all duration-200 transform hover:scale-[1.02] bg-white/80 backdrop-blur-sm shadow-md"
          >
            <Link href="/menu">
              <ShoppingBag className="h-6 w-6 mb-2 text-destino-orange" />
              <span className="font-medium">Browse Menu</span>
              <span className="text-xs text-gray-600 mt-1">Order food</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col border-destino-orange/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all duration-200 transform hover:scale-[1.02] bg-white/80 backdrop-blur-sm shadow-md"
          >
            <Link href="/catering">
              <Calendar className="h-6 w-6 mb-2 text-destino-orange" />
              <span className="font-medium">Catering</span>
              <span className="text-xs text-gray-600 mt-1">Plan events</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col border-destino-yellow/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all duration-200 transform hover:scale-[1.02] bg-white/80 backdrop-blur-sm shadow-md"
          >
            <Link href="/account/orders">
              <Package className="h-6 w-6 mb-2 text-destino-orange" />
              <span className="font-medium">All Orders</span>
              <span className="text-xs text-gray-600 mt-1">Full history</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col border-blue-300/40 text-destino-charcoal hover:bg-blue-50/50 hover:border-blue-400 hover:text-destino-charcoal transition-all duration-200 transform hover:scale-[1.02] bg-white/80 backdrop-blur-sm shadow-md"
          >
            <Link href="/contact">
              <User className="h-6 w-6 mb-2 text-blue-600" />
              <span className="font-medium">Contact Us</span>
              <span className="text-xs text-gray-600 mt-1">Get help</span>
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <Card className="bg-white/95 backdrop-blur-sm border-destino-yellow/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-yellow/20">
                <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                  <User className="h-5 w-5 text-destino-orange" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-gray-600">Manage your account details and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <AccountProfile
                  {...({
                    user: user,
                    profile: profile,
                    onSignOut: handleSignOut,
                  } as AccountProfileProps)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Order History Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                      <Package className="h-5 w-5 text-destino-orange" />
                      Recent Orders
                    </CardTitle>
                    <CardDescription className="text-gray-600">Your recent orders and their status</CardDescription>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-destino-orange/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all"
                  >
                    <Link href="/account/orders">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <OrderHistory {...({ userId: user.id, limit: 5 } as OrderHistoryProps)} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-8 text-center bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/contact" className="text-destino-orange hover:text-destino-charcoal font-medium transition-colors hover:no-underline">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
