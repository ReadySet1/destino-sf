// src/app/(dashboard)/admin/products/components/ArchiveFilter.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, Check } from 'lucide-react';

interface ArchiveFilterProps {
  currentFilter: string;
}

export function ArchiveFilter({ currentFilter }: ArchiveFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams);

    if (filter && filter !== 'all') {
      params.set('archived', filter);
    } else {
      params.delete('archived');
    }
    params.delete('page'); // Reset to page 1

    router.push(`?${params.toString()}`);
  };

  const filters = [
    { value: 'all', label: 'All Products', icon: null },
    { value: 'active', label: 'Active Only', icon: Check },
    { value: 'archived', label: 'Archived Only', icon: Archive },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <div className="flex gap-2">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = currentFilter === filter.value;

            return (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {filter.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
