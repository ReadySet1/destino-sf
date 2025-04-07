// src/app/(store)/products/category/[slug]/page.tsx

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAllCategories, getProductsByCategory } from '@/lib/sanity-products';
import { ProductGrid } from '@/components/Products/ProductGrid';
import { urlFor } from '@/sanity/lib/image';

// Define the minimal type we need for categories
interface SanityCategory {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  image?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
}

// Define product type expected by ProductGrid
interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[]; // Expects an array of strings (URLs)
  slug: { current: string };
  featured?: boolean;
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}

// Type for variant coming from Sanity
interface SanityVariant {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  [key: string]: unknown;
}

// Define the expected props structure, noting params is a Promise
interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoryPage({ params: paramsPromise }: CategoryPageProps) {
  // Await the params promise to get the actual params object
  const params = await paramsPromise;
  const slug = params.slug;

  // Fetch all product categories from Sanity
  const categories = await getAllCategories();

  if (!categories || categories.length === 0) {
    notFound(); // Or display a message indicating no categories exist
  }

  // Find the category matching the slug
  const selectedCategory = categories.find((c: SanityCategory) => c.slug?.current === slug);

  // Fetch products ONLY if a category was found
  let products: Product[] = [];
  if (selectedCategory) {
    try {
      // Fetch products for the found category using its ID
      const fetchedProducts = await getProductsByCategory(selectedCategory._id);

      // Map fetched data directly to the structure ProductGrid expects
      products = fetchedProducts.map(p => ({
        _id: p._id,
        name: p.name,
        description: p.description,
        price: p.price,
        images: (p.images || []).map(img => img.url),
        slug: p.slug || { current: p._id },
        featured: p.featured || false,
        // Transform variants to match the expected format
        variants: (p.variants || []).map(variant => {
          // Cast the unknown variant to our SanityVariant interface
          const v = variant as SanityVariant;
          return {
            id: v.id || v._id || String(Math.random()),
            name: v.name || 'Variant',
            price: v.price,
          };
        }),
      }));
    } catch (error) {
      console.error(
        `Failed to fetch products for category ${selectedCategory.name} (ID: ${selectedCategory._id}):`,
        error
      );
      // Optionally display an error message on the page
    }
  }

  const categoryId = selectedCategory?._id;

  if (!categoryId) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 bg-white py-8">
        <div className="container mx-auto px-4">
          {selectedCategory ? (
            // Content to display when category is found
            <>
              <div className="mb-8">
                <div className="text-center mb-6">
                  <h1 className="text-4xl font-bold">{selectedCategory.name}</h1>
                  {selectedCategory.description && (
                    <p className="mt-2 text-lg text-gray-600 max-w-3xl mx-auto">
                      {selectedCategory.description}
                    </p>
                  )}
                </div>

                {/* Optional: Category image banner */}
                {selectedCategory.image && (
                  <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden mb-8">
                    <Image
                      src={urlFor(selectedCategory.image).url()}
                      alt={selectedCategory.name}
                      className="w-full h-full object-cover"
                      width={1200}
                      height={400}
                    />
                  </div>
                )}
              </div>

              <div>
                <Suspense
                  fallback={
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-pulse text-center">
                        <div className="h-6 w-32 bg-gray-200 rounded mx-auto"></div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-64 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  }
                >
                  {products.length > 0 ? (
                    <ProductGrid
                      products={products}
                      title={`${selectedCategory.name} Products`}
                      showFilters={true}
                    />
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-lg">
                      <h2 className="text-2xl font-medium mb-2">No Products Available</h2>
                      <p className="text-gray-500 mb-6">
                        We don&apos;t have any products in the {selectedCategory.name} category yet.
                      </p>
                      <Link
                        href="/products"
                        className="inline-block px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring"
                      >
                        View All Products
                      </Link>
                    </div>
                  )}
                </Suspense>
              </div>
            </>
          ) : (
            // Fallback content when category is not found
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
              <p className="text-lg text-gray-600 mb-6">
                Sorry, we couldn&apos;t find the category you were looking for.
              </p>
              <Link
                href="/products"
                className="inline-block px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring"
              >
                View All Products
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Generate static paths for all categories at build time for better performance
export async function generateStaticParams() {
  try {
    const categories = await getAllCategories();
    return categories.map((category: SanityCategory) => ({
      slug: category.slug.current,
    }));
  } catch (error) {
    console.error('Error generating static params for categories:', error);
    return [];
  }
}
