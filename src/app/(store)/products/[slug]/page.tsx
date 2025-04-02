// src/app/(store)/products/[slug]/page.tsx

import { getProductBySlug } from '@/lib/sanity-products';
import { prisma } from '@/lib/prisma';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductDetails from '@/components/Products/ProductDetails';

// Define a type for Sanity variants
interface SanityVariant {
  _id?: string;
  id?: string;
  name: string;
  price?: number | null;
  squareVariantId?: string;
}

// PageProps interface that aligns with your project's constraints
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: PageProps) {
  // Await the params to get the slug
  const { slug } = await params;

  // Fetch product from Sanity
  const sanityProduct = await getProductBySlug(slug);

  // Fetch product from DB using the product name from Sanity
  const dbProduct = sanityProduct ? await prisma.product.findFirst({
    where: { 
      name: sanityProduct.name,
      active: true
    },
    include: {
      variants: true,
      category: true,
    },
  }) : null;

  if (!sanityProduct && !dbProduct) {
    // Handle product not found, maybe return a 404 component or redirect
    // For now, let's just return a simple message
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <p>Could not find product with slug: {slug}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Combine product data (prioritize Sanity, supplement with DB)
  // Adapt this logic based on how you want to merge data
  const product = {
    ...(sanityProduct || {}),
    id: dbProduct?.id || String(slug),
    squareId: dbProduct?.squareId || String(slug),
    // Add/override fields from dbProduct if available
    price: dbProduct?.price ? Number(dbProduct.price) : (sanityProduct?.price || 0),
    variants: dbProduct?.variants?.map(variant => ({
      ...variant,
      id: String(variant.id),
      price: variant.price ? Number(variant.price) : null,
    })) || (sanityProduct?.variants as SanityVariant[] || []).map(variant => ({
      id: String(variant._id || variant.id),
      name: variant.name,
      price: variant.price ? Number(variant.price) : null,
      squareVariantId: variant.squareVariantId,
      productId: dbProduct?.id || String(slug),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    active: dbProduct?.active ?? true,
    // Ensure essential fields like name, images are present
    name: sanityProduct?.name || dbProduct?.name || 'Unnamed Product',
    images: sanityProduct?.images || dbProduct?.images || [],
    description: sanityProduct?.description || dbProduct?.description,
    featured: sanityProduct?.featured || dbProduct?.featured || false,
    categoryId: sanityProduct?.categoryId || dbProduct?.categoryId || '',
    category: dbProduct?.category || {
      id: typeof sanityProduct?.category === 'object' && sanityProduct.category?._id ? sanityProduct.category._id : '',
      name: typeof sanityProduct?.category === 'string' ? sanityProduct.category : sanityProduct?.category?.name || '',
      description: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    createdAt: dbProduct?.createdAt || new Date(),
    updatedAt: dbProduct?.updatedAt || new Date(),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Render Product Details */}
           <ProductDetails product={product} />
        </div>
      </main>
      <Footer />
    </div>
  );
}