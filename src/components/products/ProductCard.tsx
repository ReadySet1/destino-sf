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
import { Calendar, Eye } from 'lucide-react';
import {
  getEffectiveAvailabilityState,
  shouldRenderProduct,
  canAddToCart,
  isViewOnly,
  isPreOrder,
  isComingSoon,
  getAddToCartButtonConfig,
  getAvailabilityBadge,
  formatPreorderMessage,
} from '@/lib/availability/utils';
import {
  sanitizeProductDescription,
  htmlToPlainText,
  truncateHtmlDescription,
} from '@/lib/utils/product-description';

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

// Helper function to generate descriptive alt text for product images
const getProductAltText = (product: Product): string => {
  const name = product.name;
  const categoryName = product.category?.name?.toLowerCase() || '';

  // For empanadas, add descriptive context
  if (categoryName.includes('empanada') || name.toLowerCase().includes('empanada')) {
    return `${name} - handcrafted empanada with golden flaky crust`;
  }

  // For alfajores, add descriptive context
  if (categoryName.includes('alfajor') || name.toLowerCase().includes('alfajor')) {
    return `${name} - dulce de leche sandwich cookie`;
  }

  // For catering items
  if (categoryName.includes('catering')) {
    return `${name} - catering package`;
  }

  // Default: product name with generic enhancement
  return `${name} - Destino SF handcrafted Latin food`;
};

// Helper function to create short, card-appropriate descriptions
// Now handles HTML-formatted descriptions from Square
const getShortDescription = (productName: string, fullDescription?: string): string => {
  // ALWAYS prefer the actual description from the database first
  if (fullDescription && fullDescription.length > 0) {
    // Use truncateHtmlDescription utility to handle both short and long descriptions
    // This ensures consistent handling of HTML content
    return truncateHtmlDescription(fullDescription, 80);
  }

  // Only use fallbacks if there's no description in the database
  const name = productName.toLowerCase();

  // Create concise descriptions based on product name (FALLBACK ONLY)
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

  return 'Handcrafted with premium ingredients and traditional recipes.';
};

export default function ProductCard({ product }: ProductCardProps) {
  // Move all hooks to the top before any early returns
  const [imageError, setImageError] = useState(false);
  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();

  const displayPrice = product.price;

  // Check if product should be rendered using the availability utils
  if (!shouldRenderProduct(product)) {
    return null;
  }

  // Get availability state and button config
  const availabilityState = getEffectiveAvailabilityState(product);
  const buttonConfig = getAddToCartButtonConfig(product);
  const badge = getAvailabilityBadge(product);

  // Debug logging for availability state
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ProductCard] ${product.name}:`, {
      availabilityState,
      hasEvaluatedAvailability: !!product.evaluatedAvailability,
      evaluatedState: product.evaluatedAvailability?.currentState,
      isAvailable: product.isAvailable,
      isPreorder: product.isPreorder,
      itemState: product.itemState,
      buttonText: buttonConfig.text,
      badgeText: badge?.text,
    });
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
    // Check if product can be added to cart
    if (!canAddToCart(product)) {
      return;
    }

    // For pre-order items, show confirmation dialog
    if (isPreOrder(product)) {
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

    const alertMessage = isPreOrder(product)
      ? `1 ${product.name} has been pre-ordered and added to your cart.`
      : `1 ${product.name} has been added to your cart.`;

    showAlert(alertMessage);
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
              alt={getProductAltText(product)}
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
            {badge?.show && (
              <span
                className={cn(
                  'px-2 py-1 text-xs font-semibold rounded shadow-sm flex items-center gap-1',
                  badge.className
                )}
              >
                {badge.icon === 'calendar' && <Calendar className="w-3 h-3" />}
                {badge.icon === 'eye' && <Eye className="w-3 h-3" />}
                {badge.text}
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

        <div
          className="text-sm text-gray-600 line-clamp-2 flex-grow mb-4"
          dangerouslySetInnerHTML={{
            __html: getShortDescription(product.name, product.description || undefined),
          }}
        />

        <div className="mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">${formatPrice(displayPrice)}</span>

            <button
              className={cn(
                'font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2',
                buttonConfig.className
              )}
              onClick={handleAddToCart}
              disabled={buttonConfig.disabled}
              aria-label={buttonConfig.ariaLabel}
            >
              {buttonConfig.icon === 'cart' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9"
                  />
                </svg>
              )}
              {buttonConfig.icon === 'preorder' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3a4 4 0 118 0v4m-4 8l-2-2m0 0l-2-2m2 2l2-2m-2 2v6"
                  />
                </svg>
              )}
              {buttonConfig.icon === 'eye' && <Eye className="w-4 h-4" />}
              {buttonConfig.icon === 'calendar' && <Calendar className="w-4 h-4" />}
              {buttonConfig.text}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
