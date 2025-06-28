'use client';

import { useState, useEffect } from 'react';
import { SafeImage } from './safe-image';
import { cn } from '@/lib/utils';
import { Package, ShoppingBag } from 'lucide-react';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  showSkeleton?: boolean;
  skeletonVariant?: 'default' | 'card' | 'hero';
}

export function ProductImage({
  src,
  alt,
  className,
  priority = false,
  sizes = "(min-width: 768px) 33vw, 100vw",
  fill = true,
  width,
  height,
  fallbackSrc,
  showSkeleton = true,
  skeletonVariant = 'default',
  ...props
}: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset loading state when src changes
  useEffect(() => {
    if (src) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Determine fallback based on product type
  const getFallbackImage = () => {
    if (fallbackSrc) return fallbackSrc;
    
    const altLower = alt.toLowerCase();
    if (altLower.includes('alfajor') || altLower.includes('dessert')) {
      return '/images/fallbacks/alfajores-default.svg';
    }
    if (altLower.includes('catering')) {
      return '/images/fallbacks/catering-default.svg';
    }
    if (altLower.includes('coffee') || altLower.includes('cafe')) {
      return '/images/fallbacks/cafe-default.svg';
    }
    return '/images/fallbacks/empanadas-default.svg';
  };

  // Skeleton variants
  const getSkeletonContent = () => {
    const iconClass = skeletonVariant === 'hero' ? 'w-16 h-16' : 
                     skeletonVariant === 'card' ? 'w-12 h-12' : 'w-8 h-8';
    
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3">
        <div className={cn(
          "rounded-full bg-gray-300 p-3 animate-pulse",
          iconClass
        )}>
          {alt.toLowerCase().includes('catering') ? (
            <ShoppingBag className="w-full h-full text-gray-400" />
          ) : (
            <Package className="w-full h-full text-gray-400" />
          )}
        </div>
        
        {skeletonVariant !== 'default' && (
          <div className="space-y-2 text-center">
            <div className="h-3 bg-gray-300 rounded animate-pulse w-20" />
            <div className="h-2 bg-gray-200 rounded animate-pulse w-16" />
          </div>
        )}
      </div>
    );
  };

  if (!src || hasError) {
    return (
      <div className={cn(
        "image-container flex items-center justify-center",
        className
      )}>
        <SafeImage
          src={getFallbackImage()}
          alt={alt}
          fill={fill}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className="object-contain opacity-60"
          showLoader={false}
          {...props}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden image-container", className)}>
      {/* Loading Skeleton */}
      {isLoading && showSkeleton && (
        <div className="absolute inset-0 z-10">
          <div className="image-skeleton w-full h-full">
            {getSkeletonContent()}
          </div>
          
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      )}

      {/* Main Image */}
      <SafeImage
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        fallbackSrc={getFallbackImage()}
        className={cn(
          "transition-all duration-500 ease-out",
          isLoading ? "scale-105 blur-sm" : "scale-100 blur-0",
          "hover:scale-105"
        )}
        showLoader={false}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Smooth fade-in overlay */}
      {!isLoading && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </div>
  );
} 