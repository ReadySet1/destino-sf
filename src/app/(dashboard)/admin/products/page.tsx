// src/app/admin/products/page.tsx

import { prisma } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { Decimal } from '@prisma/client/runtime/library';
import { redirect } from 'next/navigation';
import ProductsClientWrapper from './client-wrapper';
import { SyncSquareButton } from './sync-square';
import { updateProductCategory } from './actions';
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

  // Fetch products with their categories
  const productsFromDb = await prisma.product.findMany({
    where,
    orderBy: {
      name: 'asc',
    },
    include: {
      category: true,
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
  const products = productsFromDb.map((product: ProductWithCategory) => ({
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
          <div className="flex gap-4">
            <SyncSquareButton />
            <Link
              href="/admin/categories"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-center w-full md:w-1/2 break-words whitespace-nowrap font-medium"
            >
              Manage Categories
            </Link>
            <a
              href="https://squareup.com/dashboard/items/library"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-center w-full md:w-1/2 break-words whitespace-nowrap font-medium"
            >
              Edit in Square
            </a>
          </div>
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
