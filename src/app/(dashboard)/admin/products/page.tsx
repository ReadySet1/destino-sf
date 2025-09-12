// src/app/admin/products/page.tsx

import { prisma } from '@/lib/db';
import Image from 'next/image';
import Link from 'next/link';

import { redirect } from 'next/navigation';
import ProductsClientWrapper from './client-wrapper';
import CategorySelect from './components/CategorySelect';
import ProductFilters from './components/ProductFilters';
import Pagination from '@/components/ui/pagination';

import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';

// Import availability system
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityEngine } from '@/lib/availability/engine';
import { AvailabilityState } from '@/types/availability';

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

  const itemsPerPage = 10;
  const skip = (currentPage - 1) * itemsPerPage;

  // Build the where clause for filtering
  const where: any = {};

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
          price: 'asc'
        }
      },
    },
    skip,
    take: itemsPerPage,
  });

  // Get total count for pagination
  const totalCount = await prisma.product.count({ where });
  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
  const availabilityEvaluations = await AvailabilityEngine.evaluateMultipleProducts(availabilityRules);

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
      variants: (product.variants || []).map((variant: any) => ({
        id: variant.id,
        name: variant.name,
        price: variant.price ? decimalToNumber(variant.price) : null, // Convert Decimal to number
        squareVariantId: variant.squareVariantId,
      })),
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
      evaluatedAvailability: evaluation ? {
        currentState: evaluation.currentState,
        appliedRulesCount: evaluation.appliedRules.length,
        nextStateChange: evaluation.nextStateChange,
      } : undefined,
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
            <FormButton
              variant="secondary"
              href="/admin/square-sync"
              leftIcon={FormIcons.refresh}
            >
              Sync from Square
            </FormButton>
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

          {/* Filters Section */}
          <ProductFilters
            categories={categories}
            currentSearch={searchQuery}
            currentCategory={categoryFilter}
            currentStatus={statusFilter}
            currentFeatured={featuredFilter}
          />

          {/* Products Table */}
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-20 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="w-1/4 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="w-36 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="w-40 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="w-24 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="hidden sm:table-cell w-24 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Featured
                    </th>
                    <th className="hidden lg:table-cell w-32 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Variants
                    </th>
                    <th className="w-24 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length > 0 ? (
                    products.map((product: ProductWithCategory) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.images && product.images.length > 0 && product.images[0] ? (
                            <div className="h-12 w-12 relative">
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-gray-500">No image</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words max-w-[150px] capitalize">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1 pointer-events-none">
                            {/* New Availability System - Use evaluated availability if available */}
                            {product.evaluatedAvailability ? (
                              <>
                                {/* Primary availability badge based on evaluation */}
                                {product.evaluatedAvailability.currentState === AvailabilityState.AVAILABLE && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Available
                                  </span>
                                )}
                                {product.evaluatedAvailability.currentState === AvailabilityState.PRE_ORDER && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Pre-order
                                  </span>
                                )}
                                {product.evaluatedAvailability.currentState === AvailabilityState.VIEW_ONLY && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    View Only
                                  </span>
                                )}
                                {product.evaluatedAvailability.currentState === AvailabilityState.HIDDEN && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    Hidden
                                  </span>
                                )}
                                {product.evaluatedAvailability.currentState === AvailabilityState.COMING_SOON && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Coming Soon
                                  </span>
                                )}
                                {product.evaluatedAvailability.currentState === AvailabilityState.SOLD_OUT && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    Sold Out
                                  </span>
                                )}
                                {product.evaluatedAvailability.currentState === AvailabilityState.RESTRICTED && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                    Restricted
                                  </span>
                                )}
                                
                                {/* Show rules count if any rules are applied */}
                                {product.evaluatedAvailability.appliedRulesCount > 0 && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                    {product.evaluatedAvailability.appliedRulesCount} rule{product.evaluatedAvailability.appliedRulesCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {/* Legacy Availability System - Fallback when no evaluation available */}
                                {product.isAvailable === false && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    Unavailable
                                  </span>
                                )}
                                
                                {/* Pre-order Badge */}
                                {product.isPreorder && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Pre-order
                                  </span>
                                )}
                                
                                {/* Visibility Badge */}
                                {product.visibility === 'PRIVATE' && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    Hidden
                                  </span>
                                )}
                                
                                {/* Seasonal Badge */}
                                {product.itemState === 'SEASONAL' && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Seasonal
                                  </span>
                                )}
                                
                                {/* Show "Available" only if no other status badges */}
                                {product.isAvailable !== false && !product.isPreorder && product.visibility !== 'PRIVATE' && product.itemState !== 'SEASONAL' && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Available
                                  </span>
                                )}
                                
                                {/* Legacy system indicator */}
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                  Legacy
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CategorySelect
                            categories={categories}
                            productId={product.id}
                            currentCategoryId={product.category.id}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap font-medium">
                          ${Number(product.price).toFixed(2)}
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-900 font-medium">
                          {product.featured ? 'Yes' : 'No'}
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-500">
                          {product.variants && product.variants.length > 0 ? (
                            <div className="space-y-1">
                              {product.variants.slice(0, 2).map((variant, index) => (
                                <div key={variant.id} className="text-xs">
                                  <span className="font-medium">{variant.name}</span>
                                  {variant.price && (
                                    <span className="text-gray-400 ml-1">
                                      (${Number(variant.price).toFixed(2)})
                                    </span>
                                  )}
                                </div>
                              ))}
                              {product.variants.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{product.variants.length - 2} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No variants</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="text-indigo-600 hover:text-indigo-900 text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors duration-150 font-medium"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-base font-medium text-gray-900 mb-1">No products found</p>
                          <p className="text-sm text-gray-500">Try adjusting your filters or sync products from Square.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
