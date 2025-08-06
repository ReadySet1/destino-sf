import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ProductReorderPanel } from '@/components/Products/ProductReorderPanel';
import { getProductsByCategory } from '../actions';

// Target categories for product reordering
const TARGET_CATEGORIES = [
  { id: '3f4447b4-bc1c-4f1e-9bd0-7fbc41907777', name: 'ALFAJORES', slug: 'alfajores' },
  { id: 'db6522ac-f833-4d0f-bcd7-eef5d8cdab43', name: 'EMPANADAS', slug: 'empanadas' },
];

async function ReorderContent() {
  try {
    const categoriesWithProducts = await Promise.all(
      TARGET_CATEGORIES.map(async (category) => {
        const products = await getProductsByCategory(category.id);
        return {
          ...category,
          products
        };
      })
    );

    return (
      <div className="space-y-8">
        {categoriesWithProducts.map((category) => (
          <div key={category.id} className="bg-gray-50 p-6 rounded-lg">
            <ProductReorderPanel
              products={category.products}
              categoryId={category.id}
              categoryName={category.name}
            />
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error loading products for reordering:', error);
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-medium">Error Loading Products</h3>
        <p className="text-red-600 mt-2">
          Failed to load products for reordering. Please try again later.
        </p>
      </div>
    );
  }
}

function LoadingContent() {
  return (
    <div className="space-y-8">
      {TARGET_CATEGORIES.map((category) => (
        <div key={category.id} className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{category.name} Products</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-15 h-15 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductReorderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Reorder Products</h1>
        <p className="text-gray-600">
          Drag and drop products to change their display order on the menu pages. 
          Changes are saved automatically and will be reflected on the public menu immediately.
        </p>
      </div>

      <Suspense fallback={<LoadingContent />}>
        <ReorderContent />
      </Suspense>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-blue-800 font-medium mb-2">How to Use</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Click and drag the handle (☰) to reorder products</li>
          <li>• Products are organized by category (Alfajores and Empanadas)</li>
          <li>• Changes are saved automatically when you drop an item</li>
          <li>• The new order will appear on the public menu immediately</li>
        </ul>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Reorder Products - Admin',
  description: 'Manage product display order for menu items',
};