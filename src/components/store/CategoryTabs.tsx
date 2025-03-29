'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Category {
  _id: string;
  name: string;
  slug: { current: string };
}

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string;
}

export function CategoryTabs({ categories, selectedCategoryId }: CategoryTabsProps) {
  const pathname = usePathname();
  
  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex min-w-max border-b">
        {categories.map((category) => {
          const isActive = category._id === selectedCategoryId;
          
          return (
            <Link
              key={category._id}
              href={`${pathname}?category=${category._id}`}
              className={`flex-shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {category.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
