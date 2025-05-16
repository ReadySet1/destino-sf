'use client';

import React, { useState } from 'react';
import { CateringItem, getItemsForTab, groupItemsBySubcategory } from '@/types/catering';
import { Button } from '@/components/ui/button';
import { CateringOrderModal } from '@/components/Catering/CateringOrderModal';
import { ShoppingCart } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

interface ALaCarteMenuProps {
  items: CateringItem[];
  activeCategory?: string;
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

export const ALaCarteMenu: React.FC<ALaCarteMenuProps> = ({ items, activeCategory = 'appetizers' }) => {
  // Filtrar los items para esta pestaña y agruparlos por subcategoría
  const filteredItems = getItemsForTab(items, activeCategory);
  const groupedItems = groupItemsBySubcategory(filteredItems);
  
  return (
    <div className="w-full">
      <Toaster position="top-right" />
      <div className="space-y-12">
        {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
          <CategorySection 
            key={categoryName}
            title={toTitleCase(categoryName)}
            items={categoryItems}
          />
        ))}
      </div>
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  items: CateringItem[];
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, items }) => {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, 6);
  
  return (
    <div>
      <h3 className="text-2xl font-semibold border-b border-gray-300 pb-2 mb-6">{title}</h3>
      
      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
        {displayItems.map(item => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
      
      {items.length > 6 && (
        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            onClick={() => setShowAll(!showAll)}
            className="border-gray-300 text-gray-700"
          >
            {showAll ? 'Show Less' : `Show ${items.length - 6} More Options`}
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
  const { name, description, price, isVegetarian, isVegan, isGlutenFree, servingSize } = item;
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // Enhanced formatting for menu item descriptions
  const formatMenuItemDescription = (desc: string | null | undefined): React.ReactNode => {
    if (!desc) return null;
    
    // Format the basic description
    const formattedDesc = formatDescription(desc);
    
    // Check if description has multiple parts we can format differently
    if (formattedDesc.includes(',') && formattedDesc.split(',').length >= 2) {
      const parts = formattedDesc.split(',');
      
      return (
        <div className="text-sm">
          <span className="font-medium">{parts[0].trim()}</span>
          <span className="text-gray-600">{parts.length > 1 ? ',' : ''} </span>
          <span className="italic">
            {parts.slice(1).join(',').trim()}
          </span>
        </div>
      );
    }
    
    // If it's a simple description without commas, just add some basic styling
    return <p className="text-gray-600 text-sm">{formattedDesc}</p>;
  };
  
  return (
    <>
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-medium">{toTitleCase(name)}</h4>
            <div className="flex gap-1">
              {isVegetarian && <DietaryBadge label="V" tooltip="Vegetarian" />}
              {isVegan && <DietaryBadge label="VG" tooltip="Vegan" />}
              {isGlutenFree && <DietaryBadge label="GF" tooltip="Gluten Free" />}
            </div>
          </div>
          <div className="text-lg font-semibold">
            ${price.toFixed(2)}
          </div>
        </div>
        
        {servingSize && (
          <div className="text-sm font-medium text-gray-600 mb-1">
            <span className="font-bold">Serving: </span>
            {formatDescription(servingSize)}
          </div>
        )}
        
        {description && formatMenuItemDescription(description)}
        
        <div className="mt-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowOrderModal(true)}
            className="border-gray-300 hover:bg-gray-100"
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Order Now
          </Button>
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
      className="inline-flex items-center justify-center bg-green-100 text-green-800 text-xs font-medium px-1.5 rounded-sm" 
      title={tooltip}
    >
      {label}
    </div>
  );
};

export default ALaCarteMenu; 