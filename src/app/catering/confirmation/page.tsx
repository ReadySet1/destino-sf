import { Suspense } from 'react';
import CateringConfirmationContent from './CateringConfirmationContent';
import { prisma } from '@/lib/db';
import type { CateringOrder, CateringOrderItem, Prisma } from '@prisma/client';

// Type fetched directly from Prisma (might include Decimal)
type FetchedCateringOrderData =
  | (Pick<
      CateringOrder,
      | 'id'
      | 'status'
      | 'totalAmount'
      | 'name'
      | 'email'
      | 'phone'
      | 'eventDate'
      | 'numberOfPeople'
      | 'specialRequests'
      | 'deliveryZone'
      | 'deliveryAddress'
      | 'deliveryAddressJson'
      | 'createdAt'
      | 'paymentStatus'
      | 'squareOrderId'
    > & {
      items: Array<{
        id: string;
        itemName: string;
        quantity: number;
        pricePerUnit: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
        itemType: string;
        notes?: string | null;
      }>;
    })
  | null;

// Type safe to pass to client components (Decimals converted to number)
export type SerializableCateringOrderData =
  | (Pick<
      CateringOrder,
      | 'id'
      | 'status'
      | 'name'
      | 'email'
      | 'phone'
      | 'eventDate'
      | 'numberOfPeople'
      | 'specialRequests'
      | 'deliveryZone'
      | 'deliveryAddress'
      | 'deliveryAddressJson'
      | 'createdAt'
      | 'paymentStatus'
      | 'squareOrderId'
    > & {
      totalAmount: number;
      items: Array<{
        id: string;
        itemName: string;
        quantity: number;
        pricePerUnit: number;
        totalPrice: number;
        itemType: string;
        notes?: string | null;
      }>;
    })
  | null;

type CateringConfirmationPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CateringConfirmationPage({ searchParams }: CateringConfirmationPageProps) {
  // Await searchParams
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : '';
  const orderId = typeof params.orderId === 'string' ? params.orderId : null;
  const squareOrderId = typeof params.squareOrderId === 'string' ? params.squareOrderId : null;

  let orderData: FetchedCateringOrderData = null;
  let serializableOrderData: SerializableCateringOrderData = null;

  if ((status === 'success' || status === 'confirmed') && orderId) {
    console.log(`🔧 [CATERING] Fetching catering order details for ID: ${orderId}`);
    try {
      orderData = await prisma.cateringOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          name: true,
          email: true,
          phone: true,
          eventDate: true,
          numberOfPeople: true,
          specialRequests: true,
          deliveryZone: true,
          deliveryAddress: true,
          deliveryAddressJson: true,
          createdAt: true,
          paymentStatus: true,
          squareOrderId: true,
          items: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              pricePerUnit: true,
              totalPrice: true,
              itemType: true,
              notes: true,
            },
          },
        },
      });

      if (!orderData) {
        console.warn(`🔧 [CATERING] Order with ID ${orderId} not found in database.`);
      } else {
        console.log(`✅ [CATERING] Successfully fetched catering order with ${orderData.items.length} items`);
      }

      // Convert Decimal fields to numbers for serialization
      if (orderData) {
        serializableOrderData = {
          ...orderData,
          totalAmount: orderData.totalAmount.toNumber(),
          items: orderData.items.map(item => ({
            ...item,
            pricePerUnit: item.pricePerUnit.toNumber(),
            totalPrice: item.totalPrice.toNumber(),
          })),
        };
      }
    } catch (error) {
      console.error(`🔧 [CATERING] Error fetching catering order ${orderId}:`, error);
      // Keep orderData as null, the client component can show an error message
    }
  } else if (status === 'success' || status === 'confirmed') {
    console.warn('🔧 [CATERING] No orderId provided for catering confirmation');
  }

  return (
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
            <div className="mb-8 text-center">
              <div className="mb-4 text-5xl">🔄</div>
              <h1 className="mb-4 text-2xl font-bold">Loading Catering Order Details...</h1>
              <p className="text-gray-600">Please wait while we retrieve your catering order information.</p>
            </div>
          </div>
        </main>
      }
    >
      <CateringConfirmationContent 
        status={status} 
        orderData={serializableOrderData} 
        squareOrderId={squareOrderId}
      />
    </Suspense>
  );
}