/**
 * Image utility functions for handling product images, fallbacks, and optimization
 */

export interface ImageConfig {
  src: string;
  alt: string;
  fallback?: string;
  placeholder?: boolean;
}

/**
 * Determines if a product should use a placeholder image based on its properties
 */
export function shouldUsePlaceholder(
  productName: string,
  images?: string[] | null,
  category?: string
): boolean {
  // If no images provided or empty array
  if (!images || images.length === 0) {
    return true;
  }

  // If first image is null, undefined, or empty string
  if (!images[0] || images[0].trim() === '') {
    return true;
  }

  // Check for specific Tier 2 BoxLunch items that need placeholders
  const tier2Items = ['carne asada', 'pollo al carbon', 'pollo al carbón'];

  const nameToCheck = productName.toLowerCase();
  const isTier2Item = tier2Items.some(item => nameToCheck.includes(item));

  // For now, force placeholder for Tier 2 items until real images are added
  if (isTier2Item) {
    return true;
  }

  return false;
}

/**
 * Gets the appropriate image configuration for a product
 */
export function getProductImageConfig(
  productName: string,
  images?: string[] | null,
  category?: string
): ImageConfig {
  const usePlaceholder = shouldUsePlaceholder(productName, images, category);

  if (usePlaceholder) {
    return {
      src: '', // Empty src will trigger placeholder in component
      alt: productName,
      placeholder: true,
    };
  }

  return {
    src: images![0],
    alt: productName,
    fallback: getDefaultImageForCategory(category),
    placeholder: false,
  };
}

/**
 * Gets default fallback image based on product category
 */
export function getDefaultImageForCategory(category?: string): string {
  if (!category) return '/images/menu/empanadas.png';

  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('alfajor') || categoryLower.includes('dessert')) {
    return '/images/menu/alfajores.png';
  }

  if (categoryLower.includes('empanada')) {
    return '/images/menu/empanadas.png';
  }

  if (categoryLower.includes('catering')) {
    return '/images/menu/catering.png';
  }

  // Default fallback
  return '/images/menu/empanadas.png';
}

/**
 * Determines the category for placeholder styling based on product name and category
 */
export function getPlaceholderCategory(
  productName: string,
  category?: string
): 'food' | 'beverage' | 'dessert' | 'default' {
  const name = productName.toLowerCase();
  const cat = category?.toLowerCase() || '';

  if (cat.includes('dessert') || name.includes('alfajor') || name.includes('cookie')) {
    return 'dessert';
  }

  if (
    cat.includes('beverage') ||
    name.includes('coffee') ||
    name.includes('tea') ||
    name.includes('drink')
  ) {
    return 'beverage';
  }

  if (
    cat.includes('food') ||
    cat.includes('entree') ||
    cat.includes('empanada') ||
    name.includes('carne') ||
    name.includes('pollo') ||
    name.includes('chicken')
  ) {
    return 'food';
  }

  return 'default';
}

/**
 * Optimizes image URLs for different sizes and formats
 */
export function optimizeImageUrl(
  originalUrl: string,
  width?: number,
  height?: number,
  format?: 'webp' | 'jpeg' | 'png'
): string {
  // If it's a local image, return as-is
  if (originalUrl.startsWith('/')) {
    return originalUrl;
  }

  // For external URLs (like Square images), we could add optimization parameters
  // This is a placeholder for future optimization logic
  return originalUrl;
}

/**
 * Preloads critical images for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  try {
    await Promise.all(urls.map(url => preloadImage(url)));
  } catch (error) {
    console.warn('Some images failed to preload:', error);
  }
}
