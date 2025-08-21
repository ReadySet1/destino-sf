'use client';

import { Package, Eye, EyeOff } from 'lucide-react';
import type { CategoryOption, ProductDisplayOrder } from '@/types/product-admin';

interface ProductStatsProps {
  category: CategoryOption | undefined;
  products: ProductDisplayOrder[];
  isLoading: boolean;
}

export function ProductStats({ category, products, isLoading }: ProductStatsProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-8 bg-gray-200 rounded mx-auto mb-2 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-16 mx-auto mb-1 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeProducts = products.filter(p => p.active);
  const inactiveProducts = products.filter(p => !p.active);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Category Overview
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Products */}
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-900">
            {products.length}
          </div>
          <div className="text-sm text-blue-700">
            Total Products
          </div>
        </div>

        {/* Active Products */}
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <Eye className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-900">
            {activeProducts.length}
          </div>
          <div className="text-sm text-green-700">
            Active Products
          </div>
        </div>

        {/* Inactive Products */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <EyeOff className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {inactiveProducts.length}
          </div>
          <div className="text-sm text-gray-700">
            Inactive Products
          </div>
        </div>
      </div>

      {category && (
        <div className="mt-4 text-center">
          <h4 className="font-medium text-gray-900">
            {category.name}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop products below to change their display order on your website.
          </p>
        </div>
      )}
    </div>
  );
}
