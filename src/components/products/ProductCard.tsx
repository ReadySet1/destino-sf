// src/components/Products/ProductCard.tsx

"use client";

import { Product, Variant } from '@/types/product';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCartStore } from "@/store/cart";
import { useCartAlertStore } from "@/components/ui/cart-alert";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from './ImagePlaceholder';
import { 
  getProductImageConfig, 
  getPlaceholderCategory,
  getDefaultImageForCategory 
} from '@/lib/image-utils';

interface ProductCardProps {
  product: Product;
}

// Helper function to safely format prices (handles Decimal objects too)
const formatPrice = (price: any): string => {
  // Handle Decimal objects from Prisma
  if (price && typeof price === 'object' && 'toNumber' in price) {
    return price.toNumber().toFixed(2);
  }
  
  // Handle regular numbers
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
  
  // Use image utilities to determine if we should show placeholder
  const imageConfig = getProductImageConfig(
    product.name,
    product.images,
    product.category?.name
  );
  
  const shouldShowPlaceholder = imageConfig.placeholder || imageError || !imageConfig.src;
  const placeholderCategory = getPlaceholderCategory(product.name, product.category?.name);
  
  // Fallback to default image if not using placeholder
  const mainImage = shouldShowPlaceholder 
    ? getDefaultImageForCategory(product.category?.name)
    : imageConfig.src;
  
  const productId = String(product.id ?? '');
  const productUrl = `/products/${productId}`;

  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();

  const handleAddToCart = () => {
    // Extract numeric price from displayPrice (handles both Decimal objects and numbers)
    let priceToAdd: number;
    if (displayPrice && typeof displayPrice === 'object' && 'toNumber' in displayPrice) {
      priceToAdd = displayPrice.toNumber();
    } else {
      priceToAdd = Number(displayPrice) || 0;
    }

    addItem({
      id: productId, 
      name: product.name + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
      price: priceToAdd,
      quantity: 1,
      image: mainImage,
      variantId: selectedVariant?.id,
    });
    
    showAlert(`1 ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ""} has been added to your cart.`);
  };

  return (
    <div className="group flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <Link href={productUrl} className="block relative">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          {shouldShowPlaceholder ? (
            <ImagePlaceholder
              productName={product.name}
              category={placeholderCategory}
              size="lg"
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className={cn(
                "object-cover object-center transition-all duration-300",
                "group-hover:scale-105"
              )}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              priority={product.featured || undefined}
              quality={85}
              onError={() => setImageError(true)}
              data-testid="product-image"
            />
          )}
          {product.featured && (
            <div className="absolute top-2 right-2 z-10">
              <span className="bg-orange-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-sm">
                Featured
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <Link href={productUrl} className="block">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-orange-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>
        
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-3 flex-grow mb-4">
            {product.description}
          </p>
        )}

        <div className="mt-auto">
          {product.variants && product.variants.length > 0 && (
            <div className="mb-3">
              <select
                className="w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    {variant.name} - ${formatPrice(variant.price || product.price)}
                  </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">
              ${formatPrice(displayPrice)}
            </span>
            
            <button 
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2"
              onClick={handleAddToCart}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9" />
              </svg>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}