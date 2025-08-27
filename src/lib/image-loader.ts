/**
 * Custom image loader with timeout handling for S3 images
 * This helps prevent 504 timeout errors when loading large S3 images
 */

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function customImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // For S3 images, we'll use the original URL but add query params to help with caching
  // and potentially trigger CloudFront behaviors
  if (src.includes('s3.us-west-2.amazonaws.com') || src.includes('s3.amazonaws.com')) {
    const url = new URL(src);
    
    // Add cache-busting and size hints for S3/CloudFront
    url.searchParams.set('w', width.toString());
    if (quality) {
      url.searchParams.set('q', quality.toString());
    }
    
    // Add timestamp for cache management (helps with stale images)
    const cacheKey = Math.floor(Date.now() / (1000 * 60 * 60)); // Changes every hour
    url.searchParams.set('v', cacheKey.toString());
    
    return url.toString();
  }
  
  // For other images (Square, etc.), use default Next.js optimization
  const params = new URLSearchParams();
  params.set('url', src);
  params.set('w', width.toString());
  if (quality) {
    params.set('q', quality.toString());
  }
  
  return `/_next/image?${params.toString()}`;
}

/**
 * Utility function to handle image loading errors gracefully
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>
): void {
  const img = event.currentTarget;
  
  // If the image failed to load, try a fallback or placeholder
  if (img.src && !img.src.includes('placeholder')) {
    console.warn('Image failed to load:', img.src);
    
    // You can set a placeholder image here
    // img.src = '/images/placeholder.png';
    
    // Or hide the image
    img.style.display = 'none';
  }
}

/**
 * Check if an image URL is from S3 and might be slow to load
 */
export function isS3Image(src: string): boolean {
  return src.includes('s3.us-west-2.amazonaws.com') || 
         src.includes('s3.amazonaws.com') ||
         src.includes('items-images-production.s3.us-west-2.amazonaws.com') ||
         src.includes('items-images-sandbox.s3.us-west-2.amazonaws.com');
}

/**
 * Get optimized image props for potentially slow S3 images
 */
export function getOptimizedImageProps(src: string) {
  if (isS3Image(src)) {
    return {
      loading: 'lazy' as const,
      placeholder: 'blur' as const,
      blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+h2R+1+g/3eGV/rMbddMg=/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+h2R+1+g/3eGV/rMbddMgA=',
      onError: handleImageError,
    };
  }
  
  return {
    loading: 'lazy' as const,
  };
}
