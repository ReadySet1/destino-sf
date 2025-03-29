'use client';

import { ProductCard } from './ProductCard';
import { useCart } from '@/store/cart';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  slug: { current: string };
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const { addItem } = useCart();
  
  const handleAddToCart = (product: Product) => {
    addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]
    });
  };
  
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard 
          key={product._id} 
          product={product} 
          onAddToCart={() => handleAddToCart(product)} 
        />
      ))}
    </div>
  );
}
