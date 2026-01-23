import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db-unified';
import { redirect, notFound } from 'next/navigation';
import { OrderDetailsView } from '@/components/Orders/OrderDetailsView';

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { orderId } = await params;
  const { email } = await searchParams;

  // Validate orderId is a valid UUID before querying database
  // Fixes DESTINO-SF-6: Invalid UUID characters cause Prisma errors
  if (!orderId || !UUID_REGEX.test(orderId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Try to find order (regular or catering)
  let order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  let cateringOrder = null;
  if (!order) {
    cateringOrder = await prisma.cateringOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });
  }

  // If neither order type found
  if (!order && !cateringOrder) {
    notFound();
  }

  const targetOrder = order || cateringOrder;
  const isRegularOrder = !!order;

  // Authorization check
  if (user) {
    // If user is logged in, check they own the order
    const ownerId = isRegularOrder ? order!.userId : cateringOrder!.customerId;
    if (ownerId !== user.id) {
      notFound(); // Don't expose other users' orders
    }
  } else {
    // Guest user - require email verification via query param
    if (!email || targetOrder!.email.toLowerCase() !== email.toLowerCase()) {
      // Redirect to email verification page
      redirect(`/orders/${orderId}/verify`);
    }
  }

  // Convert Decimal types to numbers for client component
  const orderData = isRegularOrder
    ? {
        ...order!,
        total: Number(order!.total),
        retryCount: order!.retryCount || 0,
        fulfillmentType: order!.fulfillmentType || 'pickup', // Default to pickup if null
        items: order!.items.map(item => ({
          ...item,
          price: Number(item.price),
        })),
        type: 'regular' as const,
      }
    : {
        ...cateringOrder!,
        total: Number(cateringOrder!.totalAmount), // Use totalAmount for catering orders
        retryCount: cateringOrder!.retryCount || 0,
        items: cateringOrder!.items.map(item => ({
          ...item,
          pricePerUnit: Number(item.pricePerUnit),
        })),
        type: 'catering' as const,
      };

  return <OrderDetailsView order={orderData} isAuthenticated={!!user} />;
}
