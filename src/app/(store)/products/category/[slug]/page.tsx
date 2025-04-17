// src/app/(store)/products/category/[slug]/page.tsx

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllCategories, getProductsByCategory } from '@/lib/sanity-products';
import { ProductGrid } from '@/components/Products/ProductGrid';
import { CategoryHeader } from '@/components/Products/CategoryHeader';
import { prisma } from '@/lib/prisma'; // Import Prisma client

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

// Utility function to normalize image data from different sources
function normalizeImages(images: any): string[] {
  if (!images) return [];
  
  // Case 1: Already an array of strings
  if (Array.isArray(images) && 
      images.length > 0 && 
      typeof images[0] === 'string') {
    return images.filter(url => url && url.trim() !== '');
  }
  
  // Case 2: Array of objects with url property (Sanity format)
  if (Array.isArray(images) && 
      images.length > 0 && 
      typeof images[0] === 'object' &&
      images[0] !== null &&
      'url' in images[0]) {
    return images.map(img => img.url).filter(url => url && typeof url === 'string');
  }
  
  // Case 3: String that might be a JSON array
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter(url => url && typeof url === 'string');
      }
      return [images]; // If not a JSON array, use the string as a single URL
    } catch (e) {
      // If not valid JSON, assume it's a single URL
      return [images];
    }
  }
  
  return [];
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

// Map frontend slugs to the corresponding database category names
const SLUG_TO_CATEGORY_MAP: Record<string, string> = {
  'alfajores': 'Desserts',
  'desserts': 'Desserts',
  'empanadas': 'Appetizers',
  'catering': 'Catering',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  alfajores: "Indulge in the delicate delight of our signature Alfajores. These classic South American butter cookies boast a tender, crumbly texture, lovingly filled with creamy dulce de leche. Explore a variety of tempting flavors, from traditional favorites to unique seasonal creations – the perfect sweet treat for yourself or a thoughtful gift.",
  empanadas: "Discover our authentic, hand-folded empanadas, flash-frozen to preserve their freshness and flavor. Each 4-pack features golden, flaky pastry enveloping savory fillings inspired by Latin American culinary traditions. From the aromatic Huacatay Chicken to hearty Argentine Beef, these easy-to-prepare delights bring restaurant-quality taste to your home in minutes."
};

// Rename to avoid conflict with the interface Product
type PrismaProduct = Parameters<typeof prisma.product.create>[0]['data'] & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  variants: Array<{
    id: string;
    name: string;
    price?: number | null;
  }>;
};

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

  // Get the corresponding database category name from the slug
  const dbCategoryName = SLUG_TO_CATEGORY_MAP[slug];

  // Fetch products ONLY if a category was found
  let products: Product[] = [];
  if (selectedCategory) {
    try {
      // Try database first if we have a mapping
      if (dbCategoryName) {
        
        // Get the category ID from the database
        const dbCategory = await prisma.category.findFirst({
          where: {
            name: dbCategoryName
          }
        });
        
        if (dbCategory) {
          
          // Fetch products in this category from the database
          const dbProducts = await prisma.product.findMany({
            where: {
              categoryId: dbCategory.id,
              active: true
            },
            include: {
              variants: true
            }
          });
          
          // Map database products to the format expected by ProductGrid
          products = dbProducts.map((p) => {
            // Parse the images JSON string
            let parsedImages: string[] = [];
            try {
              parsedImages = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
            } catch (e) {
              parsedImages = [];
            }

            return {
              _id: p.id,
              name: p.name,
              description: p.description || undefined,
              price: Number(p.price),
              images: parsedImages,
              slug: { current: p.id },
              featured: p.featured,
              variants: p.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price ? Number(v.price) : undefined
              }))
            };
          });
        }
      }

      // Only fallback to Sanity if we didn't get products from the database
      if (products.length === 0) {
        const fetchedProducts = await getProductsByCategory(selectedCategory._id);

        // Map fetched data directly to the structure ProductGrid expects
        products = fetchedProducts.map(p => ({
          _id: p._id,
          name: p.name,
          description: p.description,
          price: p.price,
          images: (p.images || []).map(img => img.url).filter(Boolean),
          slug: p.slug || { current: p._id },
          featured: p.featured || false,
          variants: (p.variants || []).map(variant => {
            const v = variant as SanityVariant;
            return {
              id: v.id || v._id || String(Math.random()),
              name: v.name || 'Variant',
              price: v.price,
            };
          }),
        }));
      }
    } catch (error) {
      console.error(
        `Failed to fetch products for category ${selectedCategory.name}:`,
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
      <main className="flex-1 bg-white">
        {selectedCategory ? (
          <>
            <CategoryHeader 
              title={selectedCategory.name}
              description={CATEGORY_DESCRIPTIONS[selectedCategory.slug.current]}
            />

            <div className="container mx-auto px-4 sm:px-6 max-w-screen-2xl">
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-pulse text-center w-full">
                      <div className="h-6 w-32 bg-gray-200 rounded mx-auto"></div>
                      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                }
              >
                {products.length > 0 ? (
                  <div className="py-8 lg:py-12">
                    <ProductGrid
                      products={products}
                      title={`${selectedCategory.name} Products`}
                      showFilters={true}
                    />
                  </div>
                ) : (
                  <div className="text-center py-16 my-12 bg-gray-50 rounded-2xl">
                    <h2 className="text-2xl font-medium mb-3">No Products Available</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      We don&apos;t have any products in the {selectedCategory.name} category yet.
                    </p>
                    <Link
                      href="/products"
                      className="inline-block px-8 py-3 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
          <div className="container mx-auto px-4 sm:px-6 max-w-screen-2xl">
            <div className="text-center py-20 my-12 bg-gray-50 rounded-2xl">
              <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                Sorry, we couldn&apos;t find the category you were looking for.
              </p>
              <Link
                href="/products"
                className="inline-block px-8 py-3 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                View All Products
              </Link>
            </div>
          </div>
        )}
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