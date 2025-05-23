'use client';

import React, { useState } from 'react';
import { ALaCarteMenu, CateringPackages } from '@/components/Catering';
import { CateringItem, CateringPackage } from '@/types/catering';

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
    { id: 'lunch-packets', label: 'Lunch Packets' }
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-3xl mx-auto mb-8 md:mb-10">
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
          <ALaCarteMenu items={cateringItems} activeCategory="appetizers" />
        )}
        
        {activeTab === 'buffet' && (
          <ALaCarteMenu items={cateringItems} activeCategory="buffet" />
        )}
        
        {activeTab === 'lunch' && (
          <ALaCarteMenu items={cateringItems} activeCategory="lunch" />
        )}
        
        {activeTab === 'lunch-packets' && (
          <CateringPackages packages={cateringPackages} />
        )}
      </div>
    </div>
  );
};

export default CateringMenuTabs; 