'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import { Product, Variant } from '@/types/product';
import { useState, useEffect } from 'react';
import { formatPrice, getProxiedImageUrl, generateShortDescription, truncateText } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

// Helper function to validate image URLs
const validateImageUrl = async (url: string): Promise<boolean> => {
  if (!url) return false;
  // Skip validation for relative URLs or already proxied URLs
  if (url.startsWith('/') || url.includes('/api/proxy/image')) return true;
  
  try {
    // Create a new Image object and try to load the image
    return new Promise<boolean>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      // Add cache busting to make sure we're not getting a cached image
      img.src = `${url}${url.includes('?') ? '&' : '?'}cb=${new Date().getTime()}`;
    });
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  
  // Add state to handle image loading failures
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Check if product has valid variants
  const hasVariants = product.variants && Array.isArray(product.variants) && 
                     product.variants.filter(v => v && v.id).length > 0;
  
  // Only set a selected variant if there are valid variants
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    hasVariants && product.variants ? product.variants[0] : null
  );

  // Calculate display price based on selected variant or product price
  const displayPrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined 
    ? selectedVariant.price 
    : product.price;

  // Generate short description if none exists
  const shortDescription = product.description 
    ? truncateText(product.description, 80)
    : generateShortDescription(product.name, product.category?.name);

  // Validate and set image URL on component mount and when product changes
  useEffect(() => {
    const validateAndSetImage = async () => {
      // Start with loading state
      setImageLoading(true);
      setImageError(false);
      
      // Default/fallback image
      const fallbackImage = '/images/menu/empanadas.png';
      
      // Get the first image from product.images if it exists
      const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
      
      if (firstImage) {
        try {
          // Process the URL through our proxy if it's external
          const processedUrl = getProxiedImageUrl(firstImage);
          
          // Check if the image is valid
          const isValid = await validateImageUrl(processedUrl);
          
          if (isValid) {
            setImageUrl(processedUrl);
            setImageError(false);
          } else {
            console.warn(`Invalid image URL for product ${product.name}:`, firstImage);
            setImageUrl(fallbackImage);
            setImageError(true);
          }
        } catch (error) {
          console.error(`Error processing image for ${product.name}:`, error);
          setImageUrl(fallbackImage);
          setImageError(true);
        }
      } else {
        // No image available, use fallback
        setImageUrl(fallbackImage);
        setImageError(true);
      }
      
      // Done loading
      setImageLoading(false);
    };
    
    validateAndSetImage();
  }, [product.id, product.images, product.name]);

  const handleAddToCart = () => {
    // Ensure priceToAdd is a number, defaulting to 0 if conversion fails
    const priceToAdd = Number(displayPrice) || 0;

    addItem({
      id: product.id,
      name: product.name + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
      price: priceToAdd,
      quantity: 1,
      image: imageUrl || '/images/menu/empanadas.png', // Use our validated imageUrl or fallback
      variantId: selectedVariant?.id, // Add variantId
    });

    // Update toast message to include variant name if selected
    toast.success(`${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart!`);
  };

  return (
    <div className="group relative bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col rounded-lg overflow-hidden">
      <Link 
        href={`/products/${product.slug || product.id}`} // Use slug or fallback to id
        className="flex flex-row md:flex-col h-full" // Use flex-grow to allow content to expand
      >
        {/* Image Container - Mobile: Left side, Desktop: Top */}
        <div className="w-[100px] h-[100px] md:w-full md:h-auto relative overflow-hidden md:rounded-t-lg flex-shrink-0 flex items-center justify-center bg-gray-50 m-2 md:m-0 rounded-lg md:aspect-[4/3]">
          {imageLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-6 w-6 md:h-8 md:w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            </div>
          ) : imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain md:object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              sizes="(min-width: 768px) 33vw, 100px"
              priority={product.featured}
              crossOrigin="anonymous"
              onError={() => {
                console.error("Image failed to load:", imageUrl);
                setImageError(true);
                setImageUrl('/images/menu/empanadas.png'); // Set to fallback on error
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-xs text-gray-400">No image</span>
            </div>
          )}
          
          {product.featured && (
            <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 md:px-2 md:py-1 rounded-full z-10">
              <span className="md:hidden">★</span>
              <span className="hidden md:inline">Featured</span>
            </div>
          )}
        </div>
        
        {/* Content Container */}
        <div className="flex-1 p-2 md:p-4 flex flex-col justify-between min-w-0">
          {/* Top part: Name and Description */}
          <div className="flex-1">
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-1 line-clamp-2 md:mb-2 group-hover:text-indigo-600 transition-colors leading-tight">
              {product.name}
            </h3>
            
            {/* Short description - always show on mobile, conditional on desktop */}
            {shortDescription && (
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                {shortDescription}
              </p>
            )}
          </div>
          
          {/* Bottom part: Variants, Price, Button */}
          <div className="mt-auto space-y-2"> 
            {/* Variant Selector - Only show if multiple variants exist */}
            {hasVariants && product.variants && product.variants.length > 1 && (
              <div>
                <select
                  // Prevent link navigation when clicking the select
                  onClick={(e) => e.preventDefault()} 
                  className="w-full border rounded-md py-1 px-2 text-xs md:text-sm border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedVariant?.id || ''}
                  onChange={(e) => {
                    const variant = product.variants?.find(v => v.id === e.target.value);
                    setSelectedVariant(variant || null);
                  }}
                  aria-label={`Select ${product.name} option`}
                >
                  {product.variants
                    .filter(variant => variant && variant.id) // Ensure variant has an ID
                    .map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name} - ${formatPrice(variant.price !== null ? Number(variant.price) : Number(product.price))}
                      </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price and Add to Cart Button */}
            <div className="flex items-center justify-between pt-1 md:pt-3 md:border-t md:border-gray-100">
              <span className="text-sm md:text-lg font-bold text-gray-900">
                ${formatPrice(Number(displayPrice))}
              </span>
              <Button
                onClick={e => {
                  e.preventDefault(); // Keep preventing link navigation
                  handleAddToCart();
                }}
                className="bg-[#F7B614] hover:bg-[#E5A912] text-white font-medium px-2 py-1 md:px-5 md:py-2 rounded-full transition-colors duration-300 text-xs md:text-sm"
                variant="ghost"
                aria-label={`Add ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} to cart`}
              >
                <span className="md:hidden">+Add</span>
                <span className="hidden md:inline">Add to Cart</span>
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}