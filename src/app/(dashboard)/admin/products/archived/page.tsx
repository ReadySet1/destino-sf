// src/app/(dashboard)/admin/products/archived/page.tsx

import { prisma } from '@/lib/db-unified';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { ArchiveStatsDashboard } from '../components/ArchiveStatsDashboard';
import { ProductCard } from '../components/ProductCard';
import Pagination from '@/components/ui/pagination';
import { Archive } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Archived Products',
  description: 'Manage archived products',
};

type ArchivedProductsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    reason?: string;
  }>;
};

export default async function ArchivedProductsPage({ searchParams }: ArchivedProductsPageProps) {
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page || 1));
  const searchQuery = (params?.search || '').trim();
  const reasonFilter = params?.reason || 'all';
  const itemsPerPage = 20;

  // Build where clause
  const where: any = {
    isArchived: true,
  };

  if (searchQuery) {
    where.name = {
      contains: searchQuery,
      mode: 'insensitive'
    };
  }

  if (reasonFilter !== 'all') {
    where.archivedReason = reasonFilter;
  }

  // Fetch archived products
  const productsFromDb = await prisma.product.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      archivedAt: 'desc'
    },
    skip: (currentPage - 1) * itemsPerPage,
    take: itemsPerPage,
  });

  // Helper function to convert Decimal to number safely
  const decimalToNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'object' && value !== null) {
      try {
        if (typeof value.toNumber === 'function') {
          return value.toNumber();
        }
        if (typeof value.valueOf === 'function') {
          const val = value.valueOf();
          if (typeof val === 'number') return val;
        }
        return parseFloat(String(value)) || 0;
      } catch (e) {
        console.error('Error converting value to number:', e);
        return 0;
      }
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Transform products to handle Decimal conversion
  const products = productsFromDb.map((product: any) => ({
    ...product,
    price: product.price ? decimalToNumber(product.price) : null,
  }));

  const totalCount = await prisma.product.count({ where });
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Archived Products"
        description="View and restore archived products"
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      <div className="space-y-8 mt-8">
        {/* Statistics Dashboard */}
        <ArchiveStatsDashboard />

        {/* Actions */}
        <FormActions>
          <FormButton
            variant="secondary"
            href="/admin/products"
            leftIcon={FormIcons.package}
          >
            View Active Products
          </FormButton>
        </FormActions>

        {/* Products List */}
        {products.length === 0 ? (
          <EmptyArchivedState hasFilters={!!searchQuery || reasonFilter !== 'all'} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showArchiveButton={true}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                searchParams={params}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyArchivedState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col items-center">
        <Archive className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-base font-medium text-gray-900 mb-1">
          {hasFilters ? 'No archived products match your filters' : 'No archived products'}
        </p>
        <p className="text-sm text-gray-500">
          {hasFilters ? 'Try adjusting your search criteria' : 'Archived products will appear here'}
        </p>
      </div>
    </div>
  );
}
