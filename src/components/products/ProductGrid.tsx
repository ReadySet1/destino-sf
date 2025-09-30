// src/components/Products/ProductGrid.tsx

'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/products/ProductCard';
import { Product } from '@/types/product';

interface ProductGridProps {
  products: Product[];
  title?: string;
  showFilters?: boolean;
}

export function ProductGrid({ products, title, showFilters = false }: ProductGridProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [sortOption, setSortOption] = useState<string>('');

  // Re-initialize filtered products when the products prop changes
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  // Handle sort selection
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value;
    setSortOption(option);

    let sorted = [...products];

    switch (option) {
      case 'price-low':
        sorted.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-high':
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        // Assuming you have a createdAt field or similar
        // If not, this will just use the original order
        sorted = [...products];
        break;
      default:
        // Default to original order
        sorted = [...products];
    }

    setFilteredProducts(sorted);
  };

  return (
    <div className="space-y-6">
      {/* Header with title and filters */}
      {(title || showFilters) && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}

          {showFilters && (
            <div className="flex items-center gap-4">
              <select
                className="border rounded-full px-4 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={sortOption}
                onChange={handleSortChange}
              >
                <option value="">Sort by</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Product grid with consistent spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-6">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && (
        <div className="py-12 text-center bg-gray-50 rounded-2xl">
          <p className="text-gray-600 text-lg">No products found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
