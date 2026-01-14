// src/app/(store)/products/category/[slug]/page.tsx

import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ProductGrid } from '@/components/products/ProductGrid';
import { CategoryHeader } from '@/components/products/CategoryHeader';
import MenuFaqSection from '@/components/FAQ/MenuFaqSection';
import { prisma, withRetry, withServerComponentDb, warmConnection } from '@/lib/db-unified'; // Import unified Prisma client
import { withDatabaseConnection } from '@/lib/db-utils';
import { Category, Product as GridProduct } from '@/types/product'; // Use a shared Product type if available
import { preparePrismaData } from '@/utils/server/serialize-server-data';
import { ProductVisibilityService } from '@/lib/services/product-visibility-service';
import { Metadata } from 'next';
import { generateSEO } from '@/lib/seo';
import { safeBuildTimeStaticParams, isBuildTime } from '@/lib/build-time-utils';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import {
  CATEGORY_DESCRIPTIONS,
  FALLBACK_CATEGORIES,
  FallbackCategory,
  isFallbackCategory,
  getFallbackCategory,
  getFallbackUserMessage,
  getEmptyStateMessage,
} from '@/lib/category-fallback';

// Helper function to convert category name to URL-friendly slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

// Utility function to normalize image data from database
function normalizeImages(images: unknown): string[] {
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

// Category descriptions and fallback data are imported from @/lib/category-fallback

// Generate dynamic metadata for category pages
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Check if the slug is a UUID
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

    // Fetch the category from the database with build-time detection
    let category = null;

    if (!isBuildTime()) {
      try {
        category = await withRetry(
          async () => {
            return await prisma.category.findFirst({
              where: {
                OR: [{ slug: slug }, ...(isUUID ? [{ id: slug }] : [])],
                active: true,
              },
            });
          },
          3,
          'generateMetadata-category-fetch'
        );
      } catch (error) {
        console.error('Error fetching category for metadata:', error);
        // Continue with null category to use fallback logic
      }
    }

    if (!category) {
      // Use default metadata based on slug for known categories
      const knownCategories = {
        alfajores: {
          name: 'Alfajores',
          description: CATEGORY_DESCRIPTIONS.alfajores,
        },
        empanadas: {
          name: 'Empanadas',
          description: CATEGORY_DESCRIPTIONS.empanadas,
        },
        catering: {
          name: 'Catering',
          description: 'Professional catering services for your special events.',
        },
      };

      const fallbackCategory = knownCategories[slug as keyof typeof knownCategories];

      if (!fallbackCategory) {
        return generateSEO({
          title: 'Category Not Found | Destino SF',
          description: 'The requested category could not be found.',
          type: 'website',
          url: `/products/category/${slug}`,
        });
      }

      // Use fallback data for known categories
      return generateSEO({
        title: `${fallbackCategory.name} | Destino SF`,
        description: fallbackCategory.description,
        type: 'website',
        url: `/products/category/${slug}`,
      });
    }

    // Get the category-specific description and title
    const categoryDescription =
      CATEGORY_DESCRIPTIONS[slug] ||
      category.description ||
      `Discover our delicious ${category.name} collection.`;
    const categoryTitle =
      slug === 'alfajores'
        ? 'Alfajores - Traditional Latin Cookies'
        : slug === 'empanadas'
          ? 'Empanadas - Handcrafted Latin Pastries'
          : category.name;

    return generateSEO({
      title: `${categoryTitle} | Destino SF`,
      description: categoryDescription,
      keywords: [
        category.name.toLowerCase(),
        slug,
        'authentic',
        'handcrafted',
        'latin food',
        'san francisco',
        'traditional',
        'premium ingredients',
      ],
      type: 'website',
      url: `/products/category/${slug}`,
      category: category.name,
    });
  } catch (error) {
    console.error('Error generating category metadata:', error);

    return generateSEO({
      title: `${slug} | Destino SF`,
      description: 'Discover our handcrafted Latin cuisine collection.',
      type: 'website',
      url: `/products/category/${slug}`,
    });
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  // Need to await params now since it's a Promise
  const { slug } = await params;
  // Await searchParams if provided
  if (searchParams) await searchParams;

  // Pre-warm the database connection early for cold start optimization
  // This runs in parallel with other initialization
  const warmupPromise = warmConnection();

  // Check if the slug is a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    slug
  );

  // Wait for warmup to complete before querying
  await warmupPromise;

  // Track if we're using fallback data
  let usingFallback = false;

  // Fetch the category from the database using the slug or ID
  let category = await withServerComponentDb(
    async () => {
      return await prisma.category.findFirst({
        where: {
          OR: [{ slug: slug }, ...(isUUID ? [{ id: slug }] : [])],
          active: true,
        },
      });
    },
    { operationName: 'category-page-fetch', warmup: false } // Already warmed up
  ).catch(error => {
    // Log the error for monitoring
    console.error('[CategoryPage] Database error, checking fallback:', {
      slug,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });

    // Check if we have fallback data for this category
    const fallbackCategory = FALLBACK_CATEGORIES[slug.toLowerCase()];
    if (fallbackCategory) {
      console.warn(`[CategoryPage] Using fallback data for category: ${slug}`);
      usingFallback = true;
      return fallbackCategory;
    }

    // Re-throw for unknown categories
    throw error;
  });

  // If the category doesn't exist in the database and no fallback, return 404
  if (!category) {
    // Try fallback one more time for slug-based lookup
    const fallbackCategory = FALLBACK_CATEGORIES[slug.toLowerCase()];
    if (fallbackCategory) {
      console.warn(`[CategoryPage] Category not found in DB, using fallback: ${slug}`);
      category = fallbackCategory;
      usingFallback = true;
    } else {
      notFound();
    }
  }

  // Redirect to SEO-friendly slug if accessed by ID
  if (isUUID && slug === category.id) {
    const seoFriendlySlug = category.slug || slugify(category.name);
    if (seoFriendlySlug !== slug) {
      redirect(`/products/category/${seoFriendlySlug}`);
    }
  }

  // Fetch products associated with this category using ProductVisibilityService
  // Skip product fetching if using fallback category data (DB is unavailable)
  let products: GridProduct[] = [];
  if (!usingFallback && !isFallbackCategory(category)) {
    try {
      const result = await ProductVisibilityService.getProductsByCategory(category.id, {
        onlyActive: true, // Only fetch active products for customer-facing view
        excludeCatering: true, // Exclude catering from category pages
        includeAvailabilityEvaluation: true, // Include availability evaluation
        includeVariants: true, // Include variants for product display
        orderBy: 'ordinal', // Order by admin-controlled ordinal
        orderDirection: 'asc',
      });

      // Map ProductVisibilityService results to GridProduct interface
      products = await Promise.all(
        result.products.map(async (p): Promise<GridProduct> => {
          // Parse the images JSON string or handle array
          const imageArray = normalizeImages(p.images);

          return {
            id: p.id,
            squareId: p.squareId || '',
            name: p.name,
            description: p.description,
            price: p.price || 0,
            images: imageArray.length > 0 ? imageArray : ['/images/menu/empanadas.png'], // Provide default
            categoryId: p.categoryId || '',
            category: await preparePrismaData(category), // Serialize the category object
            slug: p.slug || p.id, // Use product slug or ID if slug is missing
            featured: p.featured || false,
            active: p.active,
            createdAt: new Date(), // Will be set by the service
            updatedAt: new Date(), // Will be set by the service
            variants:
              p.variants?.map(v => ({
                id: v.id,
                name: v.name,
                price: v.price || null,
                squareVariantId: v.squareVariantId,
                productId: p.id,
                createdAt: new Date(),
                updatedAt: new Date(),
              })) || [],

            // Add availability fields from the service
            isAvailable: p.isAvailable,
            isPreorder: p.isPreorder,
            visibility: p.visibility,
            itemState: p.itemState,
            // Add evaluated availability if present
            ...(p.evaluatedAvailability && {
              evaluatedAvailability: p.evaluatedAvailability,
            }),
          };
        })
      );
    } catch (error) {
      console.error(
        `Failed to fetch products for category ${category.name} (ID: ${category.id}) via ProductVisibilityService:`,
        error
      );
      // Proceed with empty products array - page will show "No Products Available"
    }
  } else if (usingFallback) {
    console.warn(`[CategoryPage] Skipping product fetch - using fallback data for ${slug}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 bg-white">
        {/* Use the fetched category data */}
        <CategoryHeader
          title={
            slug === 'alfajores'
              ? 'OUR ALFAJORES'
              : slug === 'empanadas'
                ? 'OUR EMPANADAS'
                : category.name
          }
          description={
            slug === 'alfajores' || slug === 'empanadas'
              ? CATEGORY_DESCRIPTIONS[slug]
              : category.description || CATEGORY_DESCRIPTIONS[slug] || ''
          } // Use custom description for alfajores and empanadas
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          {/* Breadcrumb Navigation */}
          <div className="pt-6">
            <Breadcrumbs
              items={[{ name: 'Products', href: '/products' }]}
              currentPage={category.name}
            />
          </div>
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
            {/* Show notice when using fallback data */}
            {usingFallback && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm text-center">
                  {getFallbackUserMessage()}
                </p>
              </div>
            )}
            {products.length > 0 ? (
              <div className="py-6 lg:py-10">
                <ProductGrid
                  products={products}
                  title={`${slug === 'alfajores' ? 'OUR ALFAJORES' : slug === 'empanadas' ? 'OUR EMPANADAS' : category.name} Products`}
                  showFilters={true}
                />
              </div>
            ) : (
              (() => {
                const emptyState = getEmptyStateMessage(category.name, usingFallback);
                return (
                  <div className="text-center py-16 my-12 bg-gray-50 rounded-2xl">
                    <h2 className="text-2xl font-medium mb-3">
                      {emptyState.title}
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      {emptyState.description}
                    </p>
                    <Link
                      href="/products"
                      className="inline-block px-8 py-3 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      View All Products
                    </Link>
                  </div>
                );
              })()
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
 * Generates static paths for category pages.
 * Uses fallback data during build time when database is not accessible.
 */
export async function generateStaticParams() {
  const fallbackCategories = [
    { slug: 'alfajores' },
    { slug: 'empanadas' },
    { slug: 'catering' },
    { slug: 'beverages' },
    { slug: 'desserts' },
    { slug: 'appetizers' },
  ];

  return await safeBuildTimeStaticParams(
    async () => {
      const categories = await prisma.category.findMany({
        select: {
          slug: true, // Select only the slug field
        },
        where: {
          slug: { not: null }, // Ensure slug is not null
        },
      });

      // Filter out any null slugs and map to the expected format
      const validCategories = categories
        .filter(category => category.slug)
        .map(category => ({
          slug: category.slug!,
        }));

      return validCategories.length > 0 ? validCategories : fallbackCategories;
    },
    fallbackCategories,
    'category generateStaticParams'
  );
}
