import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

/**
 * Utility function to merge class names with Tailwind CSS classes
 * Uses clsx for conditional class names and tailwind-merge to handle Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a price from a number to a string with 2 decimal places
 */
export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return "0.00";
  
  // Convert string to number if needed
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Check if it's a valid number
  if (isNaN(numPrice)) return "0.00";
  
  // Format with 2 decimal places
  return numPrice.toFixed(2);
}

/**
 * Formats a number as currency (USD)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  
  // Convert string to number if needed
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) return "$0.00";
  
  // Format as USD currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
}

/**
 * Proxies an external image URL through our internal proxy to avoid CORS issues
 * @param url The original image URL
 * @returns A proxied URL that will work with Next.js Image component
 */
export function getProxiedImageUrl(url: string): string {
  // Check for null, undefined, or empty string
  if (!url || url === '') {
    return '';
  }
  
  // If it's already a local URL, data URL, or already proxied, return as is
  if (url.startsWith('/') || url.startsWith('data:') || url.includes('/api/proxy/image')) {
    return url;
  }
  
  try {
    // Try to parse as URL to validate
    const parsedUrl = new URL(url);
    
    // Determine if it's a Square image that needs proxying
    const isSquareS3 = parsedUrl.hostname.includes('items-images-') || 
                       parsedUrl.hostname.includes('square-catalog-') || 
                       (parsedUrl.hostname.includes('amazonaws.com') && 
                        url.includes('/files/') && 
                        !url.includes('square-marketplace'));
                        
    // If it's a Square marketplace image, those are generally public
    if (parsedUrl.hostname.includes('square-marketplace')) {
      return url;
    }
    
    // Square CDN images are also public
    if (parsedUrl.hostname.includes('squarecdn.com')) {
      return url;
    }
    
    // If it's a Square S3 image, proxy it
    if (isSquareS3) {
      const filePathMatch = url.match(/\/files\/([^\/]+)\/([^\/\?]+)/);
      if (filePathMatch && filePathMatch.length >= 3) {
        // Extract file ID and name for consistent URL pattern
        const fileId = filePathMatch[1];
        const fileName = filePathMatch[2];
        
        // Use a consistent URL format for better caching
        const normalizedUrl = `https://square-catalog-production.s3.amazonaws.com/files/${fileId}/${fileName}`;
        const encodedUrl = Buffer.from(normalizedUrl).toString('base64');
        return `/api/proxy/image?url=${encodedUrl}`;
      }
      
      // If we couldn't extract file parts, use the original URL
      const encodedUrl = Buffer.from(url).toString('base64');
      return `/api/proxy/image?url=${encodedUrl}`;
    }
    
    // For other external URLs, proxy them too for CORS safety
    if (!parsedUrl.hostname.includes('localhost') && 
        !parsedUrl.hostname.includes('.local') &&
        // Check for window only in browser environment
        (typeof window === 'undefined' || !parsedUrl.hostname.includes(window.location.hostname))) {
      const encodedUrl = Buffer.from(url).toString('base64');
      return `/api/proxy/image?url=${encodedUrl}`;
    }
    
    // If all checks pass, use the original URL
    return url;
  } catch (error) {
    // URL parsing failed, but we can still try to proxy
    console.warn('Invalid URL in getProxiedImageUrl:', url, error);
    
    // For Square S3 URLs, even if parsing failed
    if (url.includes('items-images-') || url.includes('square-catalog-') || 
        (url.includes('amazonaws.com') && url.includes('/files/'))) {
      const encodedUrl = Buffer.from(url).toString('base64');
      return `/api/proxy/image?url=${encodedUrl}`;
    }
    
    // Return original URL as last resort
    return url;
  }
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Determines if a URL is for an external domain (not our own site)
 */
export function isExternalUrl(url: string): boolean {
  if (!url || url.startsWith('/') || url.startsWith('data:')) {
    return false;
  }
  
  try {
    // Simplistic check - could be enhanced for production
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if it's localhost or our domain
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isOurDomain = hostname.includes('destino-sf'); // Adjust based on your domain
    
    return !(isLocalhost || isOurDomain);
  } catch (err) {
    return false;
  }
}

/**
 * Formats a date for display
 * @param date The date to format
 * @returns A formatted date string (e.g., "Monday, January 1, 2023")
 */
export function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Generates a short description for products based on their name and category
 * Since Square doesn't provide short descriptions, we create them based on product patterns
 * @param productName The name of the product
 * @param categoryName Optional category name for context
 * @returns A short, appealing description
 */
export function generateShortDescription(productName: string, categoryName?: string): string {
  if (!productName) return '';
  
  const name = productName.toLowerCase();
  const category = categoryName?.toLowerCase() || '';
  
  // Empanadas descriptions
  if (name.includes('empanada')) {
    if (name.includes('beef') || name.includes('argentine')) {
      return 'Traditional Argentine beef empanada with savory spices';
    }
    if (name.includes('chicken') || name.includes('huacatay')) {
      return 'Peruvian-style chicken empanada with aromatic herbs';
    }
    if (name.includes('pork') || name.includes('caribbean')) {
      return 'Caribbean-spiced pork empanada with tropical flavors';
    }
    if (name.includes('combo') || name.includes('frozen')) {
      return 'Assorted empanadas perfect for sharing';
    }
    if (name.includes('lomo') || name.includes('saltado')) {
      return 'Peruvian lomo saltado style empanada';
    }
    if (name.includes('peruvian')) {
      return 'Authentic Peruvian-style empanada';
    }
    return 'Handcrafted empanada with authentic Latin flavors';
  }
  
  // Alfajores descriptions
  if (name.includes('alfajor')) {
    if (name.includes('chocolate')) {
      return 'Rich chocolate alfajor with dulce de leche filling';
    }
    if (name.includes('lemon')) {
      return 'Zesty lemon alfajor with citrus notes';
    }
    if (name.includes('gluten')) {
      return 'Gluten-free alfajor with traditional dulce de leche';
    }
    if (name.includes('classic') || name.includes('traditional')) {
      return 'Classic alfajor with buttery cookies and dulce de leche';
    }
    return 'Traditional Argentine cookie with dulce de leche';
  }
  
  // Catering and platters
  if (name.includes('platter') || name.includes('catering')) {
    if (name.includes('cheese') || name.includes('charcuterie')) {
      return 'Artisan cheese and charcuterie selection';
    }
    if (name.includes('prawn') || name.includes('shrimp')) {
      return 'Fresh prawns with zesty cocktail sauce';
    }
    if (name.includes('plantain')) {
      return 'Crispy plantain chips with pepper cream sauce';
    }
    return 'Perfect for sharing and entertaining';
  }
  
  // Beverages
  if (name.includes('coffee') || name.includes('café')) {
    return 'Premium Latin American coffee blend';
  }
  if (name.includes('mate') || name.includes('yerba')) {
    return 'Traditional South American herbal tea';
  }
  
  // Desserts and sweets
  if (name.includes('dulce') || name.includes('caramel')) {
    return 'Rich and creamy dulce de leche treat';
  }
  if (name.includes('flan')) {
    return 'Silky smooth caramel custard dessert';
  }
  
  // Sauces and condiments
  if (name.includes('chimichurri')) {
    return 'Fresh herb and garlic sauce';
  }
  if (name.includes('salsa') || name.includes('sauce')) {
    return 'Authentic Latin American sauce';
  }
  
  // Default descriptions based on category
  if (category.includes('empanada')) {
    return 'Authentic Latin American pastry with savory filling';
  }
  if (category.includes('alfajor') || category.includes('cookie')) {
    return 'Traditional Latin American sweet treat';
  }
  if (category.includes('beverage') || category.includes('drink')) {
    return 'Refreshing Latin American beverage';
  }
  if (category.includes('sauce') || category.includes('condiment')) {
    return 'Authentic Latin American condiment';
  }
  
  // Generic fallback
  return 'Authentic Latin American specialty';
}

/**
 * Capitalizes the first letter of each word in a string
 * Useful for displaying product names properly
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Capitalizes only the first letter of a string
 * Useful for sentence-style capitalization
 */
export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
} 