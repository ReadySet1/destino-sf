'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Heart, Eye, Package } from 'lucide-react';
import { format } from 'date-fns';
import { AddToCartButton } from './AddToCartButton';
import { CompactAvailabilityBadge } from './AvailabilityBadge';
import { useAvailability } from '@/hooks/useAvailability';
import { AvailabilityState } from '@/types/availability';
import { Product as ProductType } from '@/types/product';
import { serializeDecimal } from '@/utils/serialization';
import { cn } from '@/lib/utils';
import { sanitizeProductDescription } from '@/lib/utils/product-description';

interface ProductCardProps {
  product: ProductType;
  featured?: boolean;
  showAvailabilityBadge?: boolean;
  className?: string;
}

export function ProductCard({
  product,
  featured = false,
  showAvailabilityBadge = true,
  className,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Get availability information
  const {
    currentState,
    isHidden,
    viewOnlySettings,
    nextStateChange,
    isLoading: availabilityLoading,
  } = useAvailability(product.id);

  const numericPrice = serializeDecimal(product.price) || 0;
  const hasImages = product.images && product.images.length > 0;
  const primaryImage = hasImages ? product.images[0] : null;

  // Don't render hidden products
  if (isHidden) {
    return null;
  }

  const handleWishlistToggle = () => {
    setIsWishlisted(!isWishlisted);
    // TODO: Implement wishlist functionality
  };

  const canShowPrice =
    currentState !== AvailabilityState.VIEW_ONLY || viewOnlySettings?.showPrice !== false;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200 hover:shadow-lg',
        featured && 'ring-2 ring-primary/20',
        className
      )}
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {primaryImage && !imageError ? (
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Availability Badge */}
        {showAvailabilityBadge &&
          !availabilityLoading &&
          currentState !== AvailabilityState.AVAILABLE && (
            <div className="absolute top-2 left-2">
              <CompactAvailabilityBadge state={currentState} nextStateChange={nextStateChange} />
            </div>
          )}

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-600">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Featured
            </Badge>
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={handleWishlistToggle}
            >
              <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current text-red-500')} />
            </Button>

            <Button size="sm" variant="secondary" className="h-8 w-8 p-0" asChild>
              <Link href={`/products/${product.slug || product.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Product Name */}
          <div>
            <Link
              href={`/products/${product.slug || product.id}`}
              className="font-medium text-lg hover:text-primary transition-colors line-clamp-2"
            >
              {product.name}
            </Link>

            {product.description && (
              <div
                className="text-sm text-muted-foreground mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: sanitizeProductDescription(product.description),
                }}
              />
            )}
          </div>

          {/* Price */}
          {canShowPrice && (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">${numericPrice.toFixed(2)}</span>

              {/* Variant pricing indicator */}
              {product.variants && product.variants.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  from {product.variants.length} options
                </span>
              )}
            </div>
          )}

          {/* Dietary Information */}
          {product.dietaryPreferences && product.dietaryPreferences.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.dietaryPreferences.slice(0, 3).map(pref => (
                <Badge key={pref} variant="outline" className="text-xs">
                  {pref}
                </Badge>
              ))}
              {product.dietaryPreferences.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{product.dietaryPreferences.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <AddToCartButton
              product={product}
              className="w-full"
              showAvailabilityMessages={false}
            />
          </div>

          {/* View-Only Message */}
          {currentState === AvailabilityState.VIEW_ONLY && viewOnlySettings?.message && (
            <p className="text-xs text-muted-foreground text-center">{viewOnlySettings.message}</p>
          )}

          {/* Next State Change Info */}
          {nextStateChange && (
            <p className="text-xs text-muted-foreground text-center">
              Status changes on {format(nextStateChange.date, 'MMM d')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simplified product card for lists
 */
export function SimpleProductCard({
  product,
  className,
}: Omit<ProductCardProps, 'featured' | 'showAvailabilityBadge'>) {
  return (
    <ProductCard
      product={product}
      featured={false}
      showAvailabilityBadge={true}
      className={cn('h-fit', className)}
    />
  );
}

/**
 * Featured product card with enhanced styling
 */
export function FeaturedProductCard({ product, className }: Omit<ProductCardProps, 'featured'>) {
  return (
    <ProductCard
      product={product}
      featured={true}
      showAvailabilityBadge={true}
      className={cn('border-primary/20 shadow-lg', className)}
    />
  );
}
