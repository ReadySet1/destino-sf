import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { AccountProfile, AccountProfileProps } from '@/components/Store/AccountProfile';
import { OrderHistory, OrderHistoryProps } from '@/components/Store/OrderHistory';
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto py-16 text-center">
          <div className="mx-auto max-w-md">
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-amber-100 p-6">
                <User className="h-12 w-12 text-amber-600" />
              </div>
            </div>
            <h1 className="mb-4 text-3xl font-bold text-gray-900">Welcome to Your Account</h1>
            <p className="mb-8 text-gray-600">Please sign in to access your account and order history.</p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  let profile: Profile | null = null;
  let orderCount = 0;
  let recentOrders = 0;
  
  try {
    // Fetch profile and order statistics
    const [profileResult, orderCountResult, recentOrdersResult] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: user.id },
      }),
      // Count total orders (both regular and catering)
      Promise.all([
        prisma.order.count({
          where: { userId: user.id },
        }),
        prisma.cateringOrder.count({
          where: { customerId: user.id },
        }),
      ]).then(([regular, catering]) => regular + catering),
      // Count recent orders (last 30 days)
      Promise.all([
        prisma.order.count({
          where: { 
            userId: user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          },
        }),
        prisma.cateringOrder.count({
          where: { 
            customerId: user.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          },
        }),
      ]).then(([regular, catering]) => regular + catering),
    ]);
    
    profile = profileResult;
    orderCount = orderCountResult;
    recentOrders = recentOrdersResult;
  } catch (error) {
    console.error('Failed to fetch profile or order data:', error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {profile?.name || user.email?.split('@')[0] || 'Guest'}!
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="self-start sm:self-auto border-gray-300 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{orderCount}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Recent Orders</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{recentOrders}</div>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Account Status</CardTitle>
              <User className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-gray-500 mt-1">Since {new Date(user.created_at).getFullYear()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button asChild variant="outline" className="h-auto p-4 flex-col bg-white/80 backdrop-blur-sm border-amber-200 hover:bg-amber-50">
            <Link href="/menu">
              <ShoppingBag className="h-6 w-6 mb-2 text-amber-600" />
              <span className="font-medium">Browse Menu</span>
              <span className="text-xs text-gray-500 mt-1">Order food</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto p-4 flex-col bg-white/80 backdrop-blur-sm border-orange-200 hover:bg-orange-50">
            <Link href="/catering">
              <Calendar className="h-6 w-6 mb-2 text-orange-600" />
              <span className="font-medium">Catering</span>
              <span className="text-xs text-gray-500 mt-1">Plan events</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto p-4 flex-col bg-white/80 backdrop-blur-sm border-amber-200 hover:bg-amber-50">
            <Link href="/account/orders">
              <Package className="h-6 w-6 mb-2 text-amber-600" />
              <span className="font-medium">All Orders</span>
              <span className="text-xs text-gray-500 mt-1">Full history</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto p-4 flex-col bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-gray-50">
            <Link href="/contact">
              <User className="h-6 w-6 mb-2 text-gray-600" />
              <span className="font-medium">Contact Us</span>
              <span className="text-xs text-gray-500 mt-1">Get help</span>
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <Card className="bg-white/90 backdrop-blur-sm border-amber-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <User className="h-5 w-5 text-amber-600" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Manage your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccountProfile {...({ user: user, profile: profile, onSignOut: handleSignOut } as AccountProfileProps)} />
              </CardContent>
            </Card>
          </div>

          {/* Order History Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-sm border-orange-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Package className="h-5 w-5 text-orange-600" />
                      Recent Orders
                    </CardTitle>
                    <CardDescription>
                      Your recent orders and their status
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/account/orders">
                      View All
                    </Link>
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
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? <Link href="/contact" className="text-amber-600 hover:text-amber-700 font-medium">Contact our support team</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
