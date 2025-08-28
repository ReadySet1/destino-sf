// src/components/Products/ProductCard.tsx

'use client';

import { Product } from '@/types/product';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useCartAlertStore } from '@/components/ui/cart-alert';
import { cn } from '@/lib/utils';
import { ImagePlaceholder } from './ImagePlaceholder';
import {
  getProductImageConfig,
  getPlaceholderCategory,
  getDefaultImageForCategory,
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
    return '0.00';
  }

  // Price is a valid number
  return Number(price).toFixed(2);
};

// Helper function to create short, card-appropriate descriptions
const getShortDescription = (productName: string, fullDescription?: string): string => {
  const name = productName.toLowerCase();

  // Create concise descriptions based on product name
  if (name.includes('argentine beef') || name.includes('carne asada')) {
    return 'Traditional Argentine beef empanadas with ground beef, pimiento and spices.';
  }

  if (name.includes('caribbean pork') || name.includes('pork')) {
    return 'Flavorful Caribbean pork empanadas with ground pork and black beans.';
  }

  if (name.includes('combo')) {
    return 'Mix and match your favorite empanada flavors in one convenient pack.';
  }

  if (name.includes('chicken') || name.includes('pollo')) {
    return 'Tender chicken empanadas seasoned with Latin spices.';
  }

  if (name.includes('vegetarian') || name.includes('veggie')) {
    return 'Plant-based empanadas filled with fresh vegetables and herbs.';
  }

  if (name.includes('alfajor')) {
    return 'Buttery shortbread cookies filled with rich dulce de leche.';
  }

  // If no specific match, truncate the original description or create a generic one
  if (fullDescription && fullDescription.length > 0) {
    const truncated =
      fullDescription.length > 60
        ? fullDescription.substring(0, 60).trim() + '...'
        : fullDescription;
    return truncated;
  }

  return 'Handcrafted with premium ingredients and traditional recipes.';
};

export default function ProductCard({ product }: ProductCardProps) {
  // Move all hooks to the top before any early returns
  const [imageError, setImageError] = useState(false);
  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();
  
  const displayPrice = product.price;

  // Don't show unavailable items at all (like Pride Alfajores out of season)
  // Handle undefined/null values gracefully
  const isAvailable = product.isAvailable ?? true;
  const isPreorder = product.isPreorder ?? false;
  
  if (!isAvailable && !isPreorder) {
    return null;
  }

  // Use image utilities to determine if we should show placeholder
  const imageConfig = getProductImageConfig(product.name, product.images, product.category?.name);

  const shouldShowPlaceholder = imageConfig.placeholder || imageError || !imageConfig.src;
  const placeholderCategory = getPlaceholderCategory(product.name, product.category?.name);

  // Fallback to default image if not using placeholder
  const mainImage = shouldShowPlaceholder
    ? getDefaultImageForCategory(product.category?.name)
    : imageConfig.src;

  const productId = String(product.id ?? '');
  const productUrl = `/products/${productId}`;

  const handleAddToCart = () => {
    if (isPreorder) {
      // For pre-order items, show a special modal or alert
      const preorderMessage = formatPreorderMessage(product);
      if (!confirm(preorderMessage)) {
        return;
      }
    }

    // Extract numeric price from displayPrice (handles both Decimal objects and numbers)
    let priceToAdd: number;
    if (displayPrice && typeof displayPrice === 'object' && 'toNumber' in displayPrice) {
      priceToAdd = displayPrice.toNumber();
    } else {
      priceToAdd = Number(displayPrice) || 0;
    }

    addItem({
      id: productId,
      name: product.name,
      price: priceToAdd,
      quantity: 1,
      image: mainImage,
      variantId: undefined,
    });

    const alertMessage = isPreorder 
      ? `1 ${product.name} has been pre-ordered and added to your cart.`
      : `1 ${product.name} has been added to your cart.`;
    
    showAlert(alertMessage);
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
                'object-cover object-center transition-all duration-300',
                'group-hover:scale-105'
              )}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              priority={product.featured || undefined}
              quality={85}
              onError={() => setImageError(true)}
              data-testid="product-image"
            />
          )}
          {/* Badges */}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
            {product.featured && (
              <span className="bg-orange-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-sm">
                Featured
              </span>
            )}
            {isPreorder && (
              <span className="bg-blue-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-sm">
                Pre-order
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <Link href={productUrl} className="block">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-orange-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-gray-600 line-clamp-2 flex-grow mb-4">
          {getShortDescription(product.name, product.description || undefined)}
        </p>

        <div className="mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">${formatPrice(displayPrice)}</span>

            <button
              className={cn(
                "font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2",
                isPreorder
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
              )}
              onClick={handleAddToCart}
              disabled={!isAvailable && !isPreorder}
            >
              {isPreorder ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3a4 4 0 118 0v4m-4 8l-2-2m0 0l-2-2m2 2l2-2m-2 2v6"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9"
                  />
                </svg>
              )}
              {isPreorder ? 'Pre-order Now' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
