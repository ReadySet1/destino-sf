import { getProductBySlug } from '@/lib/sanity-products';
import { prisma } from '@/lib/prisma';
import ProductDetails from '@/components/Products/ProductDetails';
import CategoryHeader from '@/components/Products/CategoryHeader';
import { Decimal } from '@prisma/client/runtime/library';
import { Product, Variant } from '@/types/product';

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
  const dbProduct = sanityProduct
    ? await prisma.product.findFirst({
        where: {
          name: sanityProduct.name,
          active: true,
        },
        include: {
          variants: true,
          category: true,
        },
      })
    : null;

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
    images: ((): string[] => {
      if (sanityProduct?.images) {
        return sanityProduct.images.map((image: any) => image.url);
      }
      return dbProduct?.images || [];
    })(),
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

  return (
    <div className="min-h-screen flex flex-col">
      <CategoryHeader 
        title="Details"
        type="products"
      >
        <div className="py-8">
          <div className="max-w-4xl mx-auto">
            <ProductDetails product={product} />
          </div>
        </div>
      </CategoryHeader>
    </div>
  );
}
