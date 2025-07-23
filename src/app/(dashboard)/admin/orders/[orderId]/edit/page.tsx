import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { EditOrderForm } from './components/EditOrderForm';
import { logger } from '@/utils/logger';
import { serializeObject } from '@/utils/serialization';

export const metadata = {
  title: 'Edit Order - Admin Dashboard',
  description: 'Edit an existing order',
};

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function EditOrderPage({ params }: PageProps) {
  // Await the params Promise to access orderId
  const { orderId } = await params;

  if (!orderId) {
    notFound();
  }

  try {
    // Fetch the order with its items using include instead of select
    const order = await prisma.order.findUnique({
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

    if (!order) {
      logger.warn(`Order not found: ${orderId}`);
      notFound();
    }

    // Serialize the entire order object to handle all Decimal values
    const serializedOrder = serializeObject(order);

    // Format data to pass to client component
    const formattedOrder = {
      ...serializedOrder,
      pickupTime: order.pickupTime ? order.pickupTime.toISOString() : null,
      items: serializedOrder.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price, // This is now a serialized number, not a Decimal
        productName: item.product?.name || 'Unknown Product',
        variantName: item.variant?.name || null,
      })),
    };

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Edit Order</h1>
        <p className="text-gray-600 mb-6">Update order #{orderId.substring(0, 8)}</p>

        <Suspense
          fallback={
            <div className="text-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <EditOrderForm initialOrder={formattedOrder} />
        </Suspense>
      </div>
    );
  } catch (error) {
    logger.error(`Error fetching order ${orderId}:`, error);
    throw error;
  }
}
