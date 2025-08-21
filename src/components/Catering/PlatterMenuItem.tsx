'use client';

import React, { useState } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { CateringItemWithVariations, SquareItemVariation } from '@/types/catering';
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
import { toast } from '@/lib/toast';

interface PlatterMenuItemProps {
  item: CateringItemWithVariations; // Single item with Square native variations
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

// Helper function to format text to title case (keep existing function)

export const PlatterMenuItem: React.FC<PlatterMenuItemProps> = ({ item }) => {
  const { addItem } = useCateringCartStore();
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Get available variations (use item.variations if available, otherwise create default)
  const variations = item.variations && item.variations.length > 0 
    ? item.variations 
    : [{ id: item.id, name: item.name, price: item.price }];

  // Sort variations by price (small to large)
  const sortedVariations = variations.sort((a, b) => (a.price || 0) - (b.price || 0));

  // Set default selection to first variation if not set
  if (!selectedVariationId && sortedVariations.length > 0) {
    setSelectedVariationId(sortedVariations[0].id);
  }

  const selectedVariation = sortedVariations.find(v => v.id === selectedVariationId) || sortedVariations[0];

  if (!selectedVariation) {
    return null;
  }

  const handleAddToCart = () => {
    const cartItem = {
      id: selectedVariation.id,
      name: toTitleCase(selectedVariation.name),
      price: Number(selectedVariation.price || item.price),
      quantity: 1,
      image: item.imageUrl || '/images/catering/default-item.jpg',
      variantId: JSON.stringify({
        type: 'item',
        itemId: item.id,
        variationId: selectedVariation.id,
        variationName: selectedVariation.name,
        servingSize: item.servingSize,
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
            src={item.imageUrl || '/images/catering/default-item.jpg'}
            alt={toTitleCase(item.name)}
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
                {toTitleCase(item.name)}
              </h4>
              <div className="flex gap-1 mt-1">
                {item.isVegetarian && <DietaryBadge label="V" tooltip="Vegetarian" />}
                {item.isVegan && <DietaryBadge label="VG" tooltip="Vegan" />}
                {item.isGlutenFree && <DietaryBadge label="GF" tooltip="Gluten Free" />}
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-gray-800">
              ${Number(selectedVariation.price || item.price).toFixed(2)}
            </div>
          </div>

          {/* Variation Selection (only show if multiple variations) */}
          {sortedVariations.length > 1 && (
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Size:</label>
              <Select
                value={selectedVariationId}
                onValueChange={setSelectedVariationId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedVariations.map((variation) => (
                    <SelectItem key={variation.id} value={variation.id}>
                      {variation.name} (${Number(variation.price || item.price).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Serving Size */}
          {item.servingSize && (
            <div className="text-sm md:text-base font-medium text-gray-600 mb-2">
              <span className="font-bold">Serving: </span>
              {item.servingSize}
            </div>
          )}

          {/* Description */}
          <div className="mb-4 flex-grow">
            <p className="text-gray-600 text-sm md:text-base">
              {formatDescription(item.description)}
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
        item={item}
        type="item"
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
      />
    </>
  );
};
