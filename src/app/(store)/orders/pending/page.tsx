import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { PendingOrdersList } from '@/components/Orders/PendingOrdersList';

export default async function PendingOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?redirect=/orders/pending');
  }

  const rawOrders = await prisma.order.findMany({
    where: {
      userId: user.id,
      status: { in: ['PENDING', 'PAYMENT_FAILED'] },
      paymentStatus: { in: ['PENDING', 'FAILED'] }
    },
    select: {
      id: true,
      total: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      createdAt: true,
      updatedAt: true,
      retryCount: true,
      paymentUrlExpiresAt: true,
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Convert Decimal types to numbers for client component
  const pendingOrders = rawOrders.map(order => ({
    ...order,
    total: Number(order.total),
    retryCount: order.retryCount || 0,
    items: order.items.map(item => ({
      ...item,
      price: Number(item.price)
    }))
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pending Orders</h1>
        <p className="text-gray-600 mt-2">
          Complete your pending orders by retrying payment
        </p>
      </div>

      <PendingOrdersList orders={pendingOrders} />
    </div>
  );
} 