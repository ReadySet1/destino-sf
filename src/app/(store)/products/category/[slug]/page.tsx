// src/app/(store)/products/category/[slug]/page.tsx

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductGrid } from '@/components/Products/ProductGrid';
import { CategoryHeader } from '@/components/Products/CategoryHeader';
import { prisma } from '@/lib/prisma'; // Import Prisma client
import { Category, Product as GridProduct } from '@/types/product'; // Use a shared Product type if available
import { Decimal } from '@prisma/client/runtime/library';

// Define product type expected by ProductGrid (Consider consolidating with a global type)
// Using GridProduct imported from @/types/product instead
/*
interface Product {
  id: string; // Changed from _id
  name: string;
  description?: string;
  price: number;
  images?: string[]; // Expects an array of strings (URLs)
  slug: string; // Changed from { current: string }
  featured?: boolean;
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}
*/

// Utility function to normalize image data from database
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

// Define the expected props structure, noting params is a Promise
interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Map frontend slugs to the corresponding database category names
// This might not be necessary if slugs are stored directly in the Category table
/*
const SLUG_TO_CATEGORY_MAP: Record<string, string> = {
  'alfajores': 'Desserts',
  'desserts': 'Desserts',
  'empanadas': 'Appetizers',
  'catering': 'Catering',
};
*/

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  alfajores: "Indulge in the delicate delight of our signature Alfajores. These classic South American butter cookies boast a tender, crumbly texture, lovingly filled with creamy dulce de leche. Explore a variety of tempting flavors, from traditional favorites to unique seasonal creations – the perfect sweet treat for yourself or a thoughtful gift.",
  empanadas: "Discover our authentic, hand-folded empanadas, flash-frozen to preserve their freshness and flavor. Each 4-pack features golden, flaky pastry enveloping savory fillings inspired by Latin American culinary traditions. From the aromatic Huacatay Chicken to hearty Argentine Beef, these easy-to-prepare delights bring restaurant-quality taste to your home in minutes."
};

export default async function CategoryPage({ params: paramsPromise }: CategoryPageProps) {
  // Await the params promise to get the actual params object
  const params = await paramsPromise;
  const slug = params.slug;

  // Fetch the category from the database using the slug
  const category = await prisma.category.findUnique({
    where: {
      // Assuming the category table has a unique 'slug' field
      // If not, adjust the query (e.g., findFirst where name matches slug mapping)
      slug: slug, 
    },
  });

  // If the category doesn't exist in the database, return 404
  if (!category) {
    console.log(`Category not found for slug: "${slug}"`);
    notFound();
  }

  // Fetch products associated with this category from the database
  let products: GridProduct[] = [];
  try {
    const dbProducts = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        active: true // Only fetch active products
      },
      include: {
        variants: true // Include variants if needed by ProductGrid
      },
      orderBy: {
        // Optional: Add sorting, e.g., by name or a custom order field
        name: 'asc' 
      }
    });

    // Map database products to the GridProduct interface
    products = dbProducts.map((p): GridProduct => {
      // Parse the images JSON string or handle array
      const imageArray = normalizeImages(p.images);
      
      return {
        id: p.id,
        squareId: p.squareId || '',
        name: p.name,
        description: p.description,
        price: p.price ? Number(p.price) : 0, // Convert Decimal to number
        images: imageArray.length > 0 ? imageArray : ['/images/menu/empanadas.png'], // Provide default
        categoryId: p.categoryId || '',
        category: category, // Attach the fetched category object
        slug: p.slug || p.id, // Use product slug or ID if slug is missing
        featured: p.featured || false,
        active: p.active,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        variants: p.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price ? Number(v.price) : null, // Convert Decimal or keep null
          squareVariantId: v.squareVariantId,
          productId: p.id,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        }))
      };
    });

  } catch (error) {
    console.error(
      `Failed to fetch products for category ${category.name} (ID: ${category.id}):`,
      error
    );
    // Optionally display an error message on the page or return 500
    // For now, we'll proceed with an empty products array
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 bg-white">
        {/* Use the fetched category data */}
        <CategoryHeader 
          title={category.name}
          description={category.description || CATEGORY_DESCRIPTIONS[slug] || ''} // Use DB description or fallback
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
                  title={`${category.name} Products`}
                  showFilters={true}
                />
              </div>
            ) : (
              <div className="text-center py-16 my-12 bg-gray-50 rounded-2xl">
                <h2 className="text-2xl font-medium mb-3">No Products Available</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  We don&apos;t have any products in the {category.name} category yet.
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
      </main>
    </div>
  );
}

/**
 * Generates static paths for category pages based on database entries.
 * Assumes the Category model has a unique 'slug' field.
 */
export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        slug: true, // Select only the slug field
      },
      where: {
        // Optional: Only generate pages for categories that have active products
        // products: {
        //   some: { active: true }
        // }
        slug: { not: null } // Ensure slug is not null
      }
    });

    // Filter out any null slugs just in case and map to the expected format
    return categories
      .filter(category => category.slug)
      .map(category => ({
        slug: category.slug!,
      }));
      
  } catch (error) {
    console.error("Failed to generate static params for category pages:", error);
    // Return an empty array in case of error to prevent build failure
    // Or handle the error more gracefully depending on requirements
    return [];
  }
}