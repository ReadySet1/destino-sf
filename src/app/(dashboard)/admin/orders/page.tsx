import { Suspense } from 'react';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import OrdersLoader from './components/OrdersLoader';
import OrderFilters from './components/OrderFilters';

// Force dynamic rendering to prevent build-time database queries
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Define page props type
type OrderPageProps = {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    status?: string;
    payment?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }>;
};

export default async function OrdersPage({ params, searchParams }: OrderPageProps) {
  // We need to await these even though we're not using them directly
  await params;
  const searchParamsResolved = await searchParams;

  // Extract search params for fallback display
  const searchQuery = (searchParamsResolved?.search || '').trim();
  const typeFilter = searchParamsResolved?.type || 'all';
  const statusFilter = searchParamsResolved?.status || 'all';
  const paymentFilter = searchParamsResolved?.payment || 'all';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Order Management"
        description="Manage and track customer orders"
        backUrl="/admin"
        backLabel="Back to Dashboard"
      />

      {/* Action Buttons */}
      <FormActions>
        <FormButton variant="secondary" href="/admin/orders/archived" leftIcon={FormIcons.archive}>
          View Archived Orders
        </FormButton>
        <FormButton href="/admin/orders/manual" leftIcon={FormIcons.plus}>
          Add Manual Order
        </FormButton>
      </FormActions>

      {/* Orders Content with Suspense */}
      <Suspense
        fallback={
          <div className="space-y-10 mt-8">
            {/* Show filters while loading */}
            <OrderFilters
              currentSearch={searchQuery}
              currentType={typeFilter}
              currentStatus={statusFilter}
              currentPayment={paymentFilter}
            />

            {/* Loading state */}
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading orders...</p>
            </div>
          </div>
        }
      >
        <OrdersLoader />
      </Suspense>
    </div>
  );
}
