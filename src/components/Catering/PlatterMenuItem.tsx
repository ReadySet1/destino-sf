'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CateringItem } from '@/types/catering';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CateringOrderModal } from '@/components/Catering/CateringOrderModal';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { toast } from 'react-hot-toast';

interface PlatterMenuItemProps {
  item: CateringItem;
}

// Define size options for each platter type
const PLATTER_SIZES = {
  'Plantain Chips Platter': {
    small: { price: 45.00, servingSize: '10-20 people', description: 'Yellow pepper cream sauce (approximately 10-20 people)' },
    large: { price: 80.00, servingSize: '25-40 people', description: 'Yellow pepper cream sauce (approximately 25-40 people)' }
  },
  'Cocktail Prawn Platter': {
    small: { price: 80.00, servingSize: '10-20 people', description: 'Jumbo tiger prawns / zesty cocktail sauce - 25 prawns (approximately 10-20 people)' },
    large: { price: 150.00, servingSize: '25-40 people', description: 'Jumbo tiger prawns / zesty cocktail sauce - 50 prawns (approximately 25-40 people)' }
  },
  'Cheese & Charcuterie Platter': {
    small: { price: 150.00, servingSize: '10-20 people', description: 'Selection of local & imported artisan - 8oz portions of 4 offerings (approximately 10-20 people)' },
    large: { price: 280.00, servingSize: '25-40 people', description: 'Selection of local & imported artisan - 8oz portions of 6 offerings (approximately 25-40 people)' }
  }
};

// Helper functions for text formatting
const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

const formatDescription = (str: string | null | undefined): string => {
  if (!str) return '';
  const trimmedStr = str.trim();
  return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1);
};

export const PlatterMenuItem: React.FC<PlatterMenuItemProps> = ({ item }) => {
  const { addItem } = useCartStore();
  const [selectedSize, setSelectedSize] = useState<'small' | 'large'>('small');
  const [showOrderModal, setShowOrderModal] = useState(false);

  const { name, isVegetarian, isVegan, isGlutenFree, imageUrl } = item;
  
  // Get size configuration for this platter
  const sizeConfig = PLATTER_SIZES[name as keyof typeof PLATTER_SIZES];
  
  if (!sizeConfig) {
    // Fallback for platters not in our configuration
    return null;
  }

  const currentSize = sizeConfig[selectedSize];
  
  // Function to get the correct image URL
  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '/images/catering/default-item.jpg';
    
    if (url.includes('amazonaws.com') || url.includes('s3.') || 
        url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    return url.startsWith('/') ? url : `/${url}`;
  };

  const handleAddToCart = () => {
    const cartItem = {
      id: `${item.id}-${selectedSize}`,
      name: `${name} - ${selectedSize === 'small' ? 'Small' : 'Large'}`,
      price: currentSize.price,
      quantity: 1,
      image: getImageUrl(imageUrl),
      variantId: JSON.stringify({
        type: 'item',
        itemId: item.id,
        size: selectedSize,
        servingSize: currentSize.servingSize
      })
    };

    addItem(cartItem);
    toast.success(`${cartItem.name} added to your cart`);
  };

  // Create a modified item for the modal with current size info
  const modalItem = {
    ...item,
    price: currentSize.price,
    description: currentSize.description,
    servingSize: currentSize.servingSize
  };

  return (
    <>
      <div className="h-full border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
        <div className="relative w-full h-48">
          <Image
            src={getImageUrl(imageUrl)}
            alt={toTitleCase(name)}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/catering/default-item.jpg';
            }}
            priority={false}
            loading="lazy"
          />
        </div>
        
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-lg md:text-xl font-semibold text-gray-800">
                {toTitleCase(name)}
              </h4>
              <div className="flex gap-1 mt-1">
                {isVegetarian && <DietaryBadge label="V" tooltip="Vegetarian" />}
                {isVegan && <DietaryBadge label="VG" tooltip="Vegan" />}
                {isGlutenFree && <DietaryBadge label="GF" tooltip="Gluten Free" />}
              </div>
            </div>
            <div className="text-lg md:text-xl font-bold text-gray-800">
              ${currentSize.price.toFixed(2)}
            </div>
          </div>
          
          {/* Size Selection */}
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Size:
            </label>
            <Select value={selectedSize} onValueChange={(value: 'small' | 'large') => setSelectedSize(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">
                  Small - {sizeConfig.small.servingSize} (${sizeConfig.small.price})
                </SelectItem>
                <SelectItem value="large">
                  Large - {sizeConfig.large.servingSize} (${sizeConfig.large.price})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Serving Size */}
          <div className="text-sm md:text-base font-medium text-gray-600 mb-2">
            <span className="font-bold">Serving: </span>
            {currentSize.servingSize}
          </div>
          
          {/* Description */}
          <div className="mb-4 flex-grow">
            <p className="text-gray-600 text-sm md:text-base">
              {formatDescription(currentSize.description)}
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
        item={modalItem} 
        type="item" 
        isOpen={showOrderModal} 
        onClose={() => setShowOrderModal(false)} 
      />
    </>
  );
};

interface DietaryBadgeProps {
  label: string;
  tooltip: string;
}

const DietaryBadge: React.FC<DietaryBadgeProps> = ({ label, tooltip }) => {
  return (
    <div 
      className="inline-flex items-center justify-center bg-green-100 text-green-800 text-xs font-medium px-1.5 py-0.5 rounded" 
      title={tooltip}
      aria-label={tooltip}
    >
      {label}
    </div>
  );
};

export default PlatterMenuItem; 