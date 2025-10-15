import { prisma } from '@/lib/db';
import ProductDetails from '@/components/products/ProductDetails';
import CategoryHeader from '@/components/products/CategoryHeader';
import { Decimal } from '@prisma/client/runtime/library';
import { Product, Variant } from '@/types/product';
import { redirect, notFound } from 'next/navigation';
import { Metadata } from 'next';
import { generateSEO } from '@/lib/seo';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityEngine } from '@/lib/availability/engine';

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
      return [];
    } catch (e) {
      return [];
    }
  }

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
    // Basic UUID check
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

    // Fetch product for metadata
    const dbProduct = await prisma.product.findFirst({
      where: {
        OR: [{ slug: slug }, ...(isUUID ? [{ id: slug }] : [])],
        active: true,
      },
      include: {
        category: true,
      },
    });

    if (!dbProduct) {
      return generateSEO({
        title: 'Product Not Found | Destino SF',
        description: 'The requested product could not be found.',
        type: 'website',
        url: `/products/${slug}`,
      });
    }

    const productImage =
      dbProduct.images && dbProduct.images.length > 0
        ? Array.isArray(dbProduct.images)
          ? dbProduct.images[0]
          : dbProduct.images
        : '/opengraph-image';

    return generateSEO({
      title: `${dbProduct.name} | Destino SF`,
      description:
        dbProduct.description ||
        `Discover our delicious ${dbProduct.name}. Handcrafted with authentic flavors and premium ingredients.`,
      keywords: [
        dbProduct.name.toLowerCase(),
        dbProduct.category?.name.toLowerCase() || 'food',
        'empanadas',
        'alfajores',
        'latin food',
        'san francisco',
        'handcrafted',
        'authentic',
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
    return generateSEO({
      title: 'Product | Destino SF',
      description: 'Discover our handcrafted empanadas and alfajores made with authentic flavors.',
      type: 'product',
      url: `/products/${slug}`,
    });
  }
}

export default async function ProductPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    slug
  );

  // Fetch product from database
  const dbProduct = await prisma.product.findFirst({
    where: {
      OR: [{ slug: slug }, ...(isUUID ? [{ id: slug }] : [])],
      active: true,
    },
    include: {
      variants: true,
      category: true,
    },
  });

  // Redirect to SEO-friendly slug if accessed by ID
  if (dbProduct && isUUID && slug === dbProduct.id) {
    const seoFriendlySlug = dbProduct.slug || slugify(dbProduct.name);
    if (seoFriendlySlug !== slug) {
      redirect(`/products/${seoFriendlySlug}`);
    }
  }

  if (!dbProduct) {
    notFound();
  }

  // Evaluate availability rules for this product
  let evaluatedAvailability;
  try {
    const rules = await AvailabilityQueries.getProductRules(dbProduct.id);
    const evaluation = await AvailabilityEngine.evaluateProduct(dbProduct.id, rules);

    // Serialize for JSON (Next.js requirement)
    evaluatedAvailability = {
      currentState: String(evaluation.currentState),
      appliedRulesCount: evaluation.appliedRules.length,
      nextStateChange: evaluation.nextStateChange
        ? {
            date: evaluation.nextStateChange.date.toISOString(),
            newState: String(evaluation.nextStateChange.newState),
          }
        : undefined,
    };
  } catch (error) {
    console.error('[Server] Error evaluating product availability:', error);
    // Continue without evaluation if there's an error
  }

  // Transform dbProduct to match the Product interface
  const product: Product = {
    id: dbProduct.id,
    squareId: dbProduct.squareId || '',
    name: dbProduct.name,
    description: dbProduct.description,
    price: dbProduct.price ? Number(dbProduct.price) : 0,
    images: normalizeImages(dbProduct.images),
    slug: dbProduct.slug || dbProduct.id,
    categoryId: dbProduct.categoryId || '',
    category: dbProduct.category
      ? {
          id: dbProduct.category.id,
          name: dbProduct.category.name,
          description: dbProduct.category.description,
          order: dbProduct.category.order ?? 0,
          active: dbProduct.category.active ?? true,
          createdAt: dbProduct.category.createdAt,
          updatedAt: dbProduct.category.updatedAt,
        }
      : undefined,
    variants: dbProduct.variants.map(
      (variant: PrismaVariant): Variant => ({
        id: variant.id,
        name: variant.name,
        price: variant.price ? Number(variant.price) : null,
        squareVariantId: variant.squareVariantId,
        productId: variant.productId,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
      })
    ),
    featured: dbProduct.featured || false,
    active: dbProduct.active,
    createdAt: dbProduct.createdAt,
    updatedAt: dbProduct.updatedAt,

    // Add product type for badges
    productType: dbProduct.productType,

    // Add availability fields
    isAvailable: dbProduct.isAvailable ?? true,
    isPreorder: dbProduct.isPreorder ?? false,
    visibility: dbProduct.visibility,
    itemState: dbProduct.itemState,
    preorderStartDate: dbProduct.preorderStartDate,
    preorderEndDate: dbProduct.preorderEndDate,
    availabilityStart: dbProduct.availabilityStart,
    availabilityEnd: dbProduct.availabilityEnd,

    // Add evaluated availability from rules
    evaluatedAvailability,
  };

  // Use the transformed product directly
  const validProduct: Product = {
    ...product,
    images: product.images.length > 0 ? product.images : ['/images/menu/empanadas.png'],
  };

  return (
    <div className="min-h-screen bg-destino-orange">
      <CategoryHeader title="Details" type="default" className="bg-destino-charcoal" />
      <div className="py-8 mb-0">
        <div className="max-w-4xl mx-auto px-4">
          <ProductDetails product={validProduct} />
        </div>
      </div>
    </div>
  );
}
