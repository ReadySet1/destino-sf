'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OrderStatus, CateringStatus, PaymentStatus } from '@prisma/client';
import { logger } from '@/utils/logger';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import OrderFilters from './OrderFilters';
import OrdersTableWrapper from './OrdersTableWrapper';
import Pagination from '@/components/ui/pagination';

// Unified order type matching the API and table wrapper
interface UnifiedOrder {
  id: string;
  type: 'regular' | 'catering';
  customerName: string;
  email: string;
  phone: string;
  status: OrderStatus | CateringStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
  pickupTime: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  eventDate?: string | null;
  trackingNumber: string | null;
  fulfillmentType?: string;
  isArchived: boolean;
  itemCount: number;
  paymentMethod: string | null;
  shippingCarrier: string | null;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface OrdersData {
  orders: UnifiedOrder[];
  pagination: PaginationInfo;
}

export default function OrdersLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse search params
  const currentPage = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const searchQuery = (searchParams.get('search') || '').trim();
  const typeFilter = searchParams.get('type') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const paymentFilter = searchParams.get('payment') || 'all';
  const sortField = searchParams.get('sort') || 'createdAt';
  const sortDirection = (searchParams.get('direction') === 'asc' ? 'asc' : 'desc') as
    | 'asc'
    | 'desc';

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);

        logger.info('[ORDERS-LOADER] Fetching orders', {
          currentPage,
          searchQuery,
          typeFilter,
          statusFilter,
          paymentFilter,
          sortField,
          sortDirection,
        });

        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.set('page', currentPage.toString());
        if (searchQuery) queryParams.set('search', searchQuery);
        if (typeFilter !== 'all') queryParams.set('type', typeFilter);
        if (statusFilter !== 'all') queryParams.set('status', statusFilter);
        if (paymentFilter !== 'all') queryParams.set('payment', paymentFilter);
        if (sortField !== 'createdAt') queryParams.set('sort', sortField);
        if (sortDirection !== 'desc') queryParams.set('direction', sortDirection);

        // Create abort controller with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 25000); // 25 second timeout for admin page

        const response = await fetch(`/api/admin/orders/list?${queryParams.toString()}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

          if (response.status === 504 || errorData.code === 'TIMEOUT') {
            setError('Request timed out. The server is experiencing high load. Please try again.');
          } else {
            setError(errorData.error || 'Failed to load orders');
          }
          return;
        }

        const ordersData = await response.json();
        setData(ordersData);

        logger.info(`[ORDERS-LOADER] Successfully loaded ${ordersData.orders.length} orders`);
      } catch (fetchError) {
        logger.error('[ORDERS-LOADER] Error fetching orders:', fetchError);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Failed to load orders. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [currentPage, searchQuery, typeFilter, statusFilter, paymentFilter, sortField, sortDirection]);

  // Convert search params object for filters and pagination
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-10 mt-8">
        {/* Filters Section (show without data) */}
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
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <div className="space-y-10 mt-8">
        {/* Filters Section (show without data) */}
        <OrderFilters
          currentSearch={searchQuery}
          currentType={typeFilter}
          currentStatus={statusFilter}
          currentPayment={paymentFilter}
        />

        {/* Error state */}
        <div className="text-center py-20">
          <div className="mb-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Orders</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show data
  if (!data) {
    return (
      <div className="space-y-10 mt-8">
        <OrderFilters
          currentSearch={searchQuery}
          currentType={typeFilter}
          currentStatus={statusFilter}
          currentPayment={paymentFilter}
        />
        <div className="text-center py-10 text-gray-500">No data available.</div>
      </div>
    );
  }

  const { orders, pagination } = data;

  return (
    <div className="space-y-10 mt-8">
      {/* Filters Section */}
      <OrderFilters
        currentSearch={searchQuery}
        currentType={typeFilter}
        currentStatus={statusFilter}
        currentPayment={paymentFilter}
      />

      {orders.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No orders found{searchQuery && ` matching "${searchQuery}"`}.
        </div>
      ) : (
        <>
          {/* Orders Table */}
          <OrdersTableWrapper orders={orders} sortKey={sortField} sortDirection={sortDirection} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                searchParams={searchParamsObj}
              />
            </div>
          )}

          {/* Order count info */}
          <div className="text-center text-sm text-gray-500">
            Showing {orders.length} of {pagination.totalCount} orders
          </div>
        </>
      )}
    </div>
  );
}
