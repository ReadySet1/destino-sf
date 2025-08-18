'use client';

import React, { useState } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { CateringItem } from '@/types/catering';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CateringOrderModal } from '@/components/Catering/CateringOrderModal';
import { ShoppingCart } from 'lucide-react';
import { useCateringCartStore } from '@/store/catering-cart';
import { toast } from 'react-hot-toast';

interface PlatterMenuItemProps {
  items: CateringItem[]; // Now accepts an array of related platter items (Small/Large)
}

interface DietaryBadgeProps {
  label: string;
  tooltip: string;
}

const DietaryBadge: React.FC<DietaryBadgeProps> = ({ label, tooltip }) => (
  <span
    className="inline-flex items-center justify-center bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm"
    title={tooltip}
  >
    {label}
  </span>
);

// Helper functions for text formatting
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

const formatDescription = (str: string | null | undefined): string => {
  if (!str) return '';
  const trimmedStr = str.trim();
  return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1);
};

// Extract base platter name from size-specific name
const getBasePlatterName = (name: string): string => {
  return name.replace(/ - (Small|Large)$/, '');
};

export const PlatterMenuItem: React.FC<PlatterMenuItemProps> = ({ items }) => {
  const { addItem } = useCateringCartStore();
  const [selectedSize, setSelectedSize] = useState<'small' | 'large'>('small');
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Sort items to ensure consistent ordering (Small first, then Large)
  const sortedItems = items.sort((a, b) => {
    if (a.name.includes('Small')) return -1;
    if (b.name.includes('Small')) return 1;
    return 0;
  });

  const smallItem = sortedItems.find(item => item.name.includes('Small'));
  const largeItem = sortedItems.find(item => item.name.includes('Large'));

  if (!smallItem && !largeItem) {
    return null;
  }

  // Use the first available item for base info
  const baseItem = smallItem || largeItem!;
  const baseName = getBasePlatterName(baseItem.name);
  const currentItem = selectedSize === 'small' ? smallItem : largeItem;

  if (!currentItem) {
    // If selected size doesn't exist, fall back to available size
    const availableItem = smallItem || largeItem!;
    const availableSize = smallItem ? 'small' : 'large';
    setSelectedSize(availableSize);
    return null; // Re-render with correct size
  }

  // Function to get the correct image URL
  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '/images/catering/default-item.jpg';

    if (
      url.includes('amazonaws.com') ||
      url.includes('s3.') ||
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      return url;
    }

    return url.startsWith('/') ? url : `/${url}`;
  };

  const handleAddToCart = () => {
    const cartItem = {
      id: `${currentItem.id}`,
      name: toTitleCase(currentItem.name),
      price: Number(currentItem.price),
      quantity: 1,
      image: getImageUrl(currentItem.imageUrl),
      variantId: JSON.stringify({
        type: 'item',
        itemId: currentItem.id,
        size: selectedSize,
        servingSize: currentItem.servingSize,
      }),
    };

    addItem(cartItem);
    toast.success(`${toTitleCase(cartItem.name)} added to your catering cart`);
  };

  return (
    <>
      <div className="h-full border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
        <div className="relative w-full h-48">
          <SafeImage
            src={getImageUrl(currentItem.imageUrl)}
            alt={toTitleCase(baseName)}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            fallbackSrc="/images/catering/default-item.jpg"
            maxRetries={3}
            priority={false}
          />
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-lg md:text-xl font-semibold text-gray-800">
                {toTitleCase(baseName)}
              </h4>
              <div className="flex gap-1 mt-1">
                {baseItem.isVegetarian && <DietaryBadge label="V" tooltip="Vegetarian" />}
                {baseItem.isVegan && <DietaryBadge label="VG" tooltip="Vegan" />}
                {baseItem.isGlutenFree && <DietaryBadge label="GF" tooltip="Gluten Free" />}
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-gray-800">
              ${Number(currentItem.price).toFixed(2)}
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Size:</label>
            <Select
              value={selectedSize}
              onValueChange={(value: 'small' | 'large') => setSelectedSize(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {smallItem && (
                  <SelectItem value="small">
                    Small - {smallItem.servingSize} (${Number(smallItem.price)})
                  </SelectItem>
                )}
                {largeItem && (
                  <SelectItem value="large">
                    Large - {largeItem.servingSize} (${Number(largeItem.price)})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Serving Size */}
          <div className="text-sm md:text-base font-medium text-gray-600 mb-2">
            <span className="font-bold">Serving: </span>
            {currentItem.servingSize}
          </div>

          {/* Description */}
          <div className="mb-4 flex-grow">
            <p className="text-gray-600 text-sm md:text-base">
              {formatDescription(currentItem.description)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrderModal(true)}
              className="flex-1 border-gray-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-colors"
            >
              View Details
            </Button>
            <Button
              size="sm"
              onClick={handleAddToCart}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>

      <CateringOrderModal
        item={currentItem}
        type="item"
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
      />
    </>
  );
};
