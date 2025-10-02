'use client';

import React, { useState } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import {
  CateringItem,
  CateringItemWithVariations,
  getItemsForTab,
  groupItemsBySubcategory,
  groupBuffetItemsByCategory,
  groupLunchItemsByCategory,
} from '@/types/catering';
import { Button } from '@/components/ui/button';
import { CateringOrderModal } from '@/components/Catering/CateringOrderModal';
import { PlatterMenuItem } from '@/components/Catering/PlatterMenuItem';
import { ShoppingCart, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toTitleCase } from '@/lib/utils';
import { useCateringCartStore } from '@/store/catering-cart';
import { toast } from '@/lib/toast';
import { sanitizeProductDescription } from '@/lib/utils/product-description';

interface ALaCarteMenuProps {
  items: CateringItem[];
  activeCategory?: string;
  showDessertsAtBottom?: boolean;
  isDessertSection?: boolean;
  showServiceAddOns?: boolean; // New prop to control Service Add-Ons display
}

// Helper functions for text formatting

const formatDescription = (str: string | null | undefined): string => {
  if (!str) return '';
  const trimmedStr = str.trim();
  return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1);
};

// Function to check if an item is a Share Platter (using category instead of name pattern)
const isSharePlatterItem = (item: CateringItem): boolean => {
  return item.squareCategory === 'CATERING- SHARE PLATTERS';
};

// Service Add-ons data
const SERVICE_ADD_ONS = [
  {
    id: 'bamboo-cutlery',
    name: 'Individually Wrapped Bamboo Cutlery w/ Napkin',
    price: 1.5,
    description: 'Eco-friendly bamboo cutlery set with napkin',
    categories: ['buffet', 'lunch'], // Available for both buffet and lunch
  },
  {
    id: 'individual-setup',
    name: 'Individual Set-Up: Bamboo Cutlery w/ Napkin, Compostable Plate',
    price: 2.0,
    description: 'Complete individual place setting',
    categories: ['buffet', 'lunch'], // Available for both buffet and lunch
  },
  {
    id: 'compostable-serving-spoon',
    name: 'Compostable Serving Spoon',
    price: 1.5,
    description: 'Compostable serving spoon for family style',
    categories: ['buffet'], // Only available for buffet (makes sense for family style)
  },
];

export const ALaCarteMenu: React.FC<ALaCarteMenuProps> = ({
  items,
  activeCategory = 'appetizers',
  showDessertsAtBottom = false,
  isDessertSection = false,
  showServiceAddOns = true, // Default to true for backward compatibility
}) => {
  // Filter items for this tab and group them by subcategory
  let filteredItems;

  if (activeCategory === 'buffet') {
    // For buffet tab, get regular buffet items plus dessert items, but exclude $0 items
    const buffetItems = getItemsForTab(items, 'buffet').filter(item => item.price > 0);
    const dessertItems = items.filter(
      item => item.squareCategory === 'CATERING- DESSERTS' && item.price > 0
    );

    // Combine and remove duplicates by using a Set of item IDs
    const allItems = [...buffetItems, ...dessertItems];
    const uniqueItems = allItems.filter(
      (item, index, self) => index === self.findIndex(i => i.id === item.id)
    );
    filteredItems = uniqueItems;
  } else if (activeCategory === 'lunch') {
    // For lunch tab, get regular lunch items plus only Alfajores dessert items, but exclude $0 items
    const lunchItems = getItemsForTab(items, 'lunch').filter(item => item.price > 0);
    // Only show Alfajores desserts in the lunch tab (filter out Lemon Bars, Mini Cupcakes, Brownie Bites)
    const dessertItems = items.filter(
      item =>
        item.squareCategory === 'CATERING- DESSERTS' &&
        item.price > 0 &&
        item.name.toLowerCase().includes('alfajor')
    );
    filteredItems = [...lunchItems, ...dessertItems];
  } else if (
    activeCategory === 'appetizers' &&
    items.length < getItemsForTab(items, activeCategory).length
  ) {
    filteredItems = items; // If pre-filtered items passed in, use them
  } else {
    filteredItems = getItemsForTab(items, activeCategory);
  }

  // Use different grouping functions based on the active category
  let groupedItems;
  if (activeCategory === 'buffet') {
    groupedItems = groupBuffetItemsByCategory(filteredItems);
  } else if (activeCategory === 'lunch') {
    groupedItems = groupLunchItemsByCategory(filteredItems);
  } else {
    groupedItems = groupItemsBySubcategory(filteredItems);
  }

  // If showDessertsAtBottom is true, separate desserts and show them last
  let sectionsToShow = Object.entries(groupedItems);

  if (showDessertsAtBottom) {
    const dessertSections = sectionsToShow.filter(([categoryName]) =>
      categoryName.toLowerCase().includes('dessert')
    );
    const nonDessertSections = sectionsToShow.filter(
      ([categoryName]) => !categoryName.toLowerCase().includes('dessert')
    );

    sectionsToShow = [...nonDessertSections, ...dessertSections];
  }

  // For buffet and lunch tabs, ensure proper ordering: Starters → Entrees → Sides → Desserts
  if (activeCategory === 'buffet' || activeCategory === 'lunch') {
    const desiredOrder = ['Starters', 'Entrees', 'Sides', 'Desserts'];
    sectionsToShow = sectionsToShow.sort(([a], [b]) => {
      const indexA = desiredOrder.indexOf(a);
      const indexB = desiredOrder.indexOf(b);
      // If not found in desired order, put at the end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  return (
    <div className="w-full">

      <div className="space-y-12">
        {sectionsToShow.map(([categoryName, categoryItems], index) => (
          <motion.div
            key={categoryName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <CategorySection
              title={
                activeCategory === 'buffet' || activeCategory === 'lunch'
                  ? categoryName
                  : toTitleCase(categoryName)
              }
              items={categoryItems}
              isDessertSection={categoryName.toLowerCase().includes('dessert')}
            />
          </motion.div>
        ))}

        {/* Add Service Add-ons section for buffet and lunch */}
        {showServiceAddOns && (activeCategory === 'buffet' || activeCategory === 'lunch') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: sectionsToShow.length * 0.1 }}
          >
            <ServiceAddOnsSection activeCategory={activeCategory} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  items: CateringItem[];
  isDessertSection?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  items,
  isDessertSection = false,
}) => {
  // Separate Share Platter items from regular items
  const sharePlatterItems = items.filter(item => isSharePlatterItem(item));
  const regularItems = items.filter(item => !isSharePlatterItem(item));

  // Create display items array
  const displayItems: Array<{
    type: 'platter' | 'item';
    data: CateringItem;
  }> = [];

  // Add Share Platter items (these will use PlatterMenuItem with variations)
  sharePlatterItems.forEach(item => {
    displayItems.push({ type: 'platter', data: item });
  });

  // Add regular individual items
  regularItems.forEach(item => {
    displayItems.push({ type: 'item', data: item });
  });

  return (
    <div
      className={`bg-white rounded-xl p-5 md:p-6 shadow-sm border border-gray-100 ${
        isDessertSection ? 'border-orange-200 bg-orange-50' : ''
      }`}
    >
      <h3
        className={`text-2xl font-bold border-b pb-3 mb-6 ${
          isDessertSection ? 'text-orange-800 border-orange-200' : 'text-gray-800 border-gray-200'
        }`}
      >
        {title}
      </h3>

      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {displayItems.map((displayItem, index) => (
          <motion.div
            key={`${displayItem.type}-${displayItem.data.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="h-full"
          >
            {displayItem.type === 'platter' ? (
              <PlatterMenuItem item={displayItem.data as CateringItemWithVariations} />
            ) : (
              <MenuItem item={displayItem.data} />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface MenuItemProps {
  item: CateringItem;
}

const MenuItem: React.FC<MenuItemProps> = ({ item }) => {
  const { name, description, price, isVegetarian, isVegan, isGlutenFree, servingSize, imageUrl } =
    item;
  const [showOrderModal, setShowOrderModal] = useState(false);
  const hasImage = !!imageUrl;
  const { addItem } = useCateringCartStore();

  // Function to get the correct image URL
  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '/images/catering/default-item.jpg'; // Default fallback image

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

  // Enhanced formatting for menu item descriptions
  // Now renders HTML safely instead of treating as plain text
  const formatMenuItemDescription = (desc: string | null | undefined): React.ReactNode => {
    if (!desc) return null;

    // Sanitize and render HTML description
    const sanitizedHtml = sanitizeProductDescription(desc);

    return (
      <div
        className="text-sm md:text-base"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  };

  const handleAddToCart = () => {
    const cartItem = {
      id: item.id,
      name: toTitleCase(item.name),
      price: Number(item.price),
      quantity: 1,
      image: getImageUrl(item.imageUrl),
      variantId: JSON.stringify({
        type: 'item',
        itemId: item.id,
        servingSize: item.servingSize,
      }),
    };

    addItem(cartItem);
    toast.success(`${toTitleCase(name)} added to catering cart!`);
  };

  return (
    <>
      <div className="h-full border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
        <div className="relative w-full h-48">
          <SafeImage
            src={getImageUrl(imageUrl)}
            alt={toTitleCase(name)}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            fallbackSrc="/images/catering/default-item.jpg"
            maxRetries={0}
            priority={false}
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
            <div className="text-lg md:text-xl font-bold text-gray-800">${price.toFixed(2)}</div>
          </div>

          {servingSize && (
            <div className="text-sm md:text-base font-medium text-gray-600 mb-2">
              <span className="font-bold">Serving: </span>
              {formatDescription(servingSize)}
            </div>
          )}

          {description && <div className="mb-4">{formatMenuItemDescription(description)}</div>}

          <div className="mt-auto pt-2 flex gap-2">
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

interface DietaryBadgeProps {
  label: string;
  tooltip: string;
}

const DietaryBadge: React.FC<DietaryBadgeProps> = ({ label, tooltip }) => {
  // Color mapping based on dietary label
  const getColorClass = () => {
    switch (label) {
      case 'GF':
        return 'bg-green-100 text-green-700 border border-green-200'; // Changed to match DietaryLegend GF
      case 'VG':
        return 'bg-orange-100 text-orange-700 border border-orange-200'; // Changed to match DietaryLegend VG
      case 'VGN': // This case was already present for VGN if it's explicitly passed
      case 'V': // This is the label passed for isVegetarian
        return 'bg-blue-100 text-blue-700 border border-blue-200'; // Changed to match DietaryLegend VGN (used for V in MenuItem)
      default:
        return 'bg-blue-100 text-blue-800 border border-blue-300';
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center ${getColorClass()} text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm`}
      title={tooltip}
      aria-label={tooltip}
    >
      {label}
    </div>
  );
};

// Service Add-ons Section Component
const ServiceAddOnsSection: React.FC<{ activeCategory: string }> = ({ activeCategory }) => {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedAddOn, setSelectedAddOn] = useState<any>(null);
  const { addItem } = useCateringCartStore();

  // Filter add-ons based on the active category
  const filteredAddOns = SERVICE_ADD_ONS.filter(addOn => addOn.categories.includes(activeCategory));

  const handleViewDetails = (addOn: any) => {
    setSelectedAddOn(addOn);
    setShowOrderModal(true);
  };

  const handleAddToCart = (addOn: any) => {
    const cartItem = {
      id: `service-addon-${addOn.id}`,
      name: addOn.name,
      price: Number(addOn.price),
      quantity: 1,
      variantId: JSON.stringify({
        type: 'service-addon',
        addOnId: addOn.id,
        categories: addOn.categories,
      }),
    };

    addItem(cartItem);
    toast.success(`${addOn.name} added to catering cart!`);
  };

  return (
    <>
      <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-800 border-b border-gray-200 pb-3 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          Service Add-Ons
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          {filteredAddOns.map((addOn, index) => (
            <motion.div
              key={addOn.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="h-full"
            >
              <div className="h-full border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-semibold text-gray-800 pr-2">{addOn.name}</h4>
                    <div className="text-lg font-bold text-gray-800">${addOn.price.toFixed(2)}</div>
                  </div>

                  <div className="mb-4 flex-grow">
                    <div
                      className="text-gray-600 text-sm"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeProductDescription(addOn.description)
                      }}
                    />
                  </div>

                  <div className="mt-auto pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(addOn)}
                      className="flex-1 border-gray-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-colors"
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(addOn)}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {selectedAddOn && (
        <CateringOrderModal
          item={{
            ...selectedAddOn,
            category: 'ADD_ON',
            isVegetarian: true,
            isVegan: true,
            isGlutenFree: true,
            isActive: true,
          }}
          type="item"
          isOpen={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedAddOn(null);
          }}
        />
      )}
    </>
  );
};

export default ALaCarteMenu;
