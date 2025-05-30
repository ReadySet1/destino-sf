'use client';

import React, { useState } from 'react';
import { ALaCarteMenu, CateringPackages } from '@/components/Catering';
import { BoxedLunchMenu } from '@/components/Catering/BoxedLunchMenu';
import { LunchPacketsMenu } from '@/components/Catering/LunchPacketsMenu';
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
    { id: 'boxed-lunches', label: 'Boxed Lunches' },
    { id: 'lunch-packets', label: 'Lunch Packets' }
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 max-w-4xl mx-auto mb-8 md:mb-10">
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

      <div className="mt-8 md:mt-10">
        {activeTab === 'appetizers' && (
          <div className="space-y-12">
            {/* 2025 Appetizer Package Selection */}
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                  2025 Appetizer Menu
                </h3>
                <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
                  Create the perfect appetizer experience for your event. Choose from our signature packages 
                  featuring authentic Latin American flavors with fresh, local ingredients. All packages are 
                  fully customizable to accommodate dietary preferences.
                </p>
              </div>
              
              {(() => {
                const appetizerPackages = cateringPackages.filter(pkg => 
                  pkg.name.includes('Appetizer Selection')
                );
                const appetizerItems = getItemsForTab(cateringItems, 'appetizers').filter(item => item.price === 0);
                
                return appetizerPackages.length > 0 && appetizerItems.length > 0 ? (
                  <AppetizerPackageSelector 
                    packages={appetizerPackages}
                    availableItems={appetizerItems}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="text-6xl">🍽️</div>
                      <h4 className="text-xl font-semibold text-gray-700">
                        Appetizer Packages Unavailable
                      </h4>
                      <div className="text-gray-600 space-y-2">
                        <p>Our appetizer packages are currently being set up.</p>
                        <p className="text-sm">
                          {appetizerPackages.length === 0 && appetizerItems.length === 0 
                            ? "Both packages and package items are missing."
                            : appetizerPackages.length === 0 
                              ? "Package options are missing." 
                              : "Package-only items are missing."
                          }
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                        <p>Please contact us directly for appetizer catering at:</p>
                        <p className="font-medium">(415) 555-0123</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
        
        {activeTab === 'lunch-packets' && (
          <LunchPacketsMenu />
        )}
      </div>
    </div>
  );
};

export default CateringMenuTabs; 