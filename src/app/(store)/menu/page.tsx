import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getAllCategories, getProductsByCategory } from '@/lib/sanity-products';
import { ProductGrid } from '@/components/store/ProductGrid';
import { CategoryTabs } from '@/components/store/CategoryTabs';

export default async function MenuPage({
  searchParams
}: {
  searchParams: { category?: string }
}) {
  // Fetch all product categories
  const categories = await getAllCategories();
  
  if (categories.length === 0) {
    return notFound();
  }
  
  // Determine selected category (use first category if none specified)
  const selectedCategoryId = searchParams.category || categories[0]._id;
  const selectedCategory = categories.find(c => c._id === selectedCategoryId);
  
  if (!selectedCategory) {
    return notFound();
  }
  
  // Fetch products for the selected category
  const products = await getProductsByCategory(selectedCategoryId);
  
  return (
    <main className="bg-white py-8">
      <div className="container mx-auto px-4">
        <h1 className="mb-8 text-center text-4xl font-bold">Our Menu</h1>
        
        {/* Category Tabs */}
        <CategoryTabs 
          categories={categories} 
          selectedCategoryId={selectedCategoryId} 
        />
        
        {/* Products Grid */}
        <div className="mt-8">
          <h2 className="mb-6 text-2xl font-semibold">{selectedCategory.name}</h2>
          <Suspense fallback={<div className="text-center">Loading products...</div>}>
            {products.length > 0 ? (
              <ProductGrid products={products} />
            ) : (
              <p className="py-8 text-center text-gray-500">
                No products available in this category.
              </p>
            )}
          </Suspense>
        </div>
      </div>
    </main>
  );
}
