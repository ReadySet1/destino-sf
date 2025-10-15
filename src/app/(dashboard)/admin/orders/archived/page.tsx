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
import {
  ResponsivePageHeader,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from '@/components/ui/responsive-page-header';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

// Define the shape of the resolved params
type ResolvedParams = {
  [key: string]: string | string[] | undefined;
};

// Define page props type
type ArchivedOrderPageProps = {
  params: Promise<ResolvedParams>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    reason?: string;
    archivedBy?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

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

    logger.info(
      `Found ${orders.length} archived orders for display (page ${currentPage}/${totalPages})`
    );

    return (
      <div className="space-y-6 md:space-y-8">
        <ResponsivePageHeader
          title="Archived Orders"
          subtitle="View and manage archived customer orders"
          breadcrumbs={
            <>
              <BreadcrumbItem href="/admin">Dashboard</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem href="/admin/orders">Orders</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem isCurrent>Archived</BreadcrumbItem>
            </>
          }
          actions={
            <>
              <Link
                href="/admin/orders"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-center transition-colors duration-200"
              >
                Back to Orders
              </Link>
            </>
          }
        />

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
      <div className="space-y-6 md:space-y-8">
        <ResponsivePageHeader
          title="Archived Orders"
          breadcrumbs={
            <>
              <BreadcrumbItem href="/admin">Dashboard</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem href="/admin/orders">Orders</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem isCurrent>Archived</BreadcrumbItem>
            </>
          }
        />
        <ErrorDisplay
          title="Failed to Load Archived Orders"
          message="There was an error loading the archived orders. Please try again later."
          returnLink={{ href: '/admin/orders', label: 'Return to orders' }}
        />
      </div>
    );
  }
}
