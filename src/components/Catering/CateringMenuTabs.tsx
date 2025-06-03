'use client';

import React, { useState } from 'react';
import { ALaCarteMenu, CateringPackages } from '@/components/Catering';
import { BoxedLunchMenu } from '@/components/Catering/BoxedLunchMenu';
import { AppetizerPackageSelector } from '@/components/Catering/AppetizerPackageSelector';
import { CateringItem, CateringPackage, getItemsForTab } from '@/types/catering';

interface CateringMenuTabsProps {
  cateringItems: CateringItem[];
  cateringPackages: CateringPackage[];
}

const CateringMenuTabs: React.FC<CateringMenuTabsProps> = ({ 
  cateringItems, 
  cateringPackages 
}) => {
  const [activeTab, setActiveTab] = useState<string>('appetizers');

  const tabs = [
    { id: 'appetizers', label: 'Appetizers' },
    { id: 'buffet', label: 'Buffet' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'boxed-lunches', label: 'Boxed Lunches' }
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl mx-auto mb-8 md:mb-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`text-center px-3 py-3 rounded-md border border-gray-200 text-base md:text-lg font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'appetizers' && (
          <div>
            {/* Appetizer Packages */}
            <div className="mb-12">
              <AppetizerPackageSelector 
                packages={cateringPackages.filter(pkg => {
                  // Get items that are $0 (package-only items) for appetizers
                  const appetizerItems = getItemsForTab(cateringItems, 'appetizers').filter(item => item.price === 0);
                  return appetizerItems.some(item => 
                    pkg.items?.some(pkgItem => pkgItem.itemId === item.id)
                  );
                })}
                availableItems={getItemsForTab(cateringItems, 'appetizers').filter(item => item.price === 0)}
              />
            </div>

            {/* Individual Appetizer Items - Share Platters and Desserts */}
            <div className="border-t pt-12">
              <ALaCarteMenu 
                items={cateringItems.filter(item => {
                  // Get items for appetizers tab but exclude $0 items (package-only)
                  const appetizerTabItems = getItemsForTab(cateringItems, 'appetizers');
                  return appetizerTabItems.includes(item) && item.price > 0;
                })} 
                activeCategory="appetizers" 
                showDessertsAtBottom={true}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'buffet' && (
          <ALaCarteMenu items={cateringItems} activeCategory="buffet" />
        )}
        
        {activeTab === 'lunch' && (
          <ALaCarteMenu items={cateringItems} activeCategory="lunch" />
        )}
        
        {activeTab === 'boxed-lunches' && (
          <BoxedLunchMenu />
        )}
      </div>
    </div>
  );
};

export default CateringMenuTabs; 