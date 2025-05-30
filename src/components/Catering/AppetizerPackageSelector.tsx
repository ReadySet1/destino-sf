'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCateringCartStore } from '@/store/catering-cart';
import { CateringPackage, CateringItem } from '@/types/catering';
import { Users, CheckCircle, Circle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface AppetizerPackageSelectorProps {
  packages: CateringPackage[];
  availableItems: CateringItem[];
}

interface SelectedItems {
  [packageId: string]: string[]; // packageId -> array of selected item IDs
}

export const AppetizerPackageSelector: React.FC<AppetizerPackageSelectorProps> = ({
  packages,
  availableItems
}) => {
  const { addItem } = useCateringCartStore();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [peopleCount, setPeopleCount] = useState<number>(2);

  // Get the currently selected package data
  const currentPackage = packages.find(p => p.id === selectedPackage);
  const requiredItemCount = currentPackage?.name.includes('5 Items') ? 5 :
                           currentPackage?.name.includes('7 Items') ? 7 :
                           currentPackage?.name.includes('9 Items') ? 9 : 0;

  const currentSelectedItems = selectedItems[selectedPackage || ''] || [];

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

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    // Initialize selected items array if not exists
    if (!selectedItems[packageId]) {
      setSelectedItems(prev => ({
        ...prev,
        [packageId]: []
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
          [selectedPackage]: currentItems.filter(id => id !== itemId)
        };
      } else {
        // Add item if under limit
        if (currentItems.length < requiredItemCount) {
          return {
            ...prev,
            [selectedPackage]: [...currentItems, itemId]
          };
        } else {
          toast.error(`You can only select ${requiredItemCount} items for this package`);
          return prev;
        }
      }
    });
  };

  const handleAddToCart = () => {
    if (!currentPackage || currentSelectedItems.length !== requiredItemCount) {
      toast.error(`Please select exactly ${requiredItemCount} items`);
      return;
    }

    const selectedItemNames = currentSelectedItems
      .map(itemId => availableItems.find(item => item.id === itemId)?.name)
      .filter(Boolean);

    const totalPrice = currentPackage.pricePerPerson * peopleCount;

    const cartItem = {
      id: currentPackage.id,
      name: `${currentPackage.name} for ${peopleCount} people`,
      price: totalPrice,
      quantity: 1,
      image: currentPackage.imageUrl || '/images/catering/default-package.jpg',
      variantId: JSON.stringify({
        type: 'appetizer-package',
        packageId: currentPackage.id,
        selectedItems: currentSelectedItems,
        selectedItemNames,
        peopleCount,
        pricePerPerson: currentPackage.pricePerPerson
      })
    };

    addItem(cartItem);
    toast.success(`${currentPackage.name} added to catering cart for ${peopleCount} people`);
    
    // Reset selection
    setSelectedPackage(null);
    setSelectedItems({});
    setPeopleCount(2);
  };

  // Add a custom formatted titleCase function to match other components
  const toTitleCase = (str: string | null | undefined): string => {
    if (!str) return '';
    
    // Words that should not be capitalized (articles, conjunctions, prepositions)
    const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'de'];
    
    // Split the string into words
    const words = str.toLowerCase().split(' ');
    
    // Always capitalize the first and last word
    return words.map((word, index) => {
      // Always capitalize first and last word, or if not a minor word
      if (index === 0 || index === words.length - 1 || !minorWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
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
      {/* Package Selection */}
      <div className="text-center space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Choose Your Appetizer Package
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select from our curated appetizer packages. Each package is priced per person and includes 
            your choice of appetizers from our 2025 menu.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {packages.map((pkg) => {
            const itemCount = pkg.name.includes('5 Items') ? 5 :
                             pkg.name.includes('7 Items') ? 7 :
                             pkg.name.includes('9 Items') ? 9 : 0;
            
            return (
              <Card 
                key={pkg.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  selectedPackage === pkg.id ? "ring-2 ring-amber-500 bg-amber-50" : ""
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
                  
                  <h4 className="text-lg font-semibold mb-2">
                    {itemCount} Appetizers
                  </h4>
                  
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
          >
            <div className="text-center">
              <h4 className="text-xl font-semibold mb-2">
                Select {requiredItemCount} Appetizers
              </h4>
              <p className="text-gray-600">
                Choose {requiredItemCount} appetizers for your package 
                ({currentSelectedItems.length}/{requiredItemCount} selected)
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableItems.map((item) => {
                const isSelected = currentSelectedItems.includes(item.id);
                const canSelect = currentSelectedItems.length < requiredItemCount || isSelected;
                
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 overflow-hidden",
                      isSelected ? "ring-2 ring-green-500 bg-green-50" : "",
                      !canSelect ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"
                    )}
                    onClick={() => canSelect && handleItemToggle(item.id)}
                  >
                    <div className="relative w-full h-32">
                      <Image
                        src={getImageUrl(item.imageUrl)}
                        alt={toTitleCase(item.name)}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/catering/default-item.jpg';
                        }}
                        priority={false}
                        loading="lazy"
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
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        {getDietaryBadges(item).map((badge) => (
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

            {/* Add to Cart Button */}
            <div className="text-center pt-6">
              <Button
                onClick={handleAddToCart}
                disabled={currentSelectedItems.length !== requiredItemCount}
                className="bg-amber-600 hover:bg-amber-700 px-8 py-3 text-lg"
              >
                Add Package to Cart
                {currentPackage && (
                  <span className="ml-2">
                    (${(currentPackage.pricePerPerson * peopleCount).toFixed(2)})
                  </span>
                )}
              </Button>
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
    </div>
  );
}; 