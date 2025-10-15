import { Suspense } from 'react';
import CateringConfirmationLoader from './CateringConfirmationLoader';

type CateringConfirmationPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CateringConfirmationPage({
  searchParams,
}: CateringConfirmationPageProps) {
  const params = await searchParams;
  const urlStatus = typeof params.status === 'string' ? params.status : '';
  let orderId = typeof params.orderId === 'string' ? params.orderId : null;
  const squareOrderId = typeof params.squareOrderId === 'string' ? params.squareOrderId : null;

  // URL decode the orderId in case it was encoded
  if (orderId) {
    try {
      orderId = decodeURIComponent(orderId);
    } catch (error) {
      console.warn(`Failed to decode catering orderId: ${orderId}`, error);
    }
  }

  return (
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
            <div className="mb-8 text-center">
              <div className="mb-4 text-5xl">🔄</div>
              <h1 className="mb-4 text-2xl font-bold">Loading Catering Order Details...</h1>
              <p className="text-gray-600">
                Please wait while we retrieve your catering order information.
              </p>
            </div>
          </div>
        </main>
      }
    >
      <CateringConfirmationLoader
        urlStatus={urlStatus}
        orderId={orderId}
        squareOrderId={squareOrderId}
      />
    </Suspense>
  );
}
