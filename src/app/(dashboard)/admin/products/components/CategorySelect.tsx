'use client';

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

export default function CategorySelect({ categories, productId, currentCategoryId }: CategorySelectProps) {
  return (
    <form action={updateProductCategory} className="flex items-center space-x-2">
      <input type="hidden" name="productId" value={productId} />
      <select
        name="categoryId"
        defaultValue={currentCategoryId}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        onChange={(e) => {
          const form = e.target.form;
          if (form) form.requestSubmit();
        }}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </form>
  );
} 