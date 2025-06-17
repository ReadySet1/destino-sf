// src/app/(store)/products/category/[slug]/page.tsx

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductGrid } from '@/components/Products/ProductGrid';
import { CategoryHeader } from '@/components/Products/CategoryHeader';
import MenuFaqSection from '@/components/FAQ/MenuFaqSection';
import { prisma } from '@/lib/prisma'; // Import Prisma client
import { Category, Product as GridProduct } from '@/types/product'; // Use a shared Product type if available
import { preparePrismaData } from '@/utils/server/serialize-server-data';

// Utility function to normalize image data from database
function normalizeImages(images: any): string[] {
  if (!images) return [];

  // Case 1: Already an array of strings
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
    return images.filter(url => url && url.trim() !== '');
  }

  // Case 2: Array of objects with url property (Sanity format)
  if (
    Array.isArray(images) &&
    images.length > 0 &&
    typeof images[0] === 'object' &&
    images[0] !== null &&
    'url' in images[0]
  ) {
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

// Updated interface to match Next.js 15.3.1 expectations
interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  alfajores:
    'Our alfajores are buttery shortbread cookies filled with rich, velvety dulce de leche — a beloved Latin American treat made the DESTINO way. We offer a variety of flavors including classic, chocolate, gluten-free, lemon, and seasonal specialties. Each cookie is handcrafted in small batches using a family-honored recipe and premium ingredients for that perfect melt-in- your-mouth texture. Whether you are gifting, sharing, or treating yourself, our alfajores bring comfort, flavor, and a touch of tradition to every bite.',
  empanadas:
    'Wholesome, bold, and rooted in Latin American tradition — our empanadas deliver handcrafted comfort in every bite. From our Argentine beef, Caribbean pork, Lomo Saltado, and Salmon, each flavor is inspired by regional flavors and made with carefully selected ingredients. With up to 17 grams of protein, our empanadas are truly protein-packed, making them as healthy as they are delicious. Crafted in small batches, our empanadas are a portable, satisfying option for any time you crave something bold and delicious!',
};

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  // Need to await params now since it's a Promise
  const { slug } = await params;
  // Await searchParams if provided
  if (searchParams) await searchParams;

  // Fetch the category from the database using the slug
  const category = await prisma.category.findUnique({
    where: {
      // Assuming the category table has a unique 'slug' field
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
        active: true, // Only fetch active products
      },
      include: {
        variants: true, // Include variants if needed by ProductGrid
      },
      orderBy: {
        // Optional: Add sorting, e.g., by name or a custom order field
        name: 'asc',
      },
    });

    // Process database products before mapping to GridProduct
    const serializedProducts = await preparePrismaData(dbProducts);

    // Map serialized database products to the GridProduct interface
    products = await Promise.all(
      serializedProducts.map(async (p): Promise<GridProduct> => {
        // Parse the images JSON string or handle array
        const imageArray = normalizeImages(p.images);

        return {
          id: p.id,
          squareId: p.squareId || '',
          name: p.name,
          description: p.description,
          price: p.price || 0, // Already converted to number by preparePrismaData
          images: imageArray.length > 0 ? imageArray : ['/images/menu/empanadas.png'], // Provide default
          categoryId: p.categoryId || '',
          category: await preparePrismaData(category), // Serialize the category object too
          slug: p.slug || p.id, // Use product slug or ID if slug is missing
          featured: p.featured || false,
          active: p.active,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          variants: p.variants.map(v => ({
            id: v.id,
            name: v.name,
            price: v.price || null, // Already converted by preparePrismaData
            squareVariantId: v.squareVariantId,
            productId: p.id,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          })),
        };
      })
    );
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

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <Suspense
            fallback={
              <div className="flex justify-center items-center h-64">
                <div className="animate-pulse text-center w-full">
                  <div className="h-6 w-32 bg-gray-200 rounded mx-auto"></div>
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
                    ))}
                  </div>
                </div>
              </div>
            }
          >
            {products.length > 0 ? (
              <div className="py-6 lg:py-10">
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

        {/* FAQ Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8">
          <MenuFaqSection />
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
        slug: { not: null }, // Ensure slug is not null
      },
    });

    // Filter out any null slugs just in case and map to the expected format
    return categories
      .filter(category => category.slug)
      .map(category => ({
        slug: category.slug!,
      }));
  } catch (error) {
    console.error('Failed to generate static params for category pages:', error);
    // Return an empty array in case of error to prevent build failure
    // Or handle the error more gracefully depending on requirements
    return [];
  }
}
