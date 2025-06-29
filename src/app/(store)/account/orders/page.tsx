import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { OrderHistory } from '@/components/Store/OrderHistory';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
              <Link href="/account">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Account
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-3">
              <Package className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600">View and track all your orders</p>
            </div>
          </div>
        </div>

        {/* Orders Content */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Package className="h-5 w-5 text-gray-600" />
              Order History
            </CardTitle>
            <CardDescription>
              All your orders, including regular menu items and catering orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrderHistory userId={user.id} />
          </CardContent>
        </Card>

        {/* Footer Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Need help with an order? <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">Contact our support team</Link>
          </p>
                      <div className="flex justify-center gap-4">
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                <Link href="/menu">
                  Browse Menu
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                <Link href="/catering">
                  Order Catering
                </Link>
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
} 