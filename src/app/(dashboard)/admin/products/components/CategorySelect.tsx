'use client';

import { useState, useEffect, useTransition } from 'react';
import { updateProductCategory } from '../actions';

interface Category {
  id: string;
  name: string;
}

interface CategorySelectProps {
  categories: Category[];
  productId: string;
  currentCategoryId: string;
}

export default function CategorySelect({
  categories,
  productId,
  currentCategoryId,
}: CategorySelectProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(currentCategoryId);
  const [isPending, startTransition] = useTransition();

  // Keep state in sync with props when they change
  useEffect(() => {
    if (!isPending) {
      setSelectedCategoryId(currentCategoryId);
    }
  }, [currentCategoryId, isPending]);

  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = e.target.value;
    setSelectedCategoryId(newCategoryId); // Update local state immediately

    startTransition(async () => {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('categoryId', newCategoryId);
      await updateProductCategory(formData);
    });
  };

  return (
    <div className="flex items-center space-x-2 relative">
      <select
        name="categoryId"
        value={selectedCategoryId}
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${isPending ? 'opacity-70' : ''}`}
        onChange={handleCategoryChange}
        disabled={isPending}
      >
        {categories.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {isPending && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <svg
            className="animate-spin h-4 w-4 text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}
    </div>
  );
}
