'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import { Product } from '@/types/product';
import { useState, useEffect } from 'react';
import { formatPrice, getProxiedImageUrl } from '@/lib/utils';
import { AddToCartButton } from './AddToCartButton';
import { serializeDecimal } from '@/utils/serialization';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
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

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { id, name, price, images, slug } = product;
  const imageUrl = images && images.length > 0 ? images[0] : '/images/product-placeholder.jpg';
  const productUrl = slug ? `/products/${slug}` : `/products/${id}`;

  // Price should already be a number by the time it reaches this component
  // This is just a safeguard in case it's still a Decimal-like object
  const numericPrice = typeof price === 'number' ? price : serializeDecimal(price) || 0;

  return (
    <div className="group relative rounded-lg border bg-white shadow-sm transition-all hover:shadow-md">
      <Link href={productUrl} className="block overflow-hidden rounded-t-lg">
        <div className="aspect-square relative">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
            priority={priority}
          />
        </div>
      </Link>
      
      <div className="p-4">
        <Link href={productUrl} className="block">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
            {name}
          </h3>
        </Link>
        
        <div className="mt-2 flex items-center justify-between">
          <p className="font-semibold">{formatPrice(numericPrice)}</p>
          
          <AddToCartButton 
            product={product} 
            size="sm"
            variant="outline"
          />
        </div>
      </div>
    </div>
  );
}
