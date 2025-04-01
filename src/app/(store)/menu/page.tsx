import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getAllCategories, getProductsByCategory } from '@/lib/sanity-products';
import { ProductGrid } from '@/components/Store/ProductGrid';
import { CategoryTabs } from '@/components/Store/CategoryTabs';
import { type JSX } from 'react'; // Import JSX type

interface Category {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  slug: { current: string };
}

// Define the shape of the resolved search params
type ResolvedSearchParams = { [key: string]: string | string[] | undefined };

export default async function MenuPage({
  searchParams, // The prop is the Promise
}: {
  searchParams: Promise<ResolvedSearchParams>; // Type as Promise
}): Promise<JSX.Element> { // Explicit return type

  // Await the promise
  const resolvedSearchParams = await searchParams;

  // Fetch all product categories
  const categories = await getAllCategories();

  if (categories.length === 0) {
    console.log("No categories found.");
    notFound();
  }

  // Determine selected category using the RESOLVED params
  const categoryParam = resolvedSearchParams.category;
  const categoryValue = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
  const selectedCategoryId = categoryValue || categories[0]?._id;

  if (!selectedCategoryId) {
     console.error("Could not determine a selected category ID.");
     return (
        <main className="bg-white py-8">
            <div className="container mx-auto px-4">
                <h1 className="mb-8 text-center text-4xl font-bold">Our Menu</h1>
                <p className="text-center text-red-500">Could not determine the category to display.</p>
            </div>
        </main>
     );
  }

  const selectedCategory = categories.find((c: Category) => c._id === selectedCategoryId);

  if (!selectedCategory) {
    console.warn(`Category with ID "${selectedCategoryId}" not found.`);
    notFound();
  }

  let products: Product[] = [];
  try {
      const sanityProducts = await getProductsByCategory(selectedCategoryId);
      products = sanityProducts.map(p => ({
        ...p,
        images: p.images || []
      }));
  } catch (error) {
      console.error(`Failed to fetch products for category ${selectedCategoryId}:`, error);
  }

  return (
    <main className="bg-white py-8">
      <div className="container mx-auto px-4">
        <h1 className="mb-8 text-center text-4xl font-bold">Our Menu</h1>
        <CategoryTabs
          categories={categories}
          selectedCategoryId={selectedCategoryId}
        />
        <div className="mt-8">
          <h2 className="mb-6 text-2xl font-semibold">{selectedCategory.name}</h2>
          <Suspense key={selectedCategoryId} fallback={<div className="text-center">Loading products...</div>}>
            {products.length > 0 ? (
              <ProductGrid 
                products={products} 
              />
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