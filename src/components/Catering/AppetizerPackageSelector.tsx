'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCateringCartStore } from '@/store/catering-cart';
import { CateringPackage, CateringItem } from '@/types/catering';
import { Users, CheckCircle, Circle, Info, ShoppingCart, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/toast';
import { cn, toTitleCase } from '@/lib/utils';
import { CateringPackageSkeletonSimple } from '@/components/ui/catering-package-skeleton';
import { sanitizeProductDescription } from '@/lib/utils/product-description';

interface AppetizerPackageSelectorProps {
  packages: CateringPackage[];
  availableItems: CateringItem[];
  isLoading?: boolean;
}

interface SelectedItems {
  [packageId: string]: string[]; // packageId -> array of selected item IDs
}

interface StickyButtonProps {
  visible: boolean;
  disabled: boolean;
  onClick: () => void;
  totalPrice: number;
  itemCount: number;
  isLoading: boolean;
}

interface SelectionProgress {
  current: number;
  required: number;
  percentage: number;
  isComplete: boolean;
}

// Utility function for throttling scroll events
const useThrottledScroll = (callback: () => void, delay: number) => {
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(() => {
    if (throttleRef.current) return;

    throttleRef.current = setTimeout(() => {
      callback();
      throttleRef.current = null;
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

// Enhanced Progress Component
const SelectionProgressIndicator: React.FC<{
  progress: SelectionProgress;
  currentPackage: CateringPackage | null;
  peopleCount: number;
}> = ({ progress, currentPackage, peopleCount }) => {
  const totalPrice = currentPackage ? currentPackage.pricePerPerson * peopleCount : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium text-gray-700">Selection Progress</span>
        </div>
        <div className="text-sm text-gray-600">
          {progress.current} of {progress.required} selected
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <motion.div
          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Price Information */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {progress.isComplete
            ? 'Ready to add!'
            : `Need ${progress.required - progress.current} more`}
        </span>
        <span className="font-semibold text-amber-700">Total: ${totalPrice.toFixed(2)}</span>
      </div>
    </motion.div>
  );
};

// Sticky Button Component
const StickyAddToCartButton: React.FC<StickyButtonProps> = ({
  visible,
  disabled,
  onClick,
  totalPrice,
  itemCount,
  isLoading,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            opacity: { duration: 0.2 },
          }}
          className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-gray-600">{itemCount} appetizers selected</div>
                <div className="text-lg font-bold text-amber-600">${totalPrice.toFixed(2)}</div>
              </div>
              <ShoppingCart className="h-6 w-6 text-amber-600" />
            </div>

            <Button
              onClick={onClick}
              disabled={disabled || isLoading}
              className={cn(
                'w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 text-base',
                'transition-all duration-200 transform',
                'hover:scale-105 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                'focus:ring-2 focus:ring-amber-500 focus:ring-offset-2'
              )}
              aria-label={`Add package to cart for $${totalPrice.toFixed(2)}`}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                'Add Package to Cart'
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const AppetizerPackageSelector: React.FC<AppetizerPackageSelectorProps> = ({
  packages,
  availableItems,
  isLoading = false,
}) => {
  const { addItem } = useCateringCartStore();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [showStickyButton, setShowStickyButton] = useState<boolean>(false);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);

  // Refs for scroll detection
  const originalButtonRef = useRef<HTMLDivElement>(null);

  // Get the currently selected package data
  const currentPackage = packages.find(p => p.id === selectedPackage);
  const requiredItemCount = currentPackage?.name.includes('5 Items')
    ? 5
    : currentPackage?.name.includes('7 Items')
      ? 7
      : currentPackage?.name.includes('9 Items')
        ? 9
        : 0;

  const currentSelectedItems = selectedItems[selectedPackage || ''] || [];

  // Calculate selection progress
  const selectionProgress: SelectionProgress = {
    current: currentSelectedItems.length,
    required: requiredItemCount,
    percentage: requiredItemCount > 0 ? (currentSelectedItems.length / requiredItemCount) * 100 : 0,
    isComplete: currentSelectedItems.length === requiredItemCount,
  };

  // Scroll detection for sticky button
  const checkButtonVisibility = useCallback(() => {
    if (!originalButtonRef.current || !selectedPackage) {
      setShowStickyButton(false);
      return;
    }

    const rect = originalButtonRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Show sticky button when original button is below the viewport
    const shouldShow = rect.top > windowHeight - 100;
    setShowStickyButton(shouldShow);
  }, [selectedPackage]);

  const throttledScrollHandler = useThrottledScroll(checkButtonVisibility, 100);

  // Setup scroll listeners
  useEffect(() => {
    if (!selectedPackage) {
      setShowStickyButton(false);
      return;
    }

    // Initial check
    checkButtonVisibility();

    // Add scroll listener
    window.addEventListener('scroll', throttledScrollHandler);
    window.addEventListener('resize', checkButtonVisibility);

    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
      window.removeEventListener('resize', checkButtonVisibility);
    };
  }, [selectedPackage, throttledScrollHandler, checkButtonVisibility]);

  // Function to get the correct image URL with fallback for missing appetizer package images
  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '/images/catering/appetizer-selection.jpg';

    // Check for problematic appetizer package URLs that don't exist
    if (url.includes('appetizer-package-') && url.includes('.jpg')) {
      return '/images/catering/appetizer-selection.jpg';
    }

    // AWS S3 URLs already have proper format
    if (
      url.includes('amazonaws.com') ||
      url.includes('s3.') ||
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      return url;
    }

    // For relative paths, ensure they start with a slash
    return url.startsWith('/') ? url : `/${url}`;
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    // Initialize selected items array if not exists
    if (!selectedItems[packageId]) {
      setSelectedItems(prev => ({
        ...prev,
        [packageId]: [],
      }));
    }
  };

  const handleItemToggle = (itemId: string) => {
    if (!selectedPackage) return;

    setSelectedItems(prev => {
      const currentItems = prev[selectedPackage] || [];
      const isSelected = currentItems.includes(itemId);

      if (isSelected) {
        // Remove item
        return {
          ...prev,
          [selectedPackage]: currentItems.filter(id => id !== itemId),
        };
      } else {
        // Add item if under limit
        if (currentItems.length < requiredItemCount) {
          return {
            ...prev,
            [selectedPackage]: [...currentItems, itemId],
          };
        } else {
          toast.error(`You can only select ${requiredItemCount} items for this package`);
          return prev;
        }
      }
    });
  };

  const handleAddToCart = async () => {
    if (!currentPackage || currentSelectedItems.length !== requiredItemCount) {
      toast.error(`Please select exactly ${requiredItemCount} items`);
      return;
    }

    setIsAddingToCart(true);

    try {
      const selectedItemNames = currentSelectedItems
        .map(itemId => availableItems.find(item => item.id === itemId)?.name)
        .filter(Boolean);

      const totalPrice = currentPackage.pricePerPerson * peopleCount;

      const cartItem = {
        id: currentPackage.id,
        name: `${toTitleCase(currentPackage.name)} for ${peopleCount} people`,
        price: totalPrice,
        quantity: 1,
        image: getImageUrl(currentPackage.imageUrl),
        variantId: JSON.stringify({
          type: 'appetizer-package',
          packageId: currentPackage.id,
          selectedItems: currentSelectedItems,
          selectedItemNames: selectedItemNames.map(name => (name ? toTitleCase(name) : '')),
          peopleCount,
        }),
      };

      addItem(cartItem);

      // Success feedback with animation delay
      await new Promise(resolve => setTimeout(resolve, 300));

      toast.success(
        `${toTitleCase(currentPackage.name)} added to catering cart for ${peopleCount} people`,
        {
          duration: 4000,
          icon: '🎉',
        }
      );

      // Reset selection
      setSelectedPackage(null);
      setSelectedItems({});
      setPeopleCount(2);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add package to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Add a custom formatted titleCase function to match other components
  const toTitleCase = (str: string | null | undefined): string => {
    if (!str) return '';

    // Words that should not be capitalized (articles, conjunctions, prepositions)
    const minorWords = [
      'a',
      'an',
      'the',
      'and',
      'but',
      'or',
      'for',
      'nor',
      'on',
      'at',
      'to',
      'from',
      'by',
      'de',
    ];

    // Split the string into words
    const words = str.toLowerCase().split(' ');

    // Always capitalize the first and last word
    return words
      .map((word, index) => {
        // Always capitalize first and last word, or if not a minor word
        if (index === 0 || index === words.length - 1 || !minorWords.includes(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(' ');
  };

  const getDietaryBadges = (item: CateringItem) => {
    const badges = [];
    if (item.isGlutenFree) badges.push('GF');
    if (item.isVegan) badges.push('VGN');
    else if (item.isVegetarian) badges.push('VG');
    return badges;
  };

  // Get styled badges with appropriate colors
  const getDietaryBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'GF':
        return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'VG':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'VGN':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      default:
        return 'bg-blue-100 text-blue-800 border border-blue-300';
    }
  };

  return (
    <div className="space-y-8">
      {/* 2025 Appetizer Menu Header */}
      <div className="text-center space-y-6">
        <div>
          <h3 className="text-3xl font-bold text-gray-800 mb-4">2025 Appetizer Menu</h3>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
            Create the perfect appetizer experience for your event. Choose from our signature
            packages featuring authentic Latin American flavors with fresh, local ingredients. All
            packages are fully customizable to accommodate dietary preferences.
          </p>
        </div>
      </div>

      {/* Show loading skeleton while loading */}
      {isLoading ? (
        <CateringPackageSkeletonSimple />
      ) : /* Check if packages are available */
      packages.length === 0 || availableItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-6xl">🍽️</div>
            <h4 className="text-xl font-semibold text-gray-700">
              Appetizer packages are being set up. Please check back soon!
            </h4>
            <div className="text-gray-600 space-y-2">
              <p>Our appetizer packages are currently being configured.</p>
              <p>
                {packages.length === 0 && availableItems.length === 0
                  ? 'Both packages and package items are missing.'
                  : packages.length === 0
                    ? 'Package options are missing.'
                    : 'Package-only items are missing.'}
              </p>
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              <p>Please contact us directly for appetizer catering at:</p>
              <p className="font-medium">james@destinosf.com</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Package Selection */}
          <div className="text-center space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Choose Your Appetizer Package
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Select from our curated appetizer packages. Each package is priced per person and
                includes your choice of appetizers from our 2025 menu.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {packages.map(pkg => {
                const itemCount = pkg.name.includes('5 Items')
                  ? 5
                  : pkg.name.includes('7 Items')
                    ? 7
                    : pkg.name.includes('9 Items')
                      ? 9
                      : 0;

                return (
                  <Card
                    key={pkg.id}
                    className={cn(
                      'cursor-pointer transition-all duration-200 hover:shadow-md',
                      selectedPackage === pkg.id ? 'ring-2 ring-amber-500 bg-amber-50' : ''
                    )}
                    onClick={() => handlePackageSelect(pkg.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        {selectedPackage === pkg.id ? (
                          <CheckCircle className="h-8 w-8 text-amber-600 mx-auto" />
                        ) : (
                          <Circle className="h-8 w-8 text-gray-400 mx-auto" />
                        )}
                      </div>

                      <h4 className="text-lg font-semibold mb-2">{itemCount} Appetizers</h4>

                      <div className="text-2xl font-bold text-amber-600 mb-2">
                        ${pkg.pricePerPerson.toFixed(2)}
                      </div>

                      <p className="text-sm text-gray-500">per person</p>

                      <Badge variant="outline" className="mt-3">
                        Min {pkg.minPeople} people
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* People Count Selector */}
          <AnimatePresence>
            {selectedPackage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gray-50 rounded-xl p-6"
              >
                <div className="text-center space-y-4">
                  <h4 className="text-lg font-semibold flex items-center justify-center gap-2">
                    <Users className="h-5 w-5" />
                    How many people?
                  </h4>

                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                      disabled={peopleCount <= 2}
                    >
                      -
                    </Button>

                    <span className="text-xl font-semibold min-w-[3rem] text-center">
                      {peopleCount}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPeopleCount(peopleCount + 1)}
                    >
                      +
                    </Button>
                  </div>

                  {currentPackage && (
                    <div className="text-center pt-2">
                      <p className="text-sm text-gray-600">
                        Total: ${(currentPackage.pricePerPerson * peopleCount).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Item Selection */}
          <AnimatePresence>
            {selectedPackage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
                role="region"
                aria-label="Appetizer selection"
              >
                <div className="text-center">
                  <h4 className="text-xl font-semibold mb-2">
                    Select {requiredItemCount} Appetizers
                  </h4>
                  <p className="text-gray-600">
                    Choose {requiredItemCount} appetizers for your package
                  </p>
                </div>

                {/* Enhanced Progress Indicator */}
                <SelectionProgressIndicator
                  progress={selectionProgress}
                  currentPackage={currentPackage ?? null}
                  peopleCount={peopleCount}
                />

                {/* Live Region for Screen Readers */}
                <div aria-live="polite" aria-atomic="true" className="sr-only">
                  {currentSelectedItems.length} of {requiredItemCount} appetizers selected.
                  {selectionProgress.isComplete
                    ? 'Selection complete, ready to add to cart.'
                    : `Please select ${requiredItemCount - currentSelectedItems.length} more appetizers.`}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableItems.map(item => {
                    const isSelected = currentSelectedItems.includes(item.id);
                    const canSelect = currentSelectedItems.length < requiredItemCount || isSelected;

                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'cursor-pointer transition-all duration-200 overflow-hidden',
                          isSelected ? 'ring-2 ring-green-500 bg-green-50' : '',
                          !canSelect ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                        )}
                        onClick={() => canSelect && handleItemToggle(item.id)}
                        role="button"
                        tabIndex={canSelect ? 0 : -1}
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Remove' : 'Add'} ${toTitleCase(item.name)} ${isSelected ? 'from' : 'to'} selection`}
                        onKeyDown={e => {
                          if ((e.key === 'Enter' || e.key === ' ') && canSelect) {
                            e.preventDefault();
                            handleItemToggle(item.id);
                          }
                        }}
                      >
                        <div className="relative w-full h-32">
                          <SafeImage
                            src={getImageUrl(item.imageUrl)}
                            alt={toTitleCase(item.name)}
                            fill
                            className="object-cover"
                            fallbackSrc="/images/catering/default-item.jpg"
                            maxRetries={0}
                            priority={false}
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="h-6 w-6 text-green-600 bg-white rounded-full" />
                            </div>
                          )}
                          {!canSelect && !isSelected && (
                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                              <Circle className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <CardContent className="p-4">
                          <h5 className="font-medium text-sm leading-tight mb-2">
                            {toTitleCase(item.name)}
                          </h5>

                          {item.description && (
                            <div
                              className="text-xs text-gray-600 mb-3 line-clamp-2"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeProductDescription(item.description),
                              }}
                            />
                          )}

                          <div className="flex flex-wrap gap-1">
                            {getDietaryBadges(item).map(badge => (
                              <span
                                key={badge}
                                className={`inline-flex items-center justify-center ${getDietaryBadgeStyle(badge)} text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm`}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Original Add to Cart Button */}
                <div ref={originalButtonRef} className="text-center pt-6" id="original-add-to-cart">
                  <Button
                    onClick={handleAddToCart}
                    disabled={!selectionProgress.isComplete || isAddingToCart}
                    className={cn(
                      'bg-amber-600 hover:bg-amber-700 px-8 py-3 text-lg',
                      'transition-all duration-200 transform hover:scale-105',
                      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                      'focus:ring-2 focus:ring-amber-500 focus:ring-offset-2'
                    )}
                    aria-describedby="cart-button-description"
                  >
                    {isAddingToCart ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        Adding to Cart...
                      </div>
                    ) : (
                      <>
                        Add Package to Cart
                        {currentPackage && (
                          <span className="ml-2">
                            (${(currentPackage.pricePerPerson * peopleCount).toFixed(2)})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                  <div id="cart-button-description" className="sr-only">
                    {selectionProgress.isComplete
                      ? `Add ${requiredItemCount} selected appetizers to cart for ${peopleCount} people`
                      : `Select ${requiredItemCount - currentSelectedItems.length} more appetizers to enable adding to cart`}
                  </div>
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Catering orders must be confirmed 5 days in advance</li>
                      <li>• All items can be customized for dietary restrictions</li>
                      <li>• Contact us for larger groups or special requests</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky Add to Cart Button */}
          <StickyAddToCartButton
            visible={showStickyButton && selectedPackage !== null}
            disabled={!selectionProgress.isComplete}
            onClick={handleAddToCart}
            totalPrice={currentPackage ? currentPackage.pricePerPerson * peopleCount : 0}
            itemCount={currentSelectedItems.length}
            isLoading={isAddingToCart}
          />
        </>
      )}
    </div>
  );
};
