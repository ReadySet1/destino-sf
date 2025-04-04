// src/components/Products/ProductGrid.tsx

"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "../Store/ProductCard";

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  slug: { current: string };
  featured?: boolean;
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}

interface ProductGridProps {
  products: Product[];
  title?: string;
  showFilters?: boolean;
}

export function ProductGrid({
  products,
  title,
  showFilters = false,
}: ProductGridProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [sortOption, setSortOption] = useState<string>("");

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
      case "price-low":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
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
          {title && <h2 className="text-2xl font-bold">{title}</h2>}

          {showFilters && (
            <div className="flex items-center gap-4">
              <select
                className="border rounded-md px-3 py-2 bg-white text-gray-800"
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-gray-500 text-lg">No products found</p>
        </div>
      )}
    </div>
  );
}
