import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// Updated PageProps type for Next.js 15.3+
type CheckoutSuccessProps = {
  params: Promise<{}>;
  searchParams: Promise<{
    orderId?: string | string[];
    status?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function CheckoutSuccess({ searchParams }: CheckoutSuccessProps) {
  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams.status?.toString();
  const orderId = resolvedSearchParams.orderId?.toString();

  if (status !== 'success' || !orderId) {
    redirect('/checkout/failure');
  }

  try {
    // Use a raw query to get data including the payment method
    const orders = await prisma.$queryRaw`
      SELECT id, status, "paymentMethod" 
      FROM orders 
      WHERE id = ${orderId}::uuid
    `;
    
    const order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
    
    if (!order) {
      redirect('/checkout/failure');
    }

    // Check if paymentMethod exists and is a manual method
    if (order.paymentMethod === 'CASH') {
      redirect(`/checkout/success/manual?orderId=${orderId}&paymentMethod=${order.paymentMethod}`);
    }
    
    // Continue with existing code for Square payments
    // ...
  } catch (error) {
    console.error('Error retrieving order:', error);
    redirect('/checkout/failure');
  }
} 