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
      | 'paymentMethod'
      | 'squareOrderId'
      | 'retryCount'
      | 'lastRetryAt'
      | 'paymentUrl'
      | 'paymentUrlExpiresAt'
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
      | 'paymentMethod'
      | 'squareOrderId'
      | 'retryCount'
      | 'lastRetryAt'
      | 'paymentUrl'
      | 'paymentUrlExpiresAt'
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
  const urlStatus = typeof params.status === 'string' ? params.status : '';
  let orderId = typeof params.orderId === 'string' ? params.orderId : null;
  const squareOrderId = typeof params.squareOrderId === 'string' ? params.squareOrderId : null;

  let orderData: FetchedCateringOrderData = null;
  let serializableOrderData: SerializableCateringOrderData = null;
  let actualStatus = urlStatus;

  // URL decode the orderId in case it was encoded
  if (orderId) {
    try {
      orderId = decodeURIComponent(orderId);
    } catch (error) {
      console.warn(`Failed to decode catering orderId: ${orderId}`, error);
    }
  }

  // Validate UUID format before making database query
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Always fetch order data if orderId is provided (regardless of URL status)
  // This handles Square redirects that don't include status parameter
  if (orderId) {
    // Validate UUID format before database query
    if (!isValidUUID(orderId)) {
      console.error(`🔧 [CATERING] Invalid UUID format for orderId: ${orderId}`);
      actualStatus = 'not_found';
    } else {
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
          paymentMethod: true,
          squareOrderId: true,
          retryCount: true,
          lastRetryAt: true,
          paymentUrl: true,
          paymentUrlExpiresAt: true,
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
        actualStatus = 'not_found';
      } else {
        console.log(`✅ [CATERING] Successfully fetched catering order with ${orderData.items.length} items`);
        console.log(`🔧 [CATERING] Order payment status: ${orderData.paymentStatus}, order status: ${orderData.status}`);
        
        // Trust database state over URL parameters
        if (orderData.paymentStatus === 'PAID') {
          actualStatus = 'success';
          console.log(`🔧 [CATERING] Determined status as 'success' based on database payment status: ${orderData.paymentStatus}`);
        } else if (orderData.paymentStatus === 'FAILED' || orderData.status === 'CANCELLED') {
          actualStatus = 'failed';
          console.log(`🔧 [CATERING] Determined status as 'failed' based on database payment status: ${orderData.paymentStatus}, order status: ${orderData.status}`);
        } else if (orderData.paymentStatus === 'PENDING') {
          // Check if order was recently created (within 5 minutes)
          const orderAge = Date.now() - new Date(orderData.createdAt).getTime();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (orderAge < fiveMinutes) {
            // Recent order, might still be processing
            actualStatus = 'processing';
            console.log(`🔧 [CATERING] Determined status as 'processing' - order is ${Math.round(orderAge / 1000)} seconds old`);
          } else {
            actualStatus = 'pending';
            console.log(`🔧 [CATERING] Determined status as 'pending' - order is ${Math.round(orderAge / (1000 * 60))} minutes old`);
          }
        } else {
          // Handle unexpected payment status
          console.log(`🔧 [CATERING] Unexpected payment status: ${orderData.paymentStatus}, defaulting to processing`);
          actualStatus = 'processing';
        }

        // Convert Decimal fields to numbers for serialization
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
        actualStatus = 'error';
        // Keep orderData as null, the client component can show an error message
      }
    }
  } else if (urlStatus) {
    console.warn('🔧 [CATERING] Status provided but no orderId for catering confirmation');
    actualStatus = 'invalid';
  }

  console.log(`🔧 [CATERING] Final status: ${actualStatus}, Order data: ${serializableOrderData ? 'Available' : 'Not available'}`);
  console.log(`🔧 [CATERING] Passing to component - Status: ${actualStatus}, OrderId: ${orderId}`);

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
        status={actualStatus} 
        orderData={serializableOrderData} 
        squareOrderId={squareOrderId}
      />
    </Suspense>
  );
}