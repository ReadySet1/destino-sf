import { getProductBySlug } from '@/lib/sanity-products';
import { prisma } from '@/lib/prisma';
import ProductDetails from '@/components/Products/ProductDetails';
import CategoryHeader from '@/components/Products/CategoryHeader';
import { Decimal } from '@prisma/client/runtime/library';
import { Product, Variant } from '@/types/product';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import FoodLoader from '@/components/ui/FoodLoader';

// Helper function to convert product name to URL-friendly slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .trim();
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
      // First check if it's a direct URL
      if (images.startsWith('http')) {
        return [images];
      }
      
      // Try parsing as JSON
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

// Define a type for Sanity variants
interface SanityVariant {
  _id?: string;
  id?: string;
  name: string;
  price?: number | null;
  squareVariantId?: string;
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

export default async function ProductPage({ params }: PageProps) {
  // Await the params Promise to get the actual values
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  // First try to fetch from database using ID (UUID)
  let dbProduct = await prisma.product.findFirst({
    where: {
      OR: [
        { id: slug },  // Try matching by ID first
        { name: slug } // Then try by name
      ],
      active: true,
    },
    include: {
      variants: true,
      category: true,
    },
  });
  
  // If found by ID, redirect to the SEO-friendly URL
  if (dbProduct && slug === dbProduct.id) {
    const seoFriendlySlug = slugify(dbProduct.name);
    redirect(`/products/${seoFriendlySlug}`);
  }
  
  // If found in DB, fetch corresponding Sanity product by name
  let sanityProduct = null;
  if (dbProduct) {
    sanityProduct = await getProductBySlug(dbProduct.name);
  } else {
    // If not found by ID, try Sanity directly with the slug
    sanityProduct = await getProductBySlug(slug);
    if (sanityProduct) {
      // If found in Sanity, try to find corresponding DB product
      dbProduct = await prisma.product.findFirst({
        where: {
          name: sanityProduct.name,
          active: true,
        },
        include: {
          variants: true,
          category: true,
        },
      });
    }
  }
  
  if (!sanityProduct && !dbProduct) {
    // Handle product not found, maybe return a 404 component or redirect
    // For now, let's just return a simple message
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <p>Could not find product with slug: {slug}</p>
          </div>
        </main>
      </div>
    );
  }
  
  // Combine product data (prioritize Sanity, supplement with DB)
  // Transform to match the Product interface
  const product: Product = {
    ...(sanityProduct || {}),
    id: dbProduct?.id || String(slug),
    squareId: dbProduct?.squareId || String(slug),
    // Add/override fields from dbProduct if available
    price: dbProduct?.price ? Number(dbProduct.price) : sanityProduct?.price || 0,
    variants:
      dbProduct?.variants?.map(
        (variant: PrismaVariant): Variant => ({
          id: variant.id,
          name: variant.name,
          price: variant.price ? Number(variant.price) : null,
          squareVariantId: variant.squareVariantId,
          productId: variant.productId,
          createdAt: variant.createdAt,
          updatedAt: variant.updatedAt,
        })
      ) ||
      ((sanityProduct?.variants as SanityVariant[]) || []).map(
        (variant: SanityVariant): Variant => ({
          id: String(variant._id || variant.id || ''),
          name: variant.name,
          price: variant.price || null,
          squareVariantId: variant.squareVariantId || null,
          productId: dbProduct?.id || String(slug),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    active: dbProduct?.active ?? true,
    // Ensure essential fields like name, images are present
    name: sanityProduct?.name || dbProduct?.name || 'Unnamed Product',
    images: normalizeImages(dbProduct?.images || (sanityProduct?.images || [])),
    description: sanityProduct?.description || dbProduct?.description,
    featured: sanityProduct?.featured || dbProduct?.featured || false,
    categoryId: sanityProduct?.categoryId || dbProduct?.categoryId || '',
    category: dbProduct?.category || {
      id:
        typeof sanityProduct?.category === 'object' && sanityProduct.category?._id
          ? sanityProduct.category._id
          : '',
      name:
        typeof sanityProduct?.category === 'string'
          ? sanityProduct.category
          : sanityProduct?.category?.name || '',
      description: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    createdAt: dbProduct?.createdAt || new Date(),
    updatedAt: dbProduct?.updatedAt || new Date(),
  };
  
  // Ensure we have a valid Product object that matches the expected interface
  const validProduct: Product = {
    id: product.id || '',
    squareId: product.squareId || '',
    name: product.name || 'Unnamed Product',
    description: product.description || '',
    price: product.price || 0,
    images: product.images && product.images.length > 0 
      ? product.images 
      : ['/images/menu/empanadas.png'],
    categoryId: product.categoryId || '',
    category: product.category || undefined,
    variants: Array.isArray(product.variants) ? product.variants : [],
    featured: product.featured || false,
    active: product.active || false,
    createdAt: product.createdAt || new Date(),
    updatedAt: product.updatedAt || new Date(),
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <CategoryHeader 
        title="Details"
        type="products"
      >
        <div className="py-8">
          <div className="max-w-4xl mx-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <FoodLoader text="Preparing product details..." size="medium" />
              </div>
            }>
              <ProductDetails product={validProduct} />
            </Suspense>
          </div>
        </div>
      </CategoryHeader>
    </div>
  );
}