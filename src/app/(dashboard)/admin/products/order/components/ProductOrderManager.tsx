'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ProductSortable } from '@/components/admin/ProductSortable';
import { CategorySelector } from './CategorySelector';
import { QuickSortActions } from './QuickSortActions';
import { ProductStats } from './ProductStats';
import type { CategoryOption, ProductDisplayOrder, ReorderStrategy } from '@/types/product-admin';

interface ProductOrderManagerProps {
  categories: CategoryOption[];
  defaultCategoryId: string | null;
}

export function ProductOrderManager({ categories, defaultCategoryId }: ProductOrderManagerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(defaultCategoryId);
  const [products, setProducts] = useState<ProductDisplayOrder[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDisplayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSort, setIsLoadingSort] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Filter products based on availability settings
  const filterProducts = useCallback(
    (productList: ProductDisplayOrder[]) => {
      if (showUnavailable) {
        return productList;
      }

      // Hide products that are problematic or confusing
      return productList.filter(product => {
        // Keep products that are clearly available
        if (product.active && product.isAvailable !== false && product.visibility !== 'PRIVATE') {
          return true;
        }

        // Hide products that are inactive or explicitly unavailable
        return false;
      });
    },
    [showUnavailable]
  );

  // Load products for selected category
  const loadProducts = useCallback(
    async (categoryId: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/products/by-category/${categoryId}?includeInactive=true`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        const fetchedProducts = data.products || [];
        setAllProducts(fetchedProducts);
        setProducts(filterProducts(fetchedProducts));
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
        setProducts([]);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    },
    [filterProducts]
  );

  // Load products for default category on mount
  useEffect(() => {
    if (defaultCategoryId) {
      loadProducts(defaultCategoryId);
    }
  }, [defaultCategoryId, loadProducts]);

  // Re-filter products when showUnavailable changes
  useEffect(() => {
    setProducts(filterProducts(allProducts));
  }, [showUnavailable, allProducts, filterProducts]);

  // Handle category selection
  const handleCategoryChange = useCallback(
    async (categoryId: string) => {
      setSelectedCategoryId(categoryId);
      await loadProducts(categoryId);
    },
    [loadProducts]
  );

  // Handle product reordering
  const handleReorder = useCallback(
    async (updatedProducts: ProductDisplayOrder[]) => {
      if (!selectedCategoryId) return;

      const updates = updatedProducts.map(product => ({
        id: product.id,
        ordinal: product.ordinal,
      }));

      const response = await fetch('/api/products/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates,
          categoryId: selectedCategoryId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update order');
      }

      // Update local state
      setProducts(updatedProducts);
    },
    [selectedCategoryId]
  );

  // Handle quick sort
  const handleQuickSort = useCallback(
    async (strategy: ReorderStrategy) => {
      if (!selectedCategoryId) return;

      setIsLoadingSort(true);
      try {
        const response = await fetch('/api/products/reorder', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categoryId: selectedCategoryId,
            strategy,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to apply sorting strategy');
        }

        const result = await response.json();

        // Reload products to get the new order
        await loadProducts(selectedCategoryId);

        toast.success(
          `Applied ${strategy.toLowerCase().replace('_', ' ')} sorting to ${result.updatedCount} products`
        );
      } catch (error) {
        console.error('Error applying quick sort:', error);
        toast.error('Failed to apply sorting strategy');
      } finally {
        setIsLoadingSort(false);
      }
    },
    [selectedCategoryId, loadProducts]
  );

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h2>
        <CategorySelector
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {selectedCategoryId && (
        <>
          {/* Product Stats */}
          <ProductStats category={selectedCategory} products={products} isLoading={isLoading} />

          {/* Filter Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Display Options</h3>
                <p className="text-sm text-gray-600">
                  Control which products are shown in the list
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showUnavailable"
                    checked={showUnavailable}
                    onChange={e => setShowUnavailable(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="showUnavailable"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Show unavailable products
                  </label>
                </div>
                {!showUnavailable && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Hiding {allProducts.length - products.length} products
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Sort Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Sort Options</h3>
            <QuickSortActions
              onQuickSort={handleQuickSort}
              disabled={isLoading || isLoadingSort || products.length === 0}
              isLoading={isLoadingSort}
            />
          </div>

          {/* Products List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Products in {selectedCategory?.name}
            </h3>

            <ProductSortable
              products={products}
              onReorder={handleReorder}
              loading={isLoading}
              disabled={isLoadingSort}
            />
          </div>
        </>
      )}

      {/* No Category Selected */}
      {!selectedCategoryId && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Category Selected</h3>
            <p className="text-gray-600">
              Choose a category from the dropdown above to start managing product order.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
