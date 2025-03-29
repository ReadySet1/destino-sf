'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  slug: { current: string };
}

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-white shadow-md transition hover:shadow-lg">
      <Link href={`/product/${product.slug.current}`} className="block">
        <div className="aspect-square overflow-hidden">
          {product.images && product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              width={300}
              height={300}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200">
              <span className="text-gray-500">No image</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-medium">{product.name}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {product.description}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
          </div>
        </div>
      </Link>
      <div className="p-4 pt-0">
        <Button 
          onClick={(e) => {
            e.preventDefault();
            onAddToCart();
          }}
          className="w-full"
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
