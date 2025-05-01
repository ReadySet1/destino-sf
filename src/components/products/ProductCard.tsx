// src/components/Products/ProductCard.tsx

"use client";

import { Product, Variant } from '@/types/product';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCartStore } from "@/store/cart";
import { useCartAlertStore } from "@/components/ui/cart-alert";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

// Helper function to safely format prices
const formatPrice = (price: number | null | undefined): string => {
  // Price should arrive as a number (or null/undefined) after parent transformation
  if (price === null || price === undefined || isNaN(Number(price))) {
     return "0.00";
  }
  // Price is a valid number
  return Number(price).toFixed(2);
};

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );

  const displayPrice = selectedVariant?.price || product.price;
  // Log the calculated displayPrice
  console.log(`[ProductCard] ${product.name} - Selected Variant Price:`, selectedVariant?.price, 'Product Price:', product.price, 'Resulting displayPrice:', displayPrice);
  
  const mainImage = !imageError && product.images?.[0] ? product.images[0] : '/images/menu/empanadas.png';
  
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
      <Link href={productUrl} className="block relative">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className={cn(
              "object-cover object-center transition-all duration-300",
              "group-hover:scale-105 group-hover:opacity-90"
            )}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            priority={product.featured}
            quality={85}
            onError={() => setImageError(true)}
          />
          {product.featured && (
            <div className="absolute top-2 right-2 z-10">
              <span className="bg-indigo-600 text-white px-2 py-1 text-xs font-semibold rounded shadow-sm">
                Featured
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold h-14 line-clamp-2">
          <Link href={productUrl} className="hover:text-indigo-600 transition-colors">
            {product.name}
          </Link>
        </h3>
        
        <p className="text-gray-600 mt-1 font-medium">${formatPrice(Number(displayPrice))}</p>
        
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
                {product.variants
                  .filter(variant => variant.id)
                  .map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} - ${formatPrice(variant.price ? Number(variant.price) : null) || formatPrice(Number(product.price))}
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