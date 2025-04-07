// src/app/(store)/products/page.tsx

import { prisma } from '@/lib/prisma';
import ProductCard from "@/components/Products/ProductCard";
import { Category, Product, Variant } from '@/types/product';
import { getAllProducts, SanityProduct } from '@/lib/sanity-products';

// Type for the transformed Sanity product
type TransformedSanityProduct = Omit<SanityProduct, 'images' | 'variants'> & {
  images: string[];
  variants: Variant[];
  id: string;
  squareId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string;
};

// Type for the combined product from both sources
type CombinedProduct = Omit<Product, 'category'> & {
  category?: Category | string | { _id: string; name: string; slug: { current: string } };
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
        category: true,
        variants: true,
      },
    }),
  ]);

  // Transform Sanity products to match our database schema
  const transformedSanityProducts: TransformedSanityProduct[] = sanityProducts.map((product: SanityProduct) => ({
    ...product,
    id: product._id,
    squareId: product.squareId || '',
    images: product.images.map(img => img.url),
    variants: product.variants?.map((variant: any) => ({
      id: variant._id || '',
      name: variant.name || '',
      price: variant.price || null,
      squareVariantId: variant.squareVariantId || null,
      productId: product._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) || [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryId: product.categoryId || '',
  }));

  // Combine products from both sources
  const allProducts: CombinedProduct[] = [
    ...transformedSanityProducts.map((product) => ({
      ...product,
      category: product.category,
      featured: product.featured || false,
    })),
    ...dbProducts.map((product) => ({
      ...product,
      category: product.category,
      featured: product.featured || false,
    })),
  ];

  // Group products by category
  const productsByCategory: ProductCategoryMap = allProducts.reduce((acc, product) => {
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