// src/app/(store)/products/page.tsx

import { prisma } from '@/lib/prisma';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/Products/ProductCard";
import { Category, Product } from '@/types/product';
import { getAllProducts } from '@/lib/sanity-products';

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
  const dbProductsMap = new Map(
    dbProducts.map((product: Product) => [product.squareId, product])
  );

  // Combine products from both sources
  const combinedProducts = sanityProducts.map(sanityProduct => {
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
      active: dbProduct?.active ?? true,
      createdAt: dbProduct?.createdAt || new Date(),
      updatedAt: dbProduct?.updatedAt || new Date(),
      categoryId: dbProduct?.categoryId || sanityProduct.categoryId || '',
      category: dbProduct?.category,
      featured: dbProduct?.featured ?? sanityProduct.featured ?? false,
    };
  });

  // Fetch categories for filter
  const categories = await prisma.category.findMany({
    orderBy: {
      order: 'asc',
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Our Products</h1>
            <div className="flex gap-4">
              <select 
                className="border rounded-md px-3 py-2"
                defaultValue=""
              >
                <option value="">Sort by</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
              
              <select 
                className="border rounded-md px-3 py-2"
                defaultValue=""
              >
                <option value="">All Categories</option>
                {categories.map((category: Category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {combinedProducts.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {combinedProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
} 