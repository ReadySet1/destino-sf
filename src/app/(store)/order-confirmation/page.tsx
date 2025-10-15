// app/(store)/order-confirmation/page.tsx
import { Suspense } from 'react';
import OrderConfirmationContent from './OrderConfirmationContent';
import { prisma } from '@/lib/db'; // Import Prisma client
import type { Order, Prisma } from '@prisma/client'; // Import Order type and Prisma namespace
import { validateOrderId } from '@/utils/validation';

// Type fetched directly from Prisma (might include Decimal)
type FetchedOrderData =
  | (Pick<
      Order,
      | 'id'
      | 'status'
      | 'total'
      | 'customerName'
      | 'pickupTime'
      | 'paymentStatus'
      | 'trackingNumber'
      | 'shippingCarrier'
      | 'fulfillmentType'
      | 'notes'
      | 'taxAmount'
      | 'deliveryFee'
      | 'serviceFee'
      | 'gratuityAmount'
      | 'shippingCostCents'
    > & {
      items: Array<{
        id: string;
        quantity: number;
        price: Prisma.Decimal;
        product: {
          name: string | null;
          isPreorder: boolean;
          preorderEndDate: Date | null;
        } | null;
        variant: { name: string | null } | null;
      }>;
    })
  | null;

// Type safe to pass to client components (Decimals converted to number)
export type SerializableFetchedOrderData =
  | (Pick<
      Order,
      | 'id'
      | 'status'
      | 'customerName'
      | 'pickupTime'
      | 'paymentStatus'
      | 'trackingNumber'
      | 'shippingCarrier'
      | 'fulfillmentType'
      | 'notes'
    > & {
      total: number | null;
      taxAmount: number | null;
      deliveryFee: number | null;
      serviceFee: number | null;
      gratuityAmount: number | null;
      shippingCost: number | null;
      items: Array<{
        id: string;
        quantity: number;
        price: number;
        product: {
          name: string | null;
          isPreorder?: boolean;
          preorderEndDate?: string | null;
        } | null;
        variant: { name: string | null } | null;
      }>;
    })
  | null;

type OrderConfirmationPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function OrderConfirmationPage({ searchParams }: OrderConfirmationPageProps) {
  // Await searchParams
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : '';
  const rawOrderId = typeof params.orderId === 'string' ? params.orderId : null;

  let orderData: FetchedOrderData = null;
  let serializableOrderData: SerializableFetchedOrderData = null; // New variable for serializable data

  // Validate and sanitize the order ID
  const orderId = validateOrderId(rawOrderId);

  if (status === 'success' && orderId) {
    console.log(`Fetching order details for ID: ${orderId}`);

    try {
      orderData = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          // Select only needed fields
          id: true,
          status: true,
          total: true,
          customerName: true,
          pickupTime: true,
          paymentStatus: true,
          trackingNumber: true,
          shippingCarrier: true,
          fulfillmentType: true,
          notes: true,
          // Pricing breakdown fields
          taxAmount: true,
          deliveryFee: true,
          serviceFee: true,
          gratuityAmount: true,
          shippingCostCents: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                  isPreorder: true,
                  preorderEndDate: true,
                },
              },
              variant: { select: { name: true } },
            },
          },
        },
      });
      if (!orderData) {
        console.warn(`Order with ID ${orderId} not found in database.`);
      }
      // Convert Decimal fields to numbers for serialization
      if (orderData) {
        serializableOrderData = {
          ...orderData,
          total: orderData.total?.toNumber() ?? null,
          taxAmount: orderData.taxAmount?.toNumber() ?? null,
          deliveryFee: orderData.deliveryFee?.toNumber() ?? null,
          serviceFee: orderData.serviceFee?.toNumber() ?? null,
          gratuityAmount: orderData.gratuityAmount?.toNumber() ?? null,
          shippingCost: orderData.shippingCostCents ? orderData.shippingCostCents / 100 : null,
          items: orderData.items.map(item => ({
            ...item,
            price: item.price.toNumber(),
            product: item.product
              ? {
                  name: item.product.name,
                  isPreorder: item.product.isPreorder,
                  preorderEndDate: item.product.preorderEndDate
                    ? item.product.preorderEndDate.toISOString()
                    : null,
                }
              : null,
          })),
        };
      }
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      // Keep orderData as null, the client component can show an error message
    }
  }

  return (
    // Suspense boundary remains useful for client component hydration
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
            <div className="mb-8 text-center">
              <div className="mb-4 text-5xl">🔄</div>
              <h1 className="mb-4 text-2xl font-bold">Loading Order Details...</h1>
              <p className="text-gray-600">Please wait while we retrieve your order information.</p>
            </div>
          </div>
        </main>
      }
    >
      {/* Pass status and SERIALIZED fetched order data to the client component */}
      <OrderConfirmationContent status={status} orderData={serializableOrderData} />
    </Suspense>
  );
}
