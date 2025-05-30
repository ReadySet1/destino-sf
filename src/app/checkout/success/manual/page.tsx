import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Order Confirmation | Destino SF',
  description: 'Your order has been received and is being processed',
};

// Updated PageProps type for Next.js 15.3+
type ManualSuccessPageProps = {
  params: Promise<{}>;
  searchParams: Promise<{
    orderId?: string | string[];
    paymentMethod?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
};

async function getOrderDetails(orderId: string) {
  try {
    return await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerName: true,
        email: true,
        paymentMethod: true,
        total: true,
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

export default async function ManualSuccessPage({ searchParams }: ManualSuccessPageProps) {
  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const orderId = resolvedSearchParams.orderId?.toString();
  const paymentMethod = resolvedSearchParams.paymentMethod?.toString();

  if (!orderId) {
    redirect('/');
  }

  const order = await getOrderDetails(orderId);
  if (!order) {
    redirect('/');
  }

  const paymentMethodName = order.paymentMethod === 'CASH' ? 'Cash' : 'Unknown';

  const paymentInstructions = order.paymentMethod === 'CASH'
    ? 'Please bring exact change when you pick up your order. Your order will be prepared according to your selected pickup time.'
    : 'Please contact us for payment instructions.';

  const nextSteps = order.paymentMethod === 'CASH'
    ? 'Your order will be ready for pickup at the scheduled time.'
    : 'We will process your order according to the selected payment method.';

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Thank You For Your Order!</h1>
        <p className="text-lg text-gray-600">
          Your order has been received and is awaiting payment.
        </p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between pb-3 border-b">
            <span className="font-medium">Order Reference:</span>
            <span>#{order.id.substring(0, 8)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b">
            <span className="font-medium">Name:</span>
            <span>{order.customerName}</span>
          </div>
          <div className="flex justify-between pb-3 border-b">
            <span className="font-medium">Email:</span>
            <span>{order.email}</span>
          </div>
          <div className="flex justify-between pb-3 border-b">
            <span className="font-medium">Payment Method:</span>
            <span>{paymentMethodName}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>${parseFloat(order.total.toString()).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Payment Instructions</h2>
        <p className="mb-3">{paymentInstructions}</p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">What Happens Next?</h2>
        <p className="mb-4">{nextSteps}</p>
        <p className="text-sm text-gray-600">
          If you have any questions about your order or any special date/time requests please
          contact us at orders@destino-sf.com or call us at (415) 577-1677. We are here to help!
        </p>
      </div>

      <div className="flex justify-center">
        <Button asChild variant="default">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}
