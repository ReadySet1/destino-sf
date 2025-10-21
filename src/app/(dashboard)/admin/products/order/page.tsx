import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { getCategoriesWithProductCounts } from '@/lib/products/display-order';
import { ProductOrderManager } from './components/ProductOrderManager';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormIcons } from '@/components/ui/form/FormIcons';

async function getInitialData() {
  const categories = await getCategoriesWithProductCounts();

  // Get first category with products for initial load
  const defaultCategory = categories.find(cat => cat.productCount > 0);

  return {
    categories,
    defaultCategoryId: defaultCategory?.id || null,
  };
}

export default async function ProductOrderPage() {
  const { categories, defaultCategoryId } = await getInitialData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Product Display Order"
        description="Manage the order in which products appear on your website. Changes are saved automatically and will be visible to customers immediately."
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      <div className="mt-8 space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 text-blue-400">{FormIcons.info}</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">How to use:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Select a category to view and reorder its products</li>
                <li>• Drag and drop products to change their display order</li>
                <li>• Use quick sort options for automatic ordering</li>
                <li>• Changes are saved automatically when you move items</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <Suspense fallback={<ProductOrderManagerSkeleton />}>
          <ProductOrderManager categories={categories} defaultCategoryId={defaultCategoryId} />
        </Suspense>
      </div>
    </div>
  );
}

function ProductOrderManagerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Category Selector Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded w-64 animate-pulse" />
      </div>

      {/* Quick Sort Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-28 mb-4 animate-pulse" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-200 rounded w-24 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Products List Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
