// src/components/Products/ProductCard.tsx

"use client";

import { Product, Variant } from '@/types/product';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Decimal } from "@prisma/client/runtime/library";
import { useCartStore } from "@/store/cart";
import { useCartAlertStore } from "@/components/ui/cart-alert";

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
  const mainImage = product.images?.[0] || '/placeholder-product.png';
  
  const productId = String(product.id ?? '');
  const productUrl = `/products/${productId}`;

  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();

  const handleAddToCart = () => {
    const priceToAdd = typeof displayPrice === 'object' && displayPrice !== null && 'toNumber' in displayPrice 
                         ? displayPrice.toNumber() 
                         : Number(displayPrice);

    addItem({
      id: product.id, 
      name: product.name + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
      price: priceToAdd,
      quantity: 1,
      image: mainImage,
      variantId: selectedVariant?.id,
    });
    
    showAlert(`1 ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ""} has been added to your cart.`);
  };

  return (
    <div className="group flex flex-col h-full border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link href={productUrl}>
        <div className="relative w-full h-64 overflow-hidden bg-gray-200">
          <Image
            src={mainImage}
            alt={product.name}
            width={500}
            height={500}
            className="w-full h-full object-cover object-center group-hover:opacity-75"
            sizes="(max-width: 768px) 100vw, 500px"
            priority={product.featured}
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

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold h-14 line-clamp-2">
          <Link href={productUrl}>{product.name}</Link>
        </h3>
        
        <p className="text-gray-600 mt-1 font-medium">${formatPrice(displayPrice)}</p>
        
        {product.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-grow">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-4">
          {product.variants && product.variants.length > 0 && (
            <div className="mb-4">
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
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            onClick={handleAddToCart}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}