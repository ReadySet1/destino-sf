'use client';

import { ArrowUpDown, DollarSign, Calendar, SortAsc } from 'lucide-react';
import type { ReorderStrategy } from '@/types/product-admin';

interface QuickSortActionsProps {
  onQuickSort: (strategy: ReorderStrategy) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
}

export function QuickSortActions({
  onQuickSort,
  disabled = false,
  isLoading = false,
}: QuickSortActionsProps) {
  const sortOptions = [
    {
      strategy: 'ALPHABETICAL' as ReorderStrategy,
      label: 'A-Z',
      icon: SortAsc,
      description: 'Sort alphabetically by name',
    },
    {
      strategy: 'PRICE_ASC' as ReorderStrategy,
      label: 'Price ↑',
      icon: DollarSign,
      description: 'Sort by price (low to high)',
    },
    {
      strategy: 'PRICE_DESC' as ReorderStrategy,
      label: 'Price ↓',
      icon: DollarSign,
      description: 'Sort by price (high to low)',
    },
    {
      strategy: 'NEWEST_FIRST' as ReorderStrategy,
      label: 'Newest',
      icon: Calendar,
      description: 'Sort by creation date (newest first)',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Apply automatic sorting to reorder all products in this category:
      </p>

      <div className="flex flex-wrap gap-2">
        {sortOptions.map(({ strategy, label, icon: Icon, description }) => (
          <button
            key={strategy}
            onClick={() => onQuickSort(strategy)}
            disabled={disabled || isLoading}
            title={description}
            className={`
              inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
              transition-colors duration-200
              ${
                disabled || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
            {isLoading && (
              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-xs text-yellow-800">
          <strong>Warning:</strong> Quick sort will reorder all products in this category and
          override any custom ordering you&apos;ve set up.
        </p>
      </div>
    </div>
  );
}
