import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { AccountProfile, AccountProfileProps } from '@/components/store/AccountProfile';
import { OrderHistory, OrderHistoryProps } from '@/components/store/OrderHistory';
import { AccountStats, AccountStatsSkeleton } from '@/components/store/AccountStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Profile } from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { handleSignOut } from './actions';
import { User, Package, Settings, ShoppingBag, Calendar } from 'lucide-react';

async function ProfileSection({ user }: { user: SupabaseUser }) {
  let profile: Profile | null = null;

  try {
    profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }

  return (
    <AccountProfile
      {...({
        user: user,
        profile: profile,
        onSignOut: handleSignOut,
      } as AccountProfileProps)}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded" />
      <div className="h-4 w-48 bg-gray-200 rounded" />
      <div className="h-4 w-40 bg-gray-200 rounded" />
      <div className="h-10 w-full bg-gray-200 rounded mt-4" />
    </div>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?returnUrl=/account');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section — renders immediately with user email */}
        <div className="mb-8 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-destino-charcoal">My Account</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user.email?.split('@')[0] || 'Guest'}!
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

        {/* Quick Stats — streams in via Suspense */}
        <Suspense fallback={<AccountStatsSkeleton />}>
          <AccountStats userId={user.id} userCreatedAt={user.created_at} />
        </Suspense>

        {/* Quick Actions — renders immediately (static links) */}
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
          {/* Profile Section — streams in via Suspense */}
          <div className="lg:col-span-1">
            <Card className="bg-white/95 backdrop-blur-sm border-destino-yellow/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-yellow/20">
                <CardTitle className="flex items-center gap-2 text-destino-charcoal">
                  <User className="h-5 w-5 text-destino-orange" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Manage your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ProfileSkeleton />}>
                  <ProfileSection user={user} />
                </Suspense>
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
                    <CardDescription className="text-gray-600">
                      Your recent orders and their status
                    </CardDescription>
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
            <Link
              href="/contact"
              className="text-destino-orange hover:text-destino-charcoal font-medium transition-colors hover:no-underline"
            >
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
