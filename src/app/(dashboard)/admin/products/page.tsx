// src/app/admin/products/page.tsx

import { prisma } from '@/lib/db';
import Image from 'next/image';
import Link from 'next/link';
import { Decimal } from '@prisma/client/runtime/library';
import { redirect } from 'next/navigation';
import ProductsClientWrapper from './client-wrapper';
import CategorySelect from './components/CategorySelect';
import ProductFilters from './components/ProductFilters';
import Pagination from '@/components/ui/pagination';

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
  price: number | string | Decimal;
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
    price: number | string | Decimal | null;
    squareVariantId: string | null;
  }>;
  // Add availability fields for admin badges
  isAvailable?: boolean;
  isPreorder?: boolean;
  visibility?: string;
  itemState?: string;
  preorderStartDate?: Date | null;
  preorderEndDate?: Date | null;
  availabilityStart?: Date | null;
  availabilityEnd?: Date | null;
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

  // Transform the products to match our expected type
  const products = productsFromDb.map((product: any) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description,
    images: product.images,
    category: {
      id: product.category?.id || '',
      name: product.category?.name || 'Uncategorized',
    },
    featured: product.featured,
    active: product.active,
    variants: product.variants || [],
    // Add availability fields for admin badges
    isAvailable: product.isAvailable,
    isPreorder: product.isPreorder,
    visibility: product.visibility,
    itemState: product.itemState,
    preorderStartDate: product.preorderStartDate,
    preorderEndDate: product.preorderEndDate,
    availabilityStart: product.availabilityStart,
    availabilityEnd: product.availabilityEnd,
  }));

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
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Products</h1>
        </div>

        <div className="mb-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
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
        </div>

        {/* Filters Section */}
        <ProductFilters
          categories={categories}
          currentSearch={searchQuery}
          currentCategory={categoryFilter}
          currentStatus={statusFilter}
          currentFeatured={featuredFilter}
        />

        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="hidden sm:table-cell w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden sm:table-cell w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured
                  </th>
                  <th className="hidden lg:table-cell w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variants
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.length > 0 ? (
                  products.map((product: ProductWithCategory) => (
                    <tr key={product.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {product.images && product.images.length > 0 && product.images[0] ? (
                          <div className="h-12 w-12 relative">
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-500">No image</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 break-words max-w-[150px] capitalize">
                        {product.name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {/* Availability Status Badge */}
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
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CategorySelect
                          categories={categories}
                          productId={product.id}
                          currentCategoryId={product.category.id}
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap font-medium">
                        ${Number(product.price).toFixed(2)}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {product.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-500 font-medium">
                        {product.featured ? 'Yes' : 'No'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-4 text-sm text-gray-500">
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
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-xs bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No products found. Try adjusting your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={params || {}}
          />
        )}
      </div>
    </ProductsClientWrapper>
  );
}
