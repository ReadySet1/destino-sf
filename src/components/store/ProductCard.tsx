'use client';

import Image, { ImageProps } from 'next/image';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { Product, Variant } from '@/types/product';
import { useCartStore } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { ProductImage } from '@/components/ui/product-image';

interface ProductCardProps {
  product: Product;
}

// Smart fallback image selector based on product category
const getFallbackImage = (productName: string, categoryName?: string): string => {
  const name = productName.toLowerCase();
  const category = categoryName?.toLowerCase() || '';

  // Check for alfajor products
  if (name.includes('alfajor') || category.includes('alfajor')) {
    return '/images/fallbacks/alfajores-default.svg';
  }

  // Check for catering products
  if (category.includes('catering') || name.includes('catering')) {
    return '/images/fallbacks/catering-default.svg';
  }

  // Check for cafe/drink products
  if (category.includes('cafe') || category.includes('coffee') || category.includes('drink')) {
    return '/images/fallbacks/cafe-default.svg';
  }

  // Default empanada fallback for everything else
  return '/images/menu/empanadas.png';
};

// Image validation is now handled by ProductImage component

export function ProductCard({ product }: ProductCardProps) {
  // Move all hooks to the top before any early returns
  const { addItem } = useCartStore();
  
  // Check if product has valid variants
  const hasVariants =
    product.variants &&
    Array.isArray(product.variants) &&
    product.variants.filter(v => v && v.id).length > 0;

  // Only set a selected variant if there are valid variants
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    hasVariants && product.variants ? product.variants[0] : null
  );

  // Don't show unavailable items at all (like Pride Alfajores out of season)
  // Handle undefined/null values gracefully
  const isAvailable = product.isAvailable ?? true;
  const isPreorder = product.isPreorder ?? false;
  
  if (!isAvailable && !isPreorder) {
    return null;
  }

  // Calculate display price based on selected variant or product price
  const displayPrice =
    selectedVariant?.price !== null && selectedVariant?.price !== undefined
      ? selectedVariant.price
      : product.price;

  // Generate short description if none exists
  const shortDescription = product.description
    ? truncateText(product.description, 80)
    : generateShortDescription(product.name, product.category?.name);

  // Get the first image from product.images if it exists
  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const imageUrl = firstImage ? getProxiedImageUrl(firstImage) : null;

  const handleAddToCart = () => {
    if (isPreorder) {
      // For pre-order items, show a special modal or alert
      const preorderMessage = formatPreorderMessage(product);
      if (!confirm(preorderMessage)) {
        return;
      }
    }

    // Extract price as number
    const priceToAdd =
      typeof displayPrice === 'object' && displayPrice !== null && 'toNumber' in displayPrice
        ? (displayPrice as any).toNumber()
        : Number(displayPrice) || 0;

    addItem({
      id: product.id,
      name: product.name + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
      price: priceToAdd,
      quantity: 1,
      image: imageUrl || getFallbackImage(product.name, product.category?.name),
      variantId: selectedVariant?.id,
    });
  };

  // Helper function to format pre-order message
  const formatPreorderMessage = (product: Product): string => {
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    let message = `This item is available for pre-order only.\n\n`;
    
    if (product.preorderStartDate && product.preorderEndDate) {
      message += `Expected availability: ${formatDate(product.preorderStartDate)} - ${formatDate(product.preorderEndDate)}\n\n`;
    } else if (product.preorderEndDate) {
      message += `Expected availability by: ${formatDate(product.preorderEndDate)}\n\n`;
    }
    
    message += `Would you like to place a pre-order for this item?`;
    return message;
  };

  return (
    <div className="group relative h-full">
      <Link
        href={`/products/${product.slug || product.id}`} // Use slug or fallback to id
        className="flex flex-row md:flex-col h-full" // Use flex-grow to allow content to expand
      >
        {/* Image Container - Mobile: Left side, Desktop: Top */}
        <div className="w-[100px] h-[100px] md:w-full md:h-auto relative overflow-hidden md:rounded-t-lg flex-shrink-0 m-2 md:m-0 rounded-lg md:aspect-[4/3]">
          <ProductImage
            src={imageUrl}
            alt={product.name}
            className="object-contain md:object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            sizes="(min-width: 768px) 33vw, 100px"
            priority={product.featured}
            fallbackSrc={getFallbackImage(product.name, product.category?.name)}
            skeletonVariant="card"
          />

          {product.featured && (
            <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 md:px-2 md:py-1 rounded-full z-10">
              <span className="md:hidden">★</span>
              <span className="hidden md:inline">Featured</span>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="flex-1 p-3 md:p-4 flex flex-col">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-1 md:mb-2">
              {product.name}
            </h3>

            <p className="text-xs md:text-sm text-gray-600 line-clamp-2 md:line-clamp-3 mb-2">
              {shortDescription}
            </p>

            {/* Category Badge and Pre-order Badge */}
            <div className="flex flex-wrap gap-1 mb-2 md:mb-3">
              {product.category?.name && (
                <Badge variant="secondary" className="text-xs">
                  {product.category.name}
                </Badge>
              )}
              {isPreorder && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Pre-order
                </Badge>
              )}
            </div>
          </div>

          {/* Price and variants */}
          <div className="mt-auto">
            {hasVariants && product.variants && (
              <div className="mb-2">
                <select
                  value={selectedVariant?.id || ''}
                  onChange={e => {
                    const variant = product.variants?.find(v => v.id === e.target.value);
                    setSelectedVariant(variant || null);
                  }}
                  className="w-full text-xs p-1 border border-gray-300 rounded"
                  onClick={e => e.preventDefault()}
                >
                  {product.variants.map(variant => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} - ${Number(variant.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 text-sm md:text-lg">
                ${Number(displayPrice).toFixed(2)}
              </span>

              <Button
                size="sm"
                onClick={e => {
                  e.preventDefault();
                  handleAddToCart();
                }}
                className={cn(
                  "text-xs md:text-sm px-2 md:px-3 py-1 md:py-2",
                  isPreorder
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-yellow-400 hover:bg-yellow-500 text-black"
                )}
                disabled={!isAvailable && !isPreorder}
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {isPreorder ? 'Pre-order' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Helper functions remain the same
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function generateShortDescription(productName: string, categoryName?: string): string {
  const category = categoryName?.toLowerCase() || '';

  if (category.includes('alfajor')) {
    return 'Buttery shortbread cookies filled with rich dulce de leche';
  }

  if (category.includes('empanada')) {
    return 'Handcrafted savory pastries with flavorful fillings';
  }

  return `Delicious ${productName.toLowerCase()} made with quality ingredients`;
}
