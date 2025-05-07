import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { OrderHistory } from '@/components/Store/OrderHistory';

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
    <main className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">My Orders</h1>
      <OrderHistory userId={user.id} />
    </main>
  );
} 