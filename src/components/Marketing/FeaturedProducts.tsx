'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Dancing_Script } from 'next/font/google';
import { SpotlightPick } from '@/types/spotlight';

// Configuramos la fuente al igual que en el otro componente
const dancingScript = Dancing_Script({
  // <-- ¡Nueva configuración de fuente!
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ComingSoonModal({ isOpen, onClose }: ComingSoonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-8 mx-4 max-w-md w-full shadow-2xl transform transition-all">
        <div className="text-center">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon!</h3>
            <p className="text-gray-600">
              Our Monthly Subscription service is currently in development. Stay tuned for delicious
              monthly deliveries!
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeaturedProducts() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [spotlightPicks, setSpotlightPicks] = useState<SpotlightPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch spotlight picks from the database
  useEffect(() => {
    const fetchSpotlightPicks = async () => {
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
          } else {
            // Fallback to default hardcoded data
            setSpotlightPicks(getDefaultPicks());
          }
        } else {
          console.error('Failed to fetch spotlight picks, using fallback data');
          // Fallback to default hardcoded data
          setSpotlightPicks(getDefaultPicks());
        }
      } catch (error) {
        console.error('Error fetching spotlight picks:', error);
        // Fallback to default hardcoded data
        setSpotlightPicks(getDefaultPicks());
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpotlightPicks();
  }, []);

  // Default hardcoded picks as fallback
  const getDefaultPicks = (): SpotlightPick[] => [
    {
      position: 1,
      isCustom: true,
      isActive: true,
      customTitle: 'Pride Alfajores',
      customPrice: 24.99,
      customImageUrl: '/images/assets/2Recurso 5.png',
    },
    {
      position: 2,
      isCustom: true,
      isActive: true,
      customTitle: 'Huacatay Chicken Empanadas',
      customPrice: 39.99,
      customImageUrl: '/images/assets/2Recurso 9.png',
    },
    {
      position: 3,
      isCustom: true,
      isActive: true,
      customTitle: 'Aji Amarillo Salsa',
      customPrice: 19.99,
      customImageUrl: '/images/assets/2Recurso 7.png',
    },
    {
      position: 4,
      isCustom: true,
      isActive: true,
      customTitle: 'Monthly Subscription',
      customPrice: 15.99,
      customImageUrl: '/images/assets/2Recurso 20.png',
    },
  ];

  const handleProductClick = (e: React.MouseEvent, pick: SpotlightPick) => {
    // Check if this is a subscription product (you can customize this logic)
    if (pick.customTitle?.toLowerCase().includes('subscription') || 
        pick.product?.name?.toLowerCase().includes('subscription')) {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const ProductCard = ({ pick, className }: { pick: SpotlightPick; className?: string }) => {
    const isSubscription = pick.customTitle?.toLowerCase().includes('subscription') || 
                          pick.product?.name?.toLowerCase().includes('subscription');
    
    // Determine product data
    const productData = pick.isCustom ? {
      name: pick.customTitle || 'Custom Product',
      price: pick.customPrice ? `$${pick.customPrice.toFixed(2)}` : '$0.00',
      imageUrl: pick.customImageUrl || '/images/placeholder-product.jpg',
      slug: '#'
    } : {
      name: pick.product?.name || 'Product',
      price: pick.product?.price ? `$${pick.product.price.toFixed(2)}` : '$0.00',
      imageUrl: pick.product?.images?.[0] || '/images/placeholder-product.jpg',
      slug: pick.product?.slug || '#'
    };

    if (isSubscription) {
      return (
        <button
          onClick={e => handleProductClick(e, pick)}
          className={`${className} text-left w-full`}
        >
          <div
            className="relative rounded-3xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg"
            style={{ paddingBottom: '75%' }}
          >
            <Image
              src={productData.imageUrl}
              alt={productData.name}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105 absolute inset-0 rounded-3xl"
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 85vw"
              priority
            />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-lg text-gray-900">{productData.name}</h3>
            <p className="font-medium text-amber-600">{productData.price}</p>
          </div>
        </button>
      );
    }

    // Determine the correct link
    const linkHref = pick.isCustom 
      ? '#' // Or whatever you want for custom items
      : pick.product?.slug 
        ? `/products/${pick.product.slug}`
        : `/products/category/${productData.slug}`;

    return (
      <Link
        href={linkHref}
        className={className}
      >
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
          <p className="font-medium text-amber-600">{productData.price}</p>
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
            {[1, 2, 3, 4].map((i) => (
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
    <>
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

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {spotlightPicks.map((pick) => (
              <ProductCard
                key={pick.id || pick.position}
                pick={pick}
                className="group cursor-pointer"
              />
            ))}
          </div>
        </div>
      </div>

      <ComingSoonModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
