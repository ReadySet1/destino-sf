'use client';

import { ChevronDown } from 'lucide-react';
import type { CategoryOption } from '@/types/product-admin';

interface CategorySelectorProps {
  categories: CategoryOption[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string) => void;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onCategoryChange,
}: CategorySelectorProps) {
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  return (
    <div className="space-y-2">
      <label htmlFor="category-select" className="block text-sm font-medium text-gray-700">
        Category
      </label>
      <div className="relative">
        <select
          id="category-select"
          value={selectedCategoryId || ''}
          onChange={e => e.target.value && onCategoryChange(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none bg-white"
        >
          <option value="">Select a category...</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.productCount} products)
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {selectedCategory && (
        <p className="text-sm text-gray-600">
          Managing {selectedCategory.productCount} products in{' '}
          <span className="font-medium">{selectedCategory.name}</span>
        </p>
      )}
    </div>
  );
}
