// app/(store)/order-confirmation/page.tsx
import { Suspense } from 'react';
import OrderConfirmationContent from './OrderConfirmationContent';

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-lg rounded-lg border bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">🔄</div>
            <h1 className="mb-4 text-2xl font-bold">Loading Order Details...</h1>
            <p className="text-gray-600">Please wait while we retrieve your order information.</p>
          </div>
        </div>
      </main>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}