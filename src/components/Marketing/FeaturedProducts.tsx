'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Dancing_Script } from 'next/font/google';
import { SpotlightPick } from '@/types/spotlight';

// Configure the font
const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export function FeaturedProducts() {
  const [spotlightPicks, setSpotlightPicks] = useState<SpotlightPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get product image with fallback
  const getProductImage = (pick: SpotlightPick): string => {
    return pick.product?.images?.[0] || '/images/fallbacks/product-default.svg';
  };

  // Fetch spotlight picks from the database
  useEffect(() => {
    const loadSpotlightPicks = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/spotlight-picks');

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            // Filter only active picks and sort by position
            const activePicks = result.data
              .filter((pick: SpotlightPick) => pick.isActive)
              .sort((a: SpotlightPick, b: SpotlightPick) => a.position - b.position);
            setSpotlightPicks(activePicks);
          }
        } else {
          console.error('Failed to fetch spotlight picks');
        }
      } catch (error) {
        console.error('Error loading spotlight picks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSpotlightPicks();
  }, []);

  const ProductCard = ({ pick, className }: { pick: SpotlightPick; className?: string }) => {
    const productData = {
      name: pick.product?.name || 'Product',
      description: pick.product?.description || '',
      price:
        pick.product?.price && pick.product.price > 0 ? `$${pick.product.price.toFixed(2)}` : '',
      imageUrl: getProductImage(pick),
      slug: pick.product?.slug || '#',
    };

    // Generate short description (max 80 characters)
    const shortDescription = productData.description
      ? productData.description.length > 80
        ? productData.description.substring(0, 80).trim() + '...'
        : productData.description
      : '';

    const linkHref = pick.product?.slug ? `/products/${pick.product.slug}` : '#';

    return (
      <Link href={linkHref} className={className}>
        <div
          className="relative rounded-3xl overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-lg"
          style={{ paddingBottom: '75%' }}
        >
          <Image
            src={productData.imageUrl}
            alt={productData.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105 absolute inset-0 rounded-3xl"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 85vw"
            priority
          />
        </div>
        <div className="mt-4">
          <h3 className="font-semibold text-lg text-gray-900">{productData.name}</h3>
          {shortDescription && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{shortDescription}</p>
          )}
          {productData.price && <p className="font-medium text-amber-600 mt-2">{productData.price}</p>}
        </div>
      </Link>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center ${dancingScript.className}`}
          >
            Spotlight Picks
          </h2>
          <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Loading our featured products...
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 rounded-3xl" style={{ paddingBottom: '75%' }}></div>
                <div className="mt-4">
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no active picks
  if (spotlightPicks.length === 0) {
    return (
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center ${dancingScript.className}`}
          >
            Spotlight Picks
          </h2>
          <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Check back soon for our featured products!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center ${dancingScript.className}`}
        >
          Spotlight Picks
        </h2>
        <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
          Discover our carefully curated selection of premium Peruvian products
        </p>

        <div
          className={`mt-12 ${
            spotlightPicks.length <= 3
              ? 'flex justify-center gap-6 max-w-6xl mx-auto' // Single line for 1-3 items
              : 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4' // Full grid for 4 items
          }`}
        >
          {spotlightPicks.map(pick => (
            <ProductCard
              key={pick.id || pick.position}
              pick={pick}
              className={`group cursor-pointer ${
                spotlightPicks.length <= 3
                  ? 'flex-shrink-0 w-64 sm:w-72 lg:w-80' // Fixed width, no wrapping
                  : '' // Let grid handle sizing
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
