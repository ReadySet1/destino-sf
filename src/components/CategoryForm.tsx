'use client';

import { useCategory } from './CategoryActions';
import { useState } from 'react';
import Image from 'next/image';

interface CategoryFormProps {
  createCategory: (formData: FormData) => Promise<void>;
  initialData?: {
    name?: string;
    description?: string;
    order?: number;
    isActive?: boolean;
    parentId?: string;
    imageUrl?: string;
  };
}

export default function CategoryForm({ createCategory, initialData }: CategoryFormProps) {
  const { handleServerAction, isPending } = useCategory();
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);

  async function handleCreateCategory(formData: FormData) {
    await handleServerAction(createCategory(formData));
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Add New Category</h2>

      <form action={handleCreateCategory}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              defaultValue={initialData?.name}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            />
          </div>

          <div>
            <label htmlFor="order" className="block text-sm font-medium text-gray-700">
              Display Order
            </label>
            <input
              type="number"
              name="order"
              id="order"
              min="0"
              defaultValue={initialData?.order || 0}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              defaultValue={initialData?.description}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            ></textarea>
          </div>

          <div>
            <label htmlFor="isActive" className="block text-sm font-medium text-gray-700">
              Active Status
            </label>
            <select
              name="isActive"
              id="isActive"
              defaultValue={initialData?.isActive ? 'true' : 'false'}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Category Image
            </label>
            <input
              type="file"
              name="image"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full"
            />
            {imagePreview && (
              <div className="mt-2">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={80}
                  height={80}
                  className="object-cover rounded"
                />
              </div>
            )}
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 ${
                isPending ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isPending ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 