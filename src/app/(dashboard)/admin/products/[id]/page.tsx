// src/app/(dashboard)/admin/products/[id]/page.tsx

import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { env } from '@/env'; // Import the validated environment configuration
import Link from 'next/link';
import { Category } from '@/types/product';
import { logger } from '@/utils/logger';
import { ProductImageSection } from '@/components/admin/products/ProductImageSection';
import { ProductEditActions } from './components/ProductEditActions';

// Disable page caching to always fetch fresh data
export const revalidate = 0;

// Updated the props type definition to match Next.js 15 expectations
type PageProps = {
  params: Promise<{ id: string }>; // params is now a Promise
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // searchParams is also a Promise
};

export default async function EditProductPage({ params, searchParams }: PageProps) {
  // Need to await params and searchParams since they're Promises
  const { id: productId } = await params;
  // We're not using searchParams in this component, but we'll await it to satisfy TypeScript
  await searchParams;

  // Validate that productId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!productId || !uuidRegex.test(productId)) {
    logger.error(`Invalid product ID format: ${productId}`);
    notFound();
  }

  // Utility function to strip HTML tags and decode entities
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');
    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    return text.trim();
  };

  // Helper function to convert Decimal to number safely
  const decimalToNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    
    // If it's already a number
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    
    // If it's a Decimal object
    if (typeof value === 'object' && value !== null) {
      try {
        if (typeof value.toNumber === 'function') {
          return value.toNumber();
        }
        if (typeof value.valueOf === 'function') {
          const val = value.valueOf();
          if (typeof val === 'number') return val;
        }
        // Last resort: convert to string and parse
        return parseFloat(String(value)) || 0;
      } catch (e) {
        console.error('Error converting value to number:', e);
        return 0;
      }
    }
    
    // If it's a string that can be parsed as a number
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  };

  // Fetch the product from Prisma with variants and archive fields
  const productFromDb = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        orderBy: {
          price: 'asc'
        }
      }
    }
  });

  if (!productFromDb) {
    notFound();
  }

  // Serialize the product data to avoid Decimal issues
  const product = {
    ...productFromDb,
    price: decimalToNumber(productFromDb.price),
    isArchived: productFromDb.isArchived || false,
    archivedAt: productFromDb.archivedAt,
    archivedReason: productFromDb.archivedReason,
    variants: productFromDb.variants.map(variant => ({
      ...variant,
      price: variant.price ? decimalToNumber(variant.price) : null,
    })),
  };

  // Fetch categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  // Prepare initial image URLs from the database product
  const initialImageUrls = Array.isArray(product.images) ? product.images : [];

  async function updateProduct(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const categoryId = formData.get('categoryId') as string;
    const imageUrlsString = formData.get('imageUrls') as string | null;
    const squareId = formData.get('squareId') as string;
    const productId = formData.get('productId') as string;

    if (!name || !price || isNaN(price) || !productId) {
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
    } else {
      logger.info('No image URLs provided in form data.');
      prismaImageUrls = product && Array.isArray(product.images) ? product.images : [];
    }

    try {
      // Update the product in the database
      logger.debug('Updating product in database with images:', prismaImageUrls);
      const _updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          name,
          description,
          price,
          categoryId,
          images: prismaImageUrls,
          squareId,
        },
      });
      logger.info('Database update successful');

      // Revalidate both pages
      await Promise.all([
        fetch(`${env.NEXT_PUBLIC_APP_URL}/api/revalidate?path=/admin/products`),
        fetch(
          `${env.NEXT_PUBLIC_APP_URL}/api/revalidate?path=/admin/products/${productId}`
        ),
      ]);

      logger.info(`Product "${name}" updated successfully in database`);
      return redirect('/admin/products');
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
      }
      logger.error('Detailed error updating product:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        productId,
        name,
        categoryId,
        hasImages: prismaImageUrls.length > 0,
        imageUrls: prismaImageUrls,
      });
      throw new Error('Failed to update product. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
                {product.isArchived && (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-base text-gray-600 leading-relaxed">
                Update product information, pricing, and availability settings
              </p>
            </div>
            <ProductEditActions
              productId={productId}
              productName={product.name}
              isArchived={product.isArchived}
            />
          </div>
        </div>

        <form action={updateProduct} className="space-y-10">
          <input type="hidden" name="productId" value={productId} />

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
                    defaultValue={product.name}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200"
                    placeholder="Enter a descriptive product name"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={5}
                    defaultValue={stripHtmlTags(product.description || '')}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200 resize-none"
                    placeholder="Describe your product features, ingredients, or other important details..."
                  ></textarea>
                  <p className="mt-2 text-sm text-gray-500">
                    Help customers understand what makes this product special
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-3">
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
                        defaultValue={Number(product.price).toString()}
                        className="block w-full pl-8 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="categoryId" className="block text-sm font-semibold text-gray-700 mb-3">
                      Category *
                    </label>
                    <select
                      name="categoryId"
                      id="categoryId"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 transition-all duration-200"
                      required
                      defaultValue={product.categoryId}
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
                    <path d="M7 7h10v10H7z"/>
                    <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Square Integration</h2>
                  <p className="text-sm text-gray-600">
                    Connect this product to your Square catalog for inventory sync
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-8">
              <div>
                <label htmlFor="squareId" className="block text-sm font-semibold text-gray-700 mb-3">
                  Square Catalog Item ID
                </label>
                <input
                  type="text"
                  name="squareId"
                  id="squareId"
                  placeholder="e.g., 2HKY7CZ4YFOBQMT7NLS2EKV2S"
                  defaultValue={product.squareId || ''}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 font-mono transition-all duration-200"
                />
                <p className="mt-2 text-sm text-gray-500">
                  The unique identifier from Square&apos;s catalog. Used for syncing inventory and pricing automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-green-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
              <ProductImageSection initialImages={initialImageUrls} />
            </div>
          </div>

          {/* Product Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200 bg-indigo-50">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                      Product Variants ({product.variants.length})
                    </h2>
                    <p className="text-sm text-gray-600">
                      Variants are managed through Square and synced automatically
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-8 py-8">
                <div className="space-y-4">
                  {product.variants.map((variant, index) => (
                    <div key={variant.id} className="flex items-center justify-between p-6 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{variant.name}</h3>
                        {variant.squareVariantId && (
                          <p className="text-sm text-gray-500">
                            Square ID: <span className="font-mono text-gray-700 bg-white px-2 py-1 rounded">{variant.squareVariantId}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-6">
                        <span className="text-2xl font-bold text-gray-900">
                          {variant.price ? `$${Number(variant.price).toFixed(2)}` : 'No price'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800 leading-relaxed">
                        <strong>Note:</strong> Product variants are managed through Square Dashboard. 
                        Any changes to variants should be made in Square and then synced to this system using the product sync feature.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="bg-white rounded-xl border border-gray-200 px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                Cancel Changes
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Update Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
