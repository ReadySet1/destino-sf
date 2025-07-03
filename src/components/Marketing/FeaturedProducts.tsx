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

interface PersonalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pick: SpotlightPick | null;
}

interface NewFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  pick: SpotlightPick | null;
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

function PersonalizeModal({ isOpen, onClose, pick }: PersonalizeModalProps) {
  const [personalMessage, setPersonalMessage] = useState('');

  if (!isOpen || !pick) return null;

  const productName = pick.isCustom ? pick.customTitle : pick.product?.name;
  const productPrice = pick.isCustom ? pick.customPrice : pick.product?.price;
  const productImage = pick.isCustom ? pick.customImageUrl : pick.product?.images?.[0];

  const handlePersonalize = () => {
    // Here you can add logic to handle the personalization
    // For now, we'll just show an alert and close the modal
    alert(`Personalized "${productName}" with message: "${personalMessage}"`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-8 mx-4 max-w-lg w-full shadow-2xl transform transition-all">
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

          {/* Product Image */}
          {productImage && (
            <div className="mb-6">
              <Image
                src={productImage}
                alt={productName || 'Product'}
                width={200}
                height={200}
                className="mx-auto rounded-lg object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Personalize Your {productName}</h3>
            <p className="text-gray-600 mb-4">
              {pick.personalizeText || 'Add a personal touch to make this order special!'}
            </p>
            <p className="text-lg font-semibold text-amber-600 mb-4">
              ${typeof productPrice === 'number' ? productPrice.toFixed(2) : productPrice}
            </p>

            {/* Personalization Input */}
            <div className="text-left mb-6">
              <label htmlFor="personalMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                id="personalMessage"
                rows={3}
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add a special message for your order..."
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{personalMessage.length}/200 characters</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={handlePersonalize}
              className="flex-1 bg-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Personalize & Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewFeatureModal({ isOpen, onClose, pick }: NewFeatureModalProps) {
  if (!isOpen || !pick) return null;

  const productName = pick.isCustom ? pick.customTitle : pick.product?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-8 mx-4 max-w-lg w-full shadow-2xl transform transition-all">
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
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {pick.newFeatureTitle || `Coming Soon!`}
            </h3>
            <p className="text-gray-600 mb-6">
              {pick.newFeatureDescription || 'Our Monthly Subscription service is currently in development. Stay tuned for delicious monthly deliveries!'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-orange-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
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
  const [isPersonalizeModalOpen, setIsPersonalizeModalOpen] = useState<boolean>(false);
  const [isNewFeatureModalOpen, setIsNewFeatureModalOpen] = useState<boolean>(false);
  const [selectedPersonalizePick, setSelectedPersonalizePick] = useState<SpotlightPick | null>(null);
  const [selectedNewFeaturePick, setSelectedNewFeaturePick] = useState<SpotlightPick | null>(null);
  const [spotlightPicks, setSpotlightPicks] = useState<SpotlightPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Smart fallback image function for custom spotlight picks
  const getSmartFallbackImage = (pick: SpotlightPick): string => {
    if (!pick.isCustom) {
      return pick.product?.images?.[0] || '/images/fallbacks/product-default.svg';
    }

    // For custom picks, determine fallback based on content
    const title = pick.customTitle?.toLowerCase() || '';
    
    // Check for specific keywords to provide contextual fallbacks
    if (title.includes('subscription') || title.includes('monthly') || title.includes('weekly')) {
      return '/images/fallbacks/product-default.svg'; // Generic for subscriptions
    }
    if (title.includes('alfajor') || title.includes('cookie') || title.includes('dessert')) {
      return '/images/fallbacks/alfajores-default.svg';
    }
    if (title.includes('empanada') || title.includes('meat') || title.includes('chicken') || title.includes('beef')) {
      return '/images/fallbacks/empanadas-default.svg';
    }
    if (title.includes('catering') || title.includes('event') || title.includes('party')) {
      return '/images/fallbacks/catering-default.svg';
    }
    if (title.includes('drink') || title.includes('beverage') || title.includes('juice') || title.includes('coffee')) {
      return '/images/fallbacks/drinks-default.svg';
    }
    if (title.includes('cafe') || title.includes('coffee')) {
      return '/images/fallbacks/cafe-default.svg';
    }
    
    // Default fallback for any other custom content
    return '/images/fallbacks/product-default.svg';
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
        console.error('Error loading spotlight picks:', error);
        // Fallback to default hardcoded data
        setSpotlightPicks(getDefaultPicks());
      } finally {
        setIsLoading(false);
      }
    };

    loadSpotlightPicks();
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
      personalizeText: 'Perfect for celebrating with pride! Add a personal message to make it extra special.',
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
    e.preventDefault();
    
    // Check if this product should show new feature modal
    if (pick.showNewFeatureModal) {
      setSelectedNewFeaturePick(pick);
      setIsNewFeatureModalOpen(true);
      return;
    }
    
    // Check if this is a subscription product (you can customize this logic)
    if (pick.customTitle?.toLowerCase().includes('subscription') || 
        pick.product?.name?.toLowerCase().includes('subscription')) {
      setIsModalOpen(true);
      return;
    }
    
    // Check if this product has personalize text and should open personalize modal
    if (pick.personalizeText) {
      setSelectedPersonalizePick(pick);
      setIsPersonalizeModalOpen(true);
      return;
    }
    
    // Check if there's a custom link
    if (pick.customLink) {
      if (pick.customLink.startsWith('http')) {
        window.open(pick.customLink, '_blank');
      } else {
        window.location.href = pick.customLink;
      }
      return;
    }
    
    // For other custom items, we can add more logic here
    // No special action configured
    alert(`More info about ${pick.isCustom ? pick.customTitle : pick.product?.name} coming soon!`);
  };

  const ProductCard = ({ pick, className }: { pick: SpotlightPick; className?: string }) => {
    const isSubscription = pick.customTitle?.toLowerCase().includes('subscription') || 
                          pick.product?.name?.toLowerCase().includes('subscription');
    const isPersonalizable = !!pick.personalizeText;
    const isNewFeature = !!pick.showNewFeatureModal;
    const hasCustomLink = !!pick.customLink;
    
    // Determine product data
    const productData = pick.isCustom ? {
      name: pick.customTitle || 'Custom Product',
      price: pick.customPrice && pick.customPrice > 0 ? `$${pick.customPrice.toFixed(2)}` : '',
      imageUrl: pick.customImageUrl || getSmartFallbackImage(pick),
      slug: '#'
    } : {
      name: pick.product?.name || 'Product',
      price: pick.product?.price && pick.product.price > 0 ? `$${pick.product.price.toFixed(2)}` : '',
      imageUrl: pick.product?.images?.[0] || getSmartFallbackImage(pick),
      slug: pick.product?.slug || '#'
    };

    if (isSubscription || isPersonalizable || isNewFeature || hasCustomLink) {
      return (
        <div className={`${className} relative`}>
          <button
            onClick={e => handleProductClick(e, pick)}
            className="text-left w-full"
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
                data-testid="spotlight-image"
              />
              {/* Badges */}
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {/* New Feature Badge */}
                {isNewFeature && (
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-lg">
                    {pick.newFeatureBadgeText || 'NEW'}
                  </div>
                )}

              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-lg text-gray-900">{productData.name}</h3>
              {productData.price && <p className="font-medium text-amber-600">{productData.price}</p>}
              {isPersonalizable && (
                <p className="text-sm text-purple-600 italic mt-1">
                  ✨ {pick.personalizeText}
                </p>
              )}
              {isNewFeature && (
                <p className="text-sm text-blue-600 italic mt-1">
                  {pick.newFeatureDescription || 'New features available!'}
                </p>
              )}
            </div>
          </button>
        </div>
      );
    }

    // Determine the correct link
    const linkHref = pick.customLink 
      ? pick.customLink
      : pick.isCustom 
        ? '#' // Or whatever you want for custom items
        : pick.product?.slug 
          ? `/products/${pick.product.slug}`
          : `/products/category/${productData.slug}`;

    return (
      <Link
        href={linkHref}
        className={className}
        {...(pick.customLink?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
            data-testid="spotlight-image"
          />
        </div>
        <div className="mt-4">
          <h3 className="font-semibold text-lg text-gray-900">{productData.name}</h3>
          {productData.price && <p className="font-medium text-amber-600">{productData.price}</p>}
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

          <div className={`mt-12 ${
            spotlightPicks.length <= 3 
              ? 'flex justify-center gap-6 max-w-6xl mx-auto' // Single line for 1-3 items
              : 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4' // Full grid for 4 items
          }`}>
            {spotlightPicks.map((pick) => (
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

      <ComingSoonModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <PersonalizeModal 
        isOpen={isPersonalizeModalOpen} 
        onClose={() => {
          setIsPersonalizeModalOpen(false);
          setSelectedPersonalizePick(null);
        }} 
        pick={selectedPersonalizePick}
      />
      <NewFeatureModal 
        isOpen={isNewFeatureModalOpen} 
        onClose={() => {
          setIsNewFeatureModalOpen(false);
          setSelectedNewFeaturePick(null);
        }} 
        pick={selectedNewFeaturePick}
      />
    </>
  );
}