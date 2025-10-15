// src/app/(dashboard)/admin/products/new/page.tsx

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { createProductAction } from '../actions';
import { Category } from '@/types/product';
import { logger } from '@/utils/logger';

// Disable page caching to always fetch fresh data
export const revalidate = 0;

export default async function NewProductPage() {
  // Fetch categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  async function createProduct(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const categoryId = formData.get('categoryId') as string;
    const imageUrlsString = formData.get('imageUrls') as string | null;
    const featured = formData.has('featured');
    const active = formData.has('active');
    const squareId = formData.get('squareId') as string;

    if (!name || !price || isNaN(price) || !categoryId) {
      logger.error('Invalid product data');
      return;
    }

    let prismaImageUrls: string[] = [];
    if (imageUrlsString) {
      try {
        const parsedUrls = JSON.parse(imageUrlsString);
        if (Array.isArray(parsedUrls) && parsedUrls.every(url => typeof url === 'string')) {
          prismaImageUrls = parsedUrls;
        } else {
          logger.warn('Parsed image URLs data is not a valid string array.');
        }
      } catch (e) {
        logger.error('Error parsing image URLs data:', e);
      }
    }

    try {
      // Create the product in the database
      logger.debug('Creating product in database with images:', prismaImageUrls);
      const newProduct = await prisma.product.create({
        data: {
          name,
          description,
          price,
          categoryId,
          images: prismaImageUrls,
          featured,
          active,
          squareId: squareId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          // Set sensible defaults for availability - use Availability Manager for advanced rules
          isAvailable: active, // Match active state by default
          isPreorder: false,
          visibility: 'PUBLIC',
          itemState: active ? 'ACTIVE' : 'INACTIVE',
        },
      });
      logger.info('Database creation successful');

      logger.info(`Product "${name}" created successfully in database`);
      return redirect('/admin/products');
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
      }
      logger.error('Detailed error creating product:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name,
        categoryId,
        hasImages: prismaImageUrls.length > 0,
        imageUrls: prismaImageUrls,
      });
      throw new Error('Failed to create product. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Product</h1>
              <p className="text-base text-gray-600 leading-relaxed">
                Add a new product to your catalog with pricing and availability settings
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/admin/products"
                className="inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Products
              </Link>
            </div>
          </div>
        </div>

        <form action={createProduct} className="space-y-10">
          {/* Basic Information */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Basic Information</h2>
              <p className="text-sm text-gray-600">
                Essential product details that customers will see
              </p>
            </div>
            <div className="px-8 py-8">
              <div className="space-y-8">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200"
                    placeholder="Enter a descriptive product name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-semibold text-gray-700 mb-3"
                  >
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={5}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200 resize-none"
                    placeholder="Describe your product features, ingredients, or other important details..."
                  ></textarea>
                  <p className="mt-2 text-sm text-gray-500">
                    Help customers understand what makes this product special
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <label
                      htmlFor="price"
                      className="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Price *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-base font-medium">$</span>
                      </div>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        step="0.01"
                        min="0"
                        required
                        className="block w-full pl-8 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="categoryId"
                      className="block text-sm font-semibold text-gray-700 mb-3"
                    >
                      Category *
                    </label>
                    <select
                      name="categoryId"
                      id="categoryId"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200"
                      required
                    >
                      <option value="">Choose a category</option>
                      {categories.map((category: Category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Square Integration */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 7h10v10H7z" />
                    <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Square Integration</h2>
                  <p className="text-sm text-gray-600">
                    Connect this product to your Square catalog for inventory sync (optional)
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-8">
              <div>
                <label
                  htmlFor="squareId"
                  className="block text-sm font-semibold text-gray-700 mb-3"
                >
                  Square Catalog Item ID
                </label>
                <input
                  type="text"
                  name="squareId"
                  id="squareId"
                  placeholder="e.g., 2HKY7CZ4YFOBQMT7NLS2EKV2S (leave empty to auto-generate)"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 font-mono transition-all duration-200"
                />
                <p className="mt-2 text-sm text-gray-500">
                  The unique identifier from Square&apos;s catalog. Leave empty to generate a
                  temporary ID.
                </p>
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-green-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Product Images</h2>
                  <p className="text-sm text-gray-600">
                    Upload high-quality images to showcase your product
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-8">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                <div className="space-y-6">
                  <div className="mx-auto w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Image Upload Component
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Drag and drop images here, or click to browse files
                    </p>
                    <p className="text-sm text-blue-600 bg-blue-100 inline-block px-4 py-2 rounded-lg font-medium">
                      No images selected
                    </p>
                  </div>
                  <input type="hidden" name="imageUrls" value="[]" />
                </div>
              </div>
            </div>
          </div>

          {/* Product Status */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Product Status</h2>
                  <p className="text-sm text-gray-600">
                    Basic visibility and feature settings for this product
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      name="active"
                      id="active"
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      defaultChecked={true}
                    />
                    <div className="ml-3">
                      <label htmlFor="active" className="text-base font-semibold text-gray-700">
                        Active Product
                      </label>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Active products are included in your catalog and can be sold to customers
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      name="featured"
                      id="featured"
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <label htmlFor="featured" className="text-base font-semibold text-gray-700">
                        Featured Product
                      </label>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Featured products appear prominently on your homepage and category pages
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Settings - Info Box */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-8 py-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    Advanced Availability Management
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      After Creation
                    </span>
                  </h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    New products are created with basic availability settings (matching the Active
                    status above). For advanced features like <strong>scheduling</strong>,{' '}
                    <strong>pre-orders</strong>, <strong>seasonal availability</strong>, and{' '}
                    <strong>date-based rules</strong>, use the dedicated Availability Manager after
                    creating this product.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/admin/products/availability"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Open Availability Manager
                    </Link>
                    <Link
                      href="/admin/products/availability/timeline"
                      className="inline-flex items-center px-4 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      View Availability Timeline
                    </Link>
                  </div>
                  <div className="mt-4 p-3 bg-white border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong className="text-gray-900">💡 Pro Tip:</strong> The Availability
                      Manager lets you create complex rules for seasonal items, limited-time offers,
                      and automatic state transitions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white rounded-xl border border-gray-200 px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Create Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
