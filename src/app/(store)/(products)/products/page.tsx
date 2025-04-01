import { prisma } from '@/lib/prisma';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/Products/ProductCard";
import { Category, Product } from '@/types/product';

export default async function ProductsPage() {
  // Fetch products with their variants and categories
  const products = await prisma.product.findMany({
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
            {products.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {products.length === 0 && (
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