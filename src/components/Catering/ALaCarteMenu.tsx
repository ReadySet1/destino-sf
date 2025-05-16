'use client';

import React, { useState } from 'react';
import { CateringItem, getItemsForTab, groupItemsBySubcategory } from '@/types/catering';
import { Button } from '@/components/ui/button';

interface ALaCarteMenuProps {
  items: CateringItem[];
  activeCategory?: string;
}

export const ALaCarteMenu: React.FC<ALaCarteMenuProps> = ({ items, activeCategory = 'appetizers' }) => {
  // Filtrar los items para esta pestaña y agruparlos por subcategoría
  const filteredItems = getItemsForTab(items, activeCategory);
  const groupedItems = groupItemsBySubcategory(filteredItems);
  
  return (
    <div className="w-full">
      <div className="space-y-12">
        {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
          <CategorySection 
            key={categoryName}
            title={categoryName}
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
  
  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-medium">{name}</h4>
          <div className="flex gap-1">
            {isVegetarian && <DietaryBadge label="V" tooltip="Vegetarian" />}
            {isVegan && <DietaryBadge label="VG" tooltip="Vegan" />}
            {isGlutenFree && <DietaryBadge label="GF" tooltip="Gluten Free" />}
          </div>
        </div>
        <div className="text-lg font-semibold text-gray-800">
          ${price.toFixed(2)}
        </div>
      </div>
      
      {servingSize && (
        <div className="text-sm text-gray-500 mb-1">{servingSize}</div>
      )}
      
      {description && (
        <p className="text-gray-600 text-sm">{description}</p>
      )}
    </div>
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