import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Category } from '@/types/product';
import { logger } from '@/utils/logger';

// Disable page caching to always fetch fresh data
export const revalidate = 0;

// Change the props type to match Next.js App Router expectations
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditProductPage({ params }: PageProps) {
  // Wait for params to resolve since it's now a Promise in Next.js 15.3.1
  const resolvedParams = await params;
  const productId = resolvedParams.id;

  // Fetch the product from Prisma
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    notFound();
  }

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
    const featured = formData.has('featured');
    const active = formData.has('active');
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
          featured,
          active,
          squareId,
        },
      });
      logger.info('Database update successful');

      // Revalidate both pages
      await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate?path=/admin/products`),
        fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate?path=/admin/products/${productId}`
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <Link
          href="/admin/products"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <form action={updateProduct}>
          <input type="hidden" name="productId" value={productId} />

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={product.name}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                defaultValue={product.description || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              ></textarea>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price ($)
              </label>
              <input
                type="number"
                name="price"
                id="price"
                step="0.01"
                min="0"
                required
                defaultValue={Number(product.price).toString()}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="squareId" className="block text-sm font-medium text-gray-700">
                Square ID
              </label>
              <input
                type="text"
                name="squareId"
                id="squareId"
                placeholder="Square catalog item ID"
                defaultValue={product.squareId || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                name="categoryId"
                id="categoryId"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                required
                defaultValue={product.categoryId}
              >
                <option value="">Select a category</option>
                {categories.map((category: Category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3"></div>

            {/* Image Upload Section */}
            <div>
              <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">Images</label>
              <div className="p-4 border border-dashed border-red-400 bg-red-50 rounded">
                <p className="text-red-700 text-sm font-medium">Placeholder: Replace SanityImageInput</p>
                <p className="text-red-600 text-xs mt-1">Implement your image upload component here. It should accept `initialImageUrls` (value: `{JSON.stringify(initialImageUrls)}`) and submit the final array of URLs as a JSON string in a form field named `imageUrls`.</p>
              </div>
            </div>

            <div className="sm:col-span-3 flex items-center">
              <input
                type="checkbox"
                name="featured"
                id="featured"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                defaultChecked={product.featured}
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                Featured Product
              </label>
            </div>

            <div className="sm:col-span-3 flex items-center">
              <input
                type="checkbox"
                name="active"
                id="active"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                defaultChecked={product.active}
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Active Product
              </label>
            </div>

            <div className="sm:col-span-6 flex justify-end space-x-4 mt-6">
              <Link
                href="/admin/products"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Update Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}