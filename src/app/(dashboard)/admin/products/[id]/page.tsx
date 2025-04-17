import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { client } from '@/sanity/lib/client';
import { SanityImageInput, SanityImage } from '@/components/admin/SanityImageInput';
import { Category } from '@/types/product';
import { logger } from '@/utils/logger';

// Disable page caching to always fetch fresh data
export const revalidate = 0;

interface SanityImageResponse {
  _key?: string;
  _type?: string;
  asset: {
    _ref: string;
    _type: string;
  };
}

interface SanityProductResponse {
  _id: string;
  images: SanityImageResponse[];
}

interface SanityPatchData {
  name: string;
  description: string;
  price: number;
  featured: boolean;
  squareId: string | null;
  images: Array<{
    _type: 'image';
    _key?: string;
    asset: {
      _type: 'reference';
      _ref: string;
    };
  }>;
  category?: {
    _type: 'reference';
    _ref: string;
  };
}

// Function to get Sanity image URL
function getImageUrlFromRef(ref: string): string | null {
  const parts = ref.split('-');
  if (parts.length < 3 || parts[0] !== 'image') return null;

  const config = client.config();
  const dataset = config.dataset;
  const projectId = config.projectId;

  if (!dataset || !projectId) {
    logger.error('Sanity dataset or projectId is not configured.');
    return null;
  }

  const filename = parts.slice(1).join('-');
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${filename.replace('-webp', '.webp').replace('-jpg', '.jpg').replace('-png', '.png')}`;
}

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

  // Fetch corresponding product data from Sanity to get initial images
  let initialSanityImages: SanityImage[] = [];
  let sanityProductId: string | null = null;
  try {
    // Prioritize squareId if available, otherwise use name
    const query = product.squareId
      ? `*[_type == "product" && squareId == $identifier][0]{ 
          _id, 
          "images": images[]{
            _key,
            _type,
            asset
          }
        }`
      : `*[_type == "product" && name == $identifier][0]{ 
          _id, 
          "images": images[]{
            _key,
            _type,
            asset
          }
        }`;
    const identifier = product.squareId || product.name;

    const sanityProductData = await client.fetch<SanityProductResponse | null>(query, {
      identifier,
    });

    if (sanityProductData) {
      sanityProductId = sanityProductData._id;
      initialSanityImages = (sanityProductData.images || [])
        .map((img: SanityImageResponse) => {
          // Skip if asset is null or doesn't have _ref
          if (!img?.asset?._ref) {
            logger.warn('Image asset missing _ref:', img);
            return null;
          }

          const sanityImage: SanityImage = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: img.asset._ref,
            },
          };

          // Add _key if it exists, or generate a new one
          sanityImage._key =
            img._key || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          logger.debug('Processed Sanity image:', JSON.stringify(sanityImage, null, 2));
          return sanityImage;
        })
        .filter((img): img is SanityImage => img !== null);

      logger.debug('Loaded initial Sanity images:', JSON.stringify(initialSanityImages, null, 2));
    } else {
      logger.info(
        `Product with identifier "${identifier}" not found in Sanity. Images will start empty.`
      );
    }
  } catch (error) {
    logger.error('Error fetching Sanity product data:', error);
  }

  async function updateProduct(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const categoryId = formData.get('categoryId') as string;
    const sanityImagesDataString = formData.get('sanityImagesData') as string;
    const featured = formData.has('featured');
    const active = formData.has('active');
    const squareId = formData.get('squareId') as string;
    const productId = formData.get('productId') as string;

    if (!name || !price || isNaN(price) || !productId) {
      logger.error('Invalid product data');
      return;
    }

    let sanityImages: SanityImage[] = [];
    try {
      sanityImages = sanityImagesDataString ? JSON.parse(sanityImagesDataString) : [];
    } catch (e) {
      logger.error('Error parsing Sanity images data:', e);
      return;
    }

    // Generate image URLs from Sanity references
    const prismaImageUrls = sanityImages
      .map(img => {
        const url = getImageUrlFromRef(img.asset._ref);
        logger.debug('Generated image URL:', url, 'from ref:', img.asset._ref);
        return url;
      })
      .filter((url): url is string => {
        if (!url) {
          logger.warn('Failed to generate URL for image');
          return false;
        }
        return true;
      });

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

      // Try to update in Sanity if we found an ID earlier or can find it now
      let currentSanityProductId = sanityProductId;
      if (!currentSanityProductId) {
        logger.debug('Fetching Sanity product ID...');
        currentSanityProductId = await client.fetch(
          `*[_type == "product" && (name == $name || squareId == $squareId)][0]._id`,
          { name, squareId }
        );
      }

      if (currentSanityProductId) {
        logger.debug('Found Sanity product ID:', currentSanityProductId);
        const dbCategory = await prisma.category.findUnique({ where: { id: categoryId } });
        let categorySanityRef = null;
        if (dbCategory) {
          logger.debug('Looking up category in Sanity:', dbCategory.name);
          const categorySanityId = await client.fetch(
            `*[_type == "productCategory" && name == $categoryName][0]._id`,
            { categoryName: dbCategory.name }
          );
          if (categorySanityId) {
            categorySanityRef = { _type: 'reference', _ref: categorySanityId };
          }
        }

        const sanityPatchData: SanityPatchData = {
          name,
          description: description || '',
          price,
          featured,
          squareId: squareId || null,
          images: sanityImages.map(img => ({
            _type: 'image' as const,
            _key: img._key || undefined,
            asset: { _type: 'reference' as const, _ref: img.asset._ref },
          })),
        };

        if (categorySanityRef) {
          sanityPatchData.category = {
            _type: 'reference' as const,
            _ref: categorySanityRef._ref,
          };
        }

        logger.debug('Updating Sanity with patch data:', JSON.stringify(sanityPatchData, null, 2));
        await client
          .patch(currentSanityProductId)
          .set(sanityPatchData)
          .unset(sanityPatchData.category ? [] : ['category'])
          .commit();

        logger.info(`Product updated in Sanity: ${currentSanityProductId}`);
      } else {
        logger.info('Product not found in Sanity. Consider creating it.');
      }

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
        sanityProductId,
        hasImages: sanityImages.length > 0,
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

            {/* Sanity Image Input Component */}
            <div className="sm:col-span-6">
              <SanityImageInput name="sanityImagesData" initialImages={initialSanityImages} />
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