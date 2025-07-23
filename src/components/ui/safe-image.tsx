'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SafeImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  fallbackSrc?: string;
  maxRetries?: number;
  showLoader?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

// Track failed images globally to prevent infinite retries
const failedImages = new Set<string>();

export function SafeImage({
  src,
  fallbackSrc = '/images/fallbacks/default-item.svg',
  maxRetries = 1,
  showLoader = true,
  className,
  onLoad: externalOnLoad,
  onError: externalOnError,
  ...props
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setRetryCount(0);
    setIsLoading(true);
    setIsLoaded(false);
  }, [src]);

  // Check if this image has already failed globally
  useEffect(() => {
    if (typeof src === 'string' && failedImages.has(src)) {
      setCurrentSrc(fallbackSrc);
      setHasError(true);
      setIsLoading(false);
    }
  }, [src, fallbackSrc]);

  const handleLoad = () => {
    setIsLoading(false);
    setIsLoaded(true);
    externalOnLoad?.();
  };

  const handleError = () => {
    const srcString = typeof currentSrc === 'string' ? currentSrc : '';

    // Mark this image as failed globally
    if (srcString) {
      failedImages.add(srcString);
    }

    console.warn(`Image failed to load: ${srcString}`);

    // If we haven't exceeded max retries and haven't used fallback yet
    if (retryCount < maxRetries && currentSrc !== fallbackSrc) {
      setRetryCount(prev => prev + 1);

      // Try adding cache busting parameter
      if (typeof currentSrc === 'string' && !currentSrc.includes('?')) {
        setCurrentSrc(`${currentSrc}?t=${Date.now()}`);
        return;
      }
    }

    // Use fallback
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(true);
    }

    setIsLoading(false);
    externalOnError?.();
  };

  // Better blur data URL with a pleasant gradient
  const blurDataURL =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMF8xIiB4MT0iMCIgeTE9IjAiIHgyPSIyMDAiIHkyPSIyMDAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0Y5RkFGQiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGM0Y0RjYiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzBfMSkiLz4KPC9zdmc+';

  return (
    <div className="relative w-full h-full">
      {/* Loading skeleton */}
      {isLoading && showLoader && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Main Image */}
      <Image
        {...props}
        src={currentSrc}
        alt={props.alt || 'Product image'}
        onError={handleError}
        onLoad={handleLoad}
        placeholder="blur"
        blurDataURL={blurDataURL}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />

      {/* Error state indicator */}
      {hasError && !isLoading && (
        <div className="absolute top-2 right-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium opacity-75">
          Fallback
        </div>
      )}
    </div>
  );
}
