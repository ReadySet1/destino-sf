"use client";

import { Product, Variant } from '@/types/product';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Decimal } from "@prisma/client/runtime/library";

interface ProductCardProps {
  product: Product;
}

// Helper function to safely format prices
const formatPrice = (price: number | Decimal | null | undefined): string => {
  if (price === null || price === undefined) return "0.00";
  // If it's a Decimal object from Prisma
  if (typeof price === 'object' && price !== null && 'toFixed' in price) {
    return price.toFixed(2);
  }
  // If it's a regular number
  return Number(price).toFixed(2);
};

export default function ProductCard({ product }: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );

  const displayPrice = selectedVariant?.price || product.price;
  const mainImage = product.images[0] || '/placeholder-product.png';

  return (
    <div className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
          <Image
            src={mainImage}
            alt={product.name}
            width={500}
            height={500}
            className="h-full w-full object-cover object-center group-hover:opacity-75"
          />
          {product.featured && (
            <div className="absolute top-2 right-2">
              <span className="bg-indigo-600 text-white px-2 py-1 text-xs font-semibold rounded">
                Featured
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <h3 className="text-lg font-semibold">
          <Link href={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        
        <p className="text-gray-600 mt-1">${formatPrice(displayPrice)}</p>
        
        {product.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            {product.description}
          </p>
        )}

        {product.variants && product.variants.length > 0 && (
          <div className="mt-3">
            <select
              className="w-full border rounded-md py-1.5 px-2 text-sm"
              value={selectedVariant?.id || ''}
              onChange={(e) => {
                const variant = product.variants?.find(v => v.id === e.target.value);
                setSelectedVariant(variant || null);
              }}
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} - ${formatPrice(variant.price) || formatPrice(product.price)}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
          onClick={() => {
            // TODO: Implement add to cart functionality
            console.log('Add to cart:', product.id, selectedVariant?.id);
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
} 