'use client';

import React, { useState } from 'react';
import { CateringItem, CateringItemCategory } from '@/types/catering';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ALaCarteMenuProps {
  items: CateringItem[];
}

export const ALaCarteMenu: React.FC<ALaCarteMenuProps> = ({ items }) => {
  const [activeCategory, setActiveCategory] = useState<CateringItemCategory | null>(null);

  // Group items by category
  const categorizedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<CateringItemCategory, CateringItem[]>);

  // Get all available categories from the items
  const availableCategories = Object.keys(categorizedItems) as CateringItemCategory[];

  // Filter items by selected category
  const displayedItems = activeCategory ? categorizedItems[activeCategory] : items;

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-center mb-8">A La Carte Menu</h2>
      
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <Button
          onClick={() => setActiveCategory(null)}
          variant={activeCategory === null ? "default" : "outline"}
          className={cn(
            "rounded-full px-6 mb-2",
            activeCategory === null ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
          )}
        >
          All Items
        </Button>
        
        {availableCategories.map(category => (
          <Button
            key={category}
            onClick={() => setActiveCategory(category)}
            variant={activeCategory === category ? "default" : "outline"}
            className={cn(
              "rounded-full px-6 mb-2",
              activeCategory === category ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
            )}
          >
            {formatCategory(category)}
          </Button>
        ))}
      </div>

      <div className="space-y-8">
        {activeCategory === null && availableCategories.map(category => (
          <CategorySection 
            key={category} 
            category={category} 
            items={categorizedItems[category]} 
          />
        ))}

        {activeCategory !== null && (
          <CategorySection 
            category={activeCategory} 
            items={displayedItems} 
          />
        )}
      </div>
    </div>
  );
};

interface CategorySectionProps {
  category: CateringItemCategory;
  items: CateringItem[];
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, items }) => {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, 6);
  
  return (
    <div>
      <h3 className="text-2xl font-semibold border-b border-gray-300 pb-2 mb-4">{formatCategory(category)}</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {displayItems.map(item => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
      
      {items.length > 6 && (
        <div className="mt-4 text-center">
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

// Helper function to format category names for display
const formatCategory = (category: CateringItemCategory): string => {
  return category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export default ALaCarteMenu; 