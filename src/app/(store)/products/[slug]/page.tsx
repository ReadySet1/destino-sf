import { prisma } from '@/lib/db';
import ProductDetails from '@/components/Products/ProductDetails';
import CategoryHeader from '@/components/Products/CategoryHeader';
import { Decimal } from '@prisma/client/runtime/library';
import { Product, Variant } from '@/types/product';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { generateSEO } from '@/lib/seo';

// Helper function to convert product name to URL-friendly slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

// Utility function to normalize image data from database
// Adjusted to primarily handle string arrays or JSON strings
function normalizeImages(images: any): string[] {
  if (!images) return [];

  // Case 1: Already an array of strings
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
    return images.filter(url => url && url.trim() !== '');
  }

  // Case 2: String that might be a JSON array
  if (typeof images === 'string') {
    try {
      // First check if it's a direct URL
      if (images.startsWith('http')) {
        return [images];
      }

      // Try parsing as JSON
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter(url => url && typeof url === 'string');
      }
      // If not a JSON array, and not a URL, maybe it's a malformed single entry?
      // Or just return empty if parsing fails and it's not a URL.
      return [];
    } catch (e) {
      // If not valid JSON and not a direct URL, return empty
      return [];
    }
  }

  // Add handling for other potential DB formats if necessary
  // For now, return empty array if format is unrecognized
  return [];
}

// Define a type for DB variants that matches the Prisma model
interface PrismaVariant {
  id: string;
  name: string;
  price: Decimal | null;
  squareVariantId: string | null;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// Generate dynamic metadata for product pages
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  try {
    // Basic UUID check (adjust regex if using different UUID format)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

    // Fetch product for metadata
    const dbProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: slug },
          ...(isUUID ? [{ id: slug }] : []),
        ],
        active: true,
      },
      include: {
        category: true,
      },
    });

    if (!dbProduct) {
      // Return default metadata if product not found
      return generateSEO({
        title: 'Product Not Found | Destino SF',
        description: 'The requested product could not be found.',
        type: 'website',
        url: `/products/${slug}`,
      });
    }

    // Get the primary product image
    const productImage = dbProduct.images && dbProduct.images.length > 0 
      ? Array.isArray(dbProduct.images) 
        ? dbProduct.images[0] 
        : dbProduct.images
      : '/opengraph-image';

    // Generate product-specific metadata
    return generateSEO({
      title: `${dbProduct.name} | Destino SF`,
      description: dbProduct.description || `Discover our delicious ${dbProduct.name}. Handcrafted with authentic flavors and premium ingredients.`,
      keywords: [
        dbProduct.name.toLowerCase(),
        dbProduct.category?.name.toLowerCase() || 'food',
        'empanadas',
        'alfajores',
        'latin food',
        'san francisco',
        'handcrafted',
        'authentic'
      ],
      type: 'product',
      image: productImage,
      imageAlt: `${dbProduct.name} - Destino SF`,
      url: `/products/${slug}`,
      price: dbProduct.price ? dbProduct.price.toString() : undefined,
      availability: 'in_stock',
      category: dbProduct.category?.name,
    });

  } catch (error) {
    console.error('Error generating product metadata:', error);
    
    // Return fallback metadata
    return generateSEO({
      title: 'Product | Destino SF',
      description: 'Discover our handcrafted empanadas and alfajores made with authentic flavors.',
      type: 'product',
      url: `/products/${slug}`,
    });
  }
}

export default async function ProductPage({ params }: PageProps) {
  // Await the params Promise to get the actual values
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Basic UUID check (adjust regex if using different UUID format)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    slug
  );

  // Fetch from database using slug or id (if it's a UUID)
  const dbProduct = await prisma.product.findFirst({
    where: {
      OR: [
        { slug: slug }, // Try matching by slug field
        ...(isUUID ? [{ id: slug }] : []), // Conditionally add ID match if slug is a UUID
      ],
      active: true, // Only fetch active products
    },
    include: {
      variants: true,
      category: true,
    },
  });

  // If found by ID but the slug doesn't match the product's actual slug, redirect
  if (dbProduct && isUUID && slug === dbProduct.id) {
    const seoFriendlySlug = dbProduct.slug || slugify(dbProduct.name); // Use existing slug or generate one
    // Check if redirection is actually needed
    if (seoFriendlySlug !== slug) {
      console.log(`Redirecting from ID-based slug "${slug}" to SEO slug "${seoFriendlySlug}"`);
      redirect(`/products/${seoFriendlySlug}`);
    }
  }

  // If product is not found in the database by either name or ID
  if (!dbProduct) {
    console.log(`Product not found for slug: "${slug}"`);
    notFound(); // Use Next.js notFound function
  }

  // Transform dbProduct to match the Product interface
  const product: Product = {
    id: dbProduct.id,
    squareId: dbProduct.squareId || '', // Provide default empty string if null
    name: dbProduct.name,
    description: dbProduct.description,
    price: dbProduct.price ? Number(dbProduct.price) : 0, // Convert Decimal to number
    images: normalizeImages(dbProduct.images), // Use the updated normalizeImages
    slug: dbProduct.slug || dbProduct.id, // Add the missing slug field
    categoryId: dbProduct.categoryId || '', // Provide default empty string if null
    category: dbProduct.category
      ? {
          // Map Prisma category to Product category type
          id: dbProduct.category.id,
          name: dbProduct.category.name,
          description: dbProduct.category.description,
          order: dbProduct.category.order ?? 0, // Handle potential null order
          createdAt: dbProduct.category.createdAt,
          updatedAt: dbProduct.category.updatedAt,
        }
      : undefined, // Set to undefined if no category linked
    variants: dbProduct.variants.map(
      (variant: PrismaVariant): Variant => ({
        id: variant.id,
        name: variant.name,
        price: variant.price ? Number(variant.price) : null, // Convert Decimal to number or keep null
        squareVariantId: variant.squareVariantId,
        productId: variant.productId,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
      })
    ),
    featured: dbProduct.featured || false, // Default to false if null/undefined
    active: dbProduct.active, // Should always be true based on query, but include it
    createdAt: dbProduct.createdAt,
    updatedAt: dbProduct.updatedAt,
  };

  // Use the transformed product directly
  const validProduct: Product = {
    ...product,
    // Provide a default image if images array is empty after normalization
    images: product.images.length > 0 ? product.images : ['/images/menu/empanadas.png'],
  };

  return (
    <div className="min-h-screen bg-destino-orange">
      <CategoryHeader 
        title="Details"
        type="default"
        className="bg-destino-charcoal"
      />
      <div className="py-8 mb-0">
        <div className="max-w-4xl mx-auto px-4">
          <ProductDetails product={validProduct} />
        </div>
      </div>
    </div>
  );
}
