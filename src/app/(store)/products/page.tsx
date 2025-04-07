// src/app/(store)/products/page.tsx

import { prisma } from '@/lib/prisma';
import ProductCard from "@/components/Products/ProductCard";
import { Category, Product } from '@/types/product';
import { getAllProducts, SanityProduct } from '@/lib/sanity-products';

// Type for the transformed Sanity product
type TransformedSanityProduct = Omit<SanityProduct, 'images'> & {
  images: string[];
};

// Type for the combined product from both sources
type CombinedProduct = Omit<Product, 'category' | 'featured'> & {
  category?: Category | string | { _id: string; name: string; slug: { current: string } };
  featured: boolean;
  slug: string;
};

// Type for the accumulator in the reduce function
type ProductCategoryMap = Record<string, CombinedProduct[]>;

export default async function ProductsPage() {
  // Fetch products from both Sanity and database
  const [sanityProducts, dbProducts] = await Promise.all([
    getAllProducts(),
    prisma.product.findMany({
      where: {
        active: true,
      },
      include: {
        variants: true,
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  // Create a map of database products by squareId for easy lookup
  const dbProductsMap = new Map<string, Product>(
    dbProducts.map((product: Product) => [product.squareId, product])
  );

  // Combine products from both sources
  const combinedProducts = sanityProducts.map((sanityProduct: TransformedSanityProduct): CombinedProduct => {
    // Determine the ID, handling potential slug object from Sanity
    let rawId = sanityProduct.slug as string | { current: string };
    if (typeof rawId === 'object' && rawId !== null && 'current' in rawId) {
      rawId = rawId.current;
    }
    const productId = String(rawId || '');
    const dbProduct = dbProductsMap.get(productId);
    
    return {
      ...sanityProduct,
      id: productId,
      slug: productId, // Use the same string ID for slug consistency here
      // Override or add database-specific fields
      price: dbProduct?.price ? Number(dbProduct.price) : sanityProduct.price,
      variants: dbProduct?.variants?.map(variant => ({
        ...variant,
        id: String(variant.id),
        price: variant.price ? Number(variant.price) : null,
      })) || [],
      // Add database-specific fields
      active: dbProduct?.active ?? true,
      createdAt: dbProduct?.createdAt ?? new Date(),
      updatedAt: dbProduct?.updatedAt ?? new Date(),
      categoryId: dbProduct?.categoryId ?? sanityProduct.categoryId ?? '',
      category: dbProduct?.category ?? sanityProduct.category,
      featured: dbProduct?.featured ?? sanityProduct.featured ?? false,
    };
  });

  // Group products by category
  const productsByCategory = combinedProducts.reduce((acc: ProductCategoryMap, product: CombinedProduct) => {
    const categoryName = typeof product.category === 'string' 
      ? product.category 
      : product.category?.name || 'Uncategorized';
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as ProductCategoryMap);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Our Products</h1>
        {Object.entries(productsByCategory).map(([category, products]) => (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as Product} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
} 