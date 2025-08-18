'use client';

import React, { useState } from 'react';
import { CateringPackages } from '@/components/Catering';
import { BoxedLunchMenu } from '@/components/Catering/BoxedLunchMenu';
import { AppetizerPackageSelector } from '@/components/Catering/AppetizerPackageSelector';
import { CateringPackage } from '@/types/catering';

interface CateringMenuTabsProps {
  cateringPackages: CateringPackage[];
}

const CateringMenuTabs: React.FC<CateringMenuTabsProps> = ({ cateringPackages }) => {
  const [activeTab, setActiveTab] = useState<string>('appetizers');

  const tabs = [
    { id: 'appetizers', label: 'Appetizers' },
    { id: 'buffet', label: 'Buffet' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'boxed-lunches', label: 'Boxed Lunches' },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl mx-auto mb-8 md:mb-10">
        {tabs.map(tab => (
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
                packages={cateringPackages.filter(pkg => pkg.name.includes('Appetizer Selection'))}
                availableItems={[]} // Empty since we no longer have local catering items
              />
            </div>

            {/* Note about Square integration */}
            <div className="border-t pt-12">
              <div className="text-center py-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Individual Appetizer Items
                </h3>
                <p className="text-gray-600">
                  Our appetizer selection is now managed through our Square integration. 
                  Please contact us directly for custom appetizer orders or view our 
                  available packages above.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buffet' && (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Buffet Options
            </h3>
            <p className="text-gray-600">
              Our buffet menu is now managed through our Square integration. 
              Please contact us directly for buffet pricing and options.
            </p>
          </div>
        )}

        {activeTab === 'lunch' && (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Lunch Options
            </h3>
            <p className="text-gray-600">
              Our lunch menu is now managed through our Square integration. 
              Please contact us directly for lunch pricing and options.
            </p>
          </div>
        )}

        {activeTab === 'boxed-lunches' && <BoxedLunchMenu />}
      </div>
    </div>
  );
};

export default CateringMenuTabs;
