'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useEffect } from 'react';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
  maxRetries?: number;
}

// Track failed images globally to prevent infinite retries
const failedImages = new Set<string>();

export function SafeImage({ 
  src, 
  fallbackSrc = '/images/fallbacks/default-item.svg', 
  maxRetries = 1,
  ...props 
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  // Check if this image has already failed globally
  useEffect(() => {
    if (typeof src === 'string' && failedImages.has(src)) {
      setCurrentSrc(fallbackSrc);
      setHasError(true);
    }
  }, [src, fallbackSrc]);

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
  };

  return (
    <Image
      {...props}
      src={currentSrc}
      onError={handleError}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyejFhZvvWylhAYWPmgAmLNpFjl3bATMHT5P//Z"
    />
  );
} 