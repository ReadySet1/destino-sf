import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { CashPaymentDetails } from '@/components/Payment/CashPaymentDetails';
import { Decimal } from '@prisma/client/runtime/library';

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{
    method?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function PaymentPage({ params, searchParams }: PageProps) {
  // Await the params and searchParams Promises to get the actual values
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { orderId } = resolvedParams;
  const paymentMethod = resolvedSearchParams.method?.toString() || 'CASH';

  if (!orderId) {
    redirect('/');
  }

  // Fetch order details from the database
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
    notFound();
  }

  // Check if the order is pending payment
  if (order.paymentStatus !== 'PENDING') {
    redirect(`/order-confirmation?status=success&orderId=${orderId}`);
  }

  // Determine which payment component to render based on the payment method
  const renderPaymentDetails = () => {
    switch (paymentMethod) {
      case 'CASH':
        return <CashPaymentDetails order={order} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-red-500">Unsupported payment method: {paymentMethod}</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Complete Your Payment</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="font-medium">Order ID: {order.id}</p>
            <p>Status: {order.status}</p>
            <p>Customer: {order.customerName}</p>
            <p>Email: {order.email}</p>
            <p>Phone: {order.phone}</p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">Items</h3>
            <ul className="space-y-2">
              {order.items.map(item => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.product.name} {item.variant?.name ? `(${item.variant.name})` : ''} ×{' '}
                    {item.quantity}
                  </span>
                  <span>${(parseFloat(item.price.toString()) * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>
                $
                {(
                  parseFloat(order.total.toString()) -
                  parseFloat(order.taxAmount?.toString() || '0')
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Tax:</span>
              <span>${parseFloat(order.taxAmount?.toString() || '0').toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>${parseFloat(order.total.toString()).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Method: {paymentMethod}</h2>
        {renderPaymentDetails()}
      </div>
    </div>
  );
}
