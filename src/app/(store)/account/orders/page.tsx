import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { OrderHistory } from '@/components/store/OrderHistory';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package } from 'lucide-react';
import { Suspense } from 'react';

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If not authenticated, redirect to sign in
    redirect('/sign-in?returnUrl=/account/orders');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-destino-yellow/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all"
            >
              <Link href="/account">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Account
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gradient-to-br from-destino-orange to-amber-600 p-3 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-destino-charcoal">My Orders</h1>
              <p className="text-gray-600">View and track all your orders</p>
            </div>
          </div>
        </div>

        {/* Orders Content */}
        <Card className="bg-white/95 backdrop-blur-sm border-destino-orange/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-destino-cream/30 to-white border-b border-destino-orange/20">
            <CardTitle className="flex items-center gap-2 text-destino-charcoal">
              <Package className="h-5 w-5 text-destino-orange" />
              Order History
            </CardTitle>
            <CardDescription className="text-gray-600">
              All your orders, including regular menu items and catering orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="flex items-center justify-center space-x-2 py-12">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-destino-orange/30 border-t-destino-orange"></div>
                  <span className="text-destino-charcoal">Loading orders...</span>
                </div>
              }
            >
              <OrderHistory userId={user.id} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Footer Section */}
        <div className="mt-8 text-center bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
          <p className="text-sm text-gray-600 mb-4">
            Need help with an order?{' '}
            <Link
              href="/contact"
              className="text-destino-orange hover:text-destino-charcoal font-medium transition-colors hover:no-underline"
            >
              Contact our support team
            </Link>
          </p>
          <div className="flex justify-center gap-4">
            <Button
              asChild
              variant="outline"
              className="border-destino-yellow/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all transform hover:scale-[1.02]"
            >
              <Link href="/menu">Browse Menu</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-destino-orange/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all transform hover:scale-[1.02]"
            >
              <Link href="/catering">Order Catering</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
