import { prisma } from '@/lib/db';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { formatDateTime, formatCurrency } from '@/utils/formatting';
import { logger } from '@/utils/logger';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { Decimal } from '@prisma/client/runtime/library';
import Pagination from '@/components/ui/pagination';
import { getArchivedOrders } from '@/app/actions/orders';
import ArchivedOrdersTable from './components/ArchivedOrdersTable';
import ArchivedOrdersFilters from './components/ArchivedOrdersFilters';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

interface ArchivedOrderPageProps {
  params: Promise<{}>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    reason?: string;
    archivedBy?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ArchivedOrdersPage({ params, searchParams }: ArchivedOrderPageProps) {
  await params; // We're not using the params, but we need to await the promise
  
  // Await the searchParams promise
  const searchParamsResolved = await searchParams;
  
  // Parse search params
  const currentPage = Number(searchParamsResolved?.page || 1);
  const searchQuery = searchParamsResolved?.search || '';
  const typeFilter = searchParamsResolved?.type || 'all';
  const reasonFilter = searchParamsResolved?.reason || '';
  const archivedByFilter = searchParamsResolved?.archivedBy || '';
  const startDate = searchParamsResolved?.startDate || '';
  const endDate = searchParamsResolved?.endDate || '';

  try {
    // Fetch archived orders using the server action
    const result = await getArchivedOrders({
      page: currentPage,
      search: searchQuery,
      type: typeFilter as 'all' | 'regular' | 'catering',
      reason: reasonFilter,
      archivedBy: archivedByFilter,
      startDate,
      endDate,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch archived orders');
    }

    const { orders, totalCount, totalPages } = result;
    
    logger.info(`Found ${orders.length} archived orders for display (page ${currentPage}/${totalPages})`);

    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Archived Orders</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/orders"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Back to Orders
            </Link>
          </div>
        </div>

        {/* Filters Section */}
        <ArchivedOrdersFilters 
          currentSearch={searchQuery}
          currentType={typeFilter}
          currentReason={reasonFilter}
          currentArchivedBy={archivedByFilter}
          currentStartDate={startDate}
          currentEndDate={endDate}
        />

        {orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No archived orders found{searchQuery && ` matching "${searchQuery}"`}.
          </div>
        ) : (
          <>
            <ArchivedOrdersTable orders={orders} />

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                searchParams={searchParamsResolved || {}} 
              />
            )}
          </>
        )}
      </div>
    );
  } catch (error) {
    logger.error('Error fetching archived orders:', error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Archived Orders</h1>
        <ErrorDisplay 
          title="Failed to Load Archived Orders"
          message="There was an error loading the archived orders. Please try again later."
          returnLink={{ href: "/admin/orders", label: "Return to orders" }}
        />
      </div>
    );
  }
} 