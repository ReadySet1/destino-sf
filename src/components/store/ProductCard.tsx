'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import { Product, Variant } from '@/types/product';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
}

// Helper function to safely format prices
const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined || isNaN(Number(price))) {
     return "0.00";
  }
  return Number(price).toFixed(2);
};

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  
  // Check if product has valid variants
  const hasVariants = product.variants && Array.isArray(product.variants) && 
                     product.variants.filter(v => v && v.id).length > 0;
  
  // Only set a selected variant if there are valid variants
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    hasVariants && product.variants ? product.variants[0] : null
  );

  // Calculate display price based on selected variant or product price
  const displayPrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined 
    ? selectedVariant.price 
    : product.price;

  // Ensure mainImage logic considers product.images existence
  const mainImage = product.images?.[0] || '/images/menu/empanadas.png'; // Use fallback if needed

  const handleAddToCart = () => {
    // Ensure priceToAdd is a number, defaulting to 0 if conversion fails
    const priceToAdd = Number(displayPrice) || 0;

    addItem({
      id: product.id,
      name: product.name + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
      price: priceToAdd,
      quantity: 1,
      image: mainImage, // Use the determined mainImage
      variantId: selectedVariant?.id, // Add variantId
    });

    // Update toast message to include variant name if selected
    toast.success(`${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart!`);
  };

  return (
    <div className="group relative bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col rounded-lg overflow-hidden">
      <Link 
        href={`/products/${product.slug || product.id}`} // Use slug or fallback to id
        className="flex flex-row md:flex-col h-full" // Use flex-grow to allow content to expand
      >
        {/* Image Container - Mobile: Left side, Desktop: Top */}
        <div className="w-[110px] h-[110px] md:w-full md:h-auto relative overflow-hidden md:rounded-t-lg flex-shrink-0 flex items-center justify-center bg-gray-50 m-3 md:m-0 rounded-lg md:aspect-[4/3]">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-contain md:object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              sizes="(min-width: 768px) 33vw, 110px"
              priority={product.featured}
              onError={() => console.error("Image failed to load:", mainImage)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          {product.featured && (
            <div className="absolute top-2 left-2 hidden md:block bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full z-10">
              Featured
            </div>
          )}
        </div>
        
        {/* Content Container */}
        <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
          {/* Top part: Name and Description */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 truncate md:mb-2 group-hover:text-indigo-600 transition-colors">
              {product.name}
            </h3>
            
            {product.description && (
              <p className="text-sm text-gray-600 line-clamp-2 md:mb-2 hidden md:block">{product.description}</p>
            )}
          </div>
          
          {/* Bottom part: Variants, Price, Button */}
          <div className="mt-auto"> 
            {/* Variant Selector - Only show if multiple variants exist */}
            {hasVariants && product.variants && product.variants.length > 1 && (
              <div className="mb-3">
                <select
                  // Prevent link navigation when clicking the select
                  onClick={(e) => e.preventDefault()} 
                  className="w-full border rounded-md py-1.5 px-2 text-sm border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedVariant?.id || ''}
                  onChange={(e) => {
                    const variant = product.variants?.find(v => v.id === e.target.value);
                    setSelectedVariant(variant || null);
                  }}
                  aria-label={`Select ${product.name} option`}
                >
                  {product.variants
                    .filter(variant => variant && variant.id) // Ensure variant has an ID
                    .map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name} - ${formatPrice(variant.price !== null ? Number(variant.price) : Number(product.price))}
                      </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price and Add to Cart Button */}
            <div className="flex items-center justify-between pt-2 md:pt-3 md:border-t md:border-gray-100">
              <span className="text-base md:text-lg font-bold text-gray-900">
                ${formatPrice(Number(displayPrice))}
              </span>
              <Button
                onClick={e => {
                  e.preventDefault(); // Keep preventing link navigation
                  handleAddToCart();
                }}
                className="bg-[#F7B614] hover:bg-[#E5A912] text-white font-medium px-3 py-1 md:px-5 md:py-2 rounded-full transition-colors duration-300"
                variant="ghost"
                aria-label={`Add ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} to cart`}
              >
                <span className="md:hidden">+Add</span>
                <span className="hidden md:inline">Add to Cart</span>
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
