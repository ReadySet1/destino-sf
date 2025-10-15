// src/app/admin/products/page.tsx

import { prisma } from '@/lib/db';
import Image from 'next/image';
import Link from 'next/link';

import { redirect } from 'next/navigation';
import ProductsClientWrapper from './client-wrapper';
import CategorySelect from './components/CategorySelect';
import ProductFilters from './components/ProductFilters';
import Pagination from '@/components/ui/pagination';
import { ArchiveFilter } from './components/ArchiveFilter';

import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';

// Import availability system
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityEngine } from '@/lib/availability/engine';
import { AvailabilityState } from '@/types/availability';
import { ProductsTable } from '@/components/admin/products/ProductsTable';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable static generation

export const metadata = {
  title: 'Product Management',
  description: 'Manage your products',
  tags: ['products'],
};

type ProductWithCategory = {
  id: string;
  name: string;
  price: number; // Always a number after serialization
  description: string | null;
  images: string[];
  category: {
    id: string;
    name: string;
  };
  featured: boolean;
  active: boolean;
  variants: Array<{
    id: string;
    name: string;
    price: number | null; // Always a number or null after serialization
    squareVariantId: string | null;
  }>;
  // Legacy availability fields (kept for compatibility)
  isAvailable?: boolean;
  isPreorder?: boolean;
  visibility?: string;
  itemState?: string;
  preorderStartDate?: Date | null;
  preorderEndDate?: Date | null;
  availabilityStart?: Date | null;
  availabilityEnd?: Date | null;

  // New availability evaluation result
  evaluatedAvailability?: {
    currentState: AvailabilityState;
    appliedRulesCount: number;
    nextStateChange?: {
      date: Date;
      newState: AvailabilityState;
    };
  };
};

type ProductPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    status?: string;
    featured?: string;
    visibility?: string;
    availability?: string;
    archived?: string;
    _debugInfo?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductPageProps) {
  // Await the searchParams promise
  const params = await searchParams;

  // Parse search params
  const currentPage = Number(params?.page || 1);
  const searchQuery = params?.search || '';
  const categoryFilter = params?.category || '';
  const statusFilter = params?.status || '';
  const featuredFilter = params?.featured || '';
  const visibilityFilter = params?.visibility || '';
  const availabilityFilter = params?.availability || '';
  const archivedFilter = params?.archived || 'all';

  const itemsPerPage = 10;
  const skip = (currentPage - 1) * itemsPerPage;

  // Build the where clause for filtering
  const where: any = {};

  // Archive filter logic
  if (archivedFilter === 'active') {
    where.active = true;
    where.isArchived = false;
  } else if (archivedFilter === 'archived') {
    where.isArchived = true;
  }
  // If 'all', no filter applied

  if (searchQuery) {
    where.name = {
      contains: searchQuery,
      mode: 'insensitive',
    };
  }

  if (categoryFilter && categoryFilter !== 'all') {
    where.categoryId = categoryFilter;
  }

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'active') {
      where.active = true;
    } else if (statusFilter === 'inactive') {
      where.active = false;
    }
  }

  if (featuredFilter && featuredFilter !== 'all') {
    if (featuredFilter === 'featured') {
      where.featured = true;
    } else if (featuredFilter === 'notFeatured') {
      where.featured = false;
    }
  }

  if (visibilityFilter && visibilityFilter !== 'all') {
    where.visibility = visibilityFilter;
  }

  if (availabilityFilter && availabilityFilter !== 'all') {
    switch (availabilityFilter) {
      case 'available':
        where.isAvailable = true;
        where.visibility = { not: 'PRIVATE' };
        break;
      case 'unavailable':
        where.OR = [{ isAvailable: false }, { visibility: 'PRIVATE' }];
        break;
      case 'preorder':
        where.isPreorder = true;
        break;
      case 'view_only':
        where.itemState = 'SEASONAL';
        break;
      case 'hidden':
        where.visibility = 'PRIVATE';
        break;
    }
  }

  // Fetch products with their categories and variants
  const productsFromDb = await prisma.product.findMany({
    where,
    orderBy: {
      name: 'asc',
    },
    include: {
      category: true,
      variants: {
        orderBy: {
          price: 'asc',
        },
      },
    },
    skip,
    take: itemsPerPage,
  });

  // Get total count for pagination
  const totalCount = await prisma.product.count({ where });
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Get archived count for badge
  const archivedCount = await prisma.product.count({
    where: { isArchived: true },
  });

  // Fetch all categories for the dropdown and filters
  const categories = await prisma.category.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Helper function to convert Decimal to number safely
  const decimalToNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;

    // If it's already a number
    if (typeof value === 'number') return isNaN(value) ? 0 : value;

    // If it's a Decimal object
    if (typeof value === 'object' && value !== null) {
      try {
        if (typeof value.toNumber === 'function') {
          return value.toNumber();
        }
        if (typeof value.valueOf === 'function') {
          const val = value.valueOf();
          if (typeof val === 'number') return val;
        }
        // Last resort: convert to string and parse
        return parseFloat(String(value)) || 0;
      } catch (e) {
        console.error('Error converting value to number:', e);
        return 0;
      }
    }

    // If it's a string that can be parsed as a number
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  };

  // Fetch availability rules for all products and evaluate them
  const productIds = productsFromDb.map((product: any) => product.id);
  const availabilityRules = await AvailabilityQueries.getMultipleProductRules(productIds);
  const availabilityEvaluations =
    await AvailabilityEngine.evaluateMultipleProducts(availabilityRules);

  // Transform the products to match our expected type
  const products = productsFromDb.map((product: any) => {
    const evaluation = availabilityEvaluations.get(product.id);

    return {
      id: product.id,
      name: product.name,
      price: decimalToNumber(product.price), // Convert Decimal to number
      description: product.description,
      images: product.images,
      category: {
        id: product.category?.id || '',
        name: product.category?.name || 'Uncategorized',
      },
      featured: product.featured,
      active: product.active,
      squareId: product.squareId,
      variants: (product.variants || []).map((variant: any) => ({
        id: variant.id,
        name: variant.name,
        price: variant.price ? decimalToNumber(variant.price) : null, // Convert Decimal to number
        squareVariantId: variant.squareVariantId,
      })),
      // Archive fields
      isArchived: product.isArchived || false,
      archivedAt: product.archivedAt,
      archivedReason: product.archivedReason,
      // Legacy availability fields (kept for compatibility)
      isAvailable: product.isAvailable,
      isPreorder: product.isPreorder,
      visibility: product.visibility,
      itemState: product.itemState,
      preorderStartDate: product.preorderStartDate,
      preorderEndDate: product.preorderEndDate,
      availabilityStart: product.availabilityStart,
      availabilityEnd: product.availabilityEnd,

      // New availability evaluation result
      evaluatedAvailability: evaluation
        ? {
            currentState: evaluation.currentState,
            appliedRulesCount: evaluation.appliedRules.length,
            nextStateChange: evaluation.nextStateChange,
          }
        : undefined,
    };
  });

  async function deleteProduct(formData: FormData) {
    'use server';

    const id = formData.get('id') as string;
    const productName = formData.get('productName') as string;

    if (!id) {
      return;
    }

    try {
      // Find the product first to get its details
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new Error(`Product not found.`);
      }

      // Delete from database
      await prisma.product.delete({
        where: { id },
      });

      console.log(`Product "${product.name}" deleted successfully from database`);

      // Redirect with success status
      return redirect(
        `/admin/products?status=success&action=delete&productName=${encodeURIComponent(product.name)}`
      );
    } catch (error) {
      // Don't log redirect "errors" as they're normal
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error
        throw error;
      }

      console.error('Error deleting product:', error);

      // Redirect with error status
      let errorMessage = 'Failed to delete product. An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return redirect(`/admin/products?status=error&message=${encodeURIComponent(errorMessage)}`);
    }
  }

  async function editProduct(formData: FormData) {
    'use server';

    const id = formData.get('id') as string;

    if (!id) {
      return;
    }

    try {
      // Redirect to the edit page for this product
      return redirect(`/admin/products/${id}`);
    } catch (error) {
      // Don't log redirect "errors" as they're normal
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error
        throw error;
      }

      console.error('Error navigating to edit product:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to navigate to edit product. An unexpected error occurred.');
      }
    }
  }

  return (
    <ProductsClientWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FormHeader
          title="Product Management"
          description="Manage your product catalog and settings"
          backUrl="/admin"
          backLabel="Back to Dashboard"
        />

        <div className="space-y-8 mt-8">
          {/* Action Buttons */}
          <FormActions>
            <FormButton variant="secondary" href="/admin/square-sync" leftIcon={FormIcons.refresh}>
              Sync from Square
            </FormButton>

            {archivedCount > 0 && (
              <FormButton
                variant="secondary"
                href="/admin/products/archived"
                leftIcon={FormIcons.archive}
              >
                View Archived ({archivedCount})
              </FormButton>
            )}
          </FormActions>

          {/* Warning Notice */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  Products can only be edited in Square Dashboard. Use the &quot;Sync Products &amp;
                  Images from Square&quot; button to update your products.
                </p>
              </div>
            </div>
          </div>

          {/* Archive Filter */}
          <ArchiveFilter currentFilter={archivedFilter} />

          {/* Filters Section */}
          <ProductFilters
            categories={categories}
            currentSearch={searchQuery}
            currentCategory={categoryFilter}
            currentStatus={statusFilter}
            currentFeatured={featuredFilter}
            currentVisibility={visibilityFilter}
            currentAvailability={availabilityFilter}
          />

          {/* Products Table */}
          <ProductsTable products={products} categories={categories} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                searchParams={params || {}}
              />
            </div>
          )}
        </div>
      </div>
    </ProductsClientWrapper>
  );
}
