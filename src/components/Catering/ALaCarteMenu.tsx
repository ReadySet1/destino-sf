'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CateringItem, getItemsForTab, groupItemsBySubcategory } from '@/types/catering';
import { Button } from '@/components/ui/button';
import { CateringOrderModal } from '@/components/Catering/CateringOrderModal';
import { PlatterMenuItem } from '@/components/Catering/PlatterMenuItem';
import { ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ALaCarteMenuProps {
  items: CateringItem[];
  activeCategory?: string;
  showDessertsAtBottom?: boolean;
}

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

// Function to check if an item is a platter item
const isPlatterItem = (item: CateringItem): boolean => {
  const platterNames = ['Plantain Chips Platter', 'Cocktail Prawn Platter', 'Cheese & Charcuterie Platter'];
  return platterNames.includes(item.name);
};

export const ALaCarteMenu: React.FC<ALaCarteMenuProps> = ({ 
  items, 
  activeCategory = 'appetizers', 
  showDessertsAtBottom = false 
}) => {
  // Filter items for this tab and group them by subcategory
  const filteredItems = activeCategory === 'appetizers' && items.length < getItemsForTab(items, activeCategory).length 
    ? items // If pre-filtered items passed in, use them
    : getItemsForTab(items, activeCategory);
  
  const groupedItems = groupItemsBySubcategory(filteredItems);
  
  // If showDessertsAtBottom is true, separate desserts and show them last
  let sectionsToShow = Object.entries(groupedItems);
  
  if (showDessertsAtBottom) {
    const dessertSections = sectionsToShow.filter(([categoryName]) => 
      categoryName.toLowerCase().includes('dessert')
    );
    const nonDessertSections = sectionsToShow.filter(([categoryName]) => 
      !categoryName.toLowerCase().includes('dessert')
    );
    
    sectionsToShow = [...nonDessertSections, ...dessertSections];
  }
  
  return (
    <div className="w-full">
      <Toaster position="top-right" />
      <div className="space-y-12">
        {sectionsToShow.map(([categoryName, categoryItems], index) => (
          <motion.div
            key={categoryName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <CategorySection 
              title={toTitleCase(categoryName)}
              items={categoryItems}
              isDessertSection={categoryName.toLowerCase().includes('dessert')}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  items: CateringItem[];
  isDessertSection?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, items, isDessertSection = false }) => {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, 6);
  
  return (
    <div className={`bg-white rounded-xl p-5 md:p-6 shadow-sm border border-gray-100 ${
      isDessertSection ? 'border-orange-200 bg-orange-50' : ''
    }`}>
      <h3 className={`text-2xl font-bold border-b pb-3 mb-6 ${
        isDessertSection ? 'text-orange-800 border-orange-200' : 'text-gray-800 border-gray-200'
      }`}>
        {title}
      </h3>
      
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {displayItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="h-full"
          >
            {isPlatterItem(item) ? (
              <PlatterMenuItem item={item} />
            ) : (
              <MenuItem item={item} />
            )}
          </motion.div>
        ))}
      </div>
      
      {items.length > 6 && (
        <div className="mt-10 text-center">
          <Button 
            variant="outline" 
            onClick={() => setShowAll(!showAll)}
            className="border-gray-300 text-gray-700 py-5 px-8 rounded-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            {showAll ? (
              <>
                Show Less <ChevronUp className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Show {items.length - 6} More Options <ChevronDown className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

interface MenuItemProps {
  item: CateringItem;
}

const MenuItem: React.FC<MenuItemProps> = ({ item }) => {
  const { name, description, price, isVegetarian, isVegan, isGlutenFree, servingSize, imageUrl } = item;
  const [showOrderModal, setShowOrderModal] = useState(false);
  const hasImage = !!imageUrl;
  
  // Function to get the correct image URL
  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '/images/catering/default-item.jpg';  // Default fallback image
    
    // AWS S3 URLs already have proper format
    if (url.includes('amazonaws.com') || url.includes('s3.') || 
        url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // For relative paths, ensure they start with a slash
    return url.startsWith('/') ? url : `/${url}`;
  };
  
  // Enhanced formatting for menu item descriptions
  const formatMenuItemDescription = (desc: string | null | undefined): React.ReactNode => {
    if (!desc) return null;
    
    // Format the basic description
    const formattedDesc = formatDescription(desc);
    
    // Check if description has multiple parts we can format differently
    if (formattedDesc.includes(',') && formattedDesc.split(',').length >= 2) {
      const parts = formattedDesc.split(',');
      
      return (
        <div className="text-sm md:text-base">
          <span className="font-medium">{parts[0].trim()}</span>
          <span className="text-gray-600">{parts.length > 1 ? ',' : ''} </span>
          <span className="italic">
            {parts.slice(1).join(',').trim()}
          </span>
        </div>
      );
    }
    
    // If it's a simple description without commas, just add some basic styling
    return <p className="text-gray-600 text-sm md:text-base">{formattedDesc}</p>;
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
              {price > 0 ? `$${price.toFixed(2)}` : 'Package Selection Only'}
            </div>
          </div>
          
          {servingSize && (
            <div className="text-sm md:text-base font-medium text-gray-600 mb-2">
              <span className="font-bold">Serving: </span>
              {formatDescription(servingSize)}
            </div>
          )}
          
          {description && (
            <div className="mb-4">
              {formatMenuItemDescription(description)}
            </div>
          )}
          
          <div className="mt-auto pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowOrderModal(true)}
              disabled={price === 0}
              className="w-full border-gray-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {price === 0 ? 'Package Selection Only' : 'Add to Order'}
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

export default ALaCarteMenu; 