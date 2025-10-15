'use client';

import React, { useState, useEffect } from 'react';
import { CateringPackages } from '@/components/Catering';
import { BoxedLunchMenu } from '@/components/Catering/BoxedLunchMenu';
import { AppetizerPackageSelector } from '@/components/Catering/AppetizerPackageSelector';
import { ALaCarteMenu } from '@/components/Catering/ALaCarteMenu';
import {
  CateringPackage,
  CateringItem,
  getAppetizerPackageItems,
  getDessertItems,
} from '@/types/catering';
import { logger } from '@/utils/logger';

interface CateringMenuTabsProps {
  cateringPackages: CateringPackage[];
}

const CateringMenuTabs: React.FC<CateringMenuTabsProps> = ({ cateringPackages }) => {
  const [activeTab, setActiveTab] = useState<string>('appetizers');
  const [appetizerItems, setAppetizerItems] = useState<CateringItem[]>([]);
  const [isLoadingAppetizers, setIsLoadingAppetizers] = useState<boolean>(true);
  const [buffetItems, setBuffetItems] = useState<CateringItem[]>([]);
  const [isLoadingBuffet, setIsLoadingBuffet] = useState<boolean>(true);
  const [lunchItems, setLunchItems] = useState<CateringItem[]>([]);
  const [isLoadingLunch, setIsLoadingLunch] = useState<boolean>(true);

  const tabs = [
    { id: 'appetizers', label: 'Appetizers' },
    { id: 'buffet', label: 'Buffet' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'boxed-lunches', label: 'Boxed Lunches' },
  ];

  // Fetch appetizer items from the API
  useEffect(() => {
    const fetchAppetizerItems = async () => {
      try {
        setIsLoadingAppetizers(true);
        logger.info('🍴 Fetching appetizer items for catering page...');

        const response = await fetch('/api/catering/appetizers');
        const data = await response.json();

        if (data.success) {
          setAppetizerItems(data.items);
          logger.info(`✅ Successfully loaded ${data.items.length} appetizer items`);
        } else {
          logger.error('❌ Failed to fetch appetizer items:', data.error);
          setAppetizerItems([]);
        }
      } catch (error) {
        logger.error('❌ Error fetching appetizer items:', error);
        setAppetizerItems([]);
      } finally {
        setIsLoadingAppetizers(false);
      }
    };

    fetchAppetizerItems();
  }, []);

  // Fetch buffet items from the API
  useEffect(() => {
    const fetchBuffetItems = async () => {
      try {
        setIsLoadingBuffet(true);
        logger.info('🍽️ Fetching buffet items for catering page...');

        const response = await fetch('/api/catering/buffet');
        const data = await response.json();

        if (data.success) {
          setBuffetItems(data.items);
          logger.info(`✅ Successfully loaded ${data.items.length} buffet items`);
        } else {
          logger.error('❌ Failed to fetch buffet items:', data.error);
          setBuffetItems([]);
        }
      } catch (error) {
        logger.error('❌ Error fetching buffet items:', error);
        setBuffetItems([]);
      } finally {
        setIsLoadingBuffet(false);
      }
    };

    fetchBuffetItems();
  }, []);

  // Fetch lunch items from the API
  useEffect(() => {
    const fetchLunchItems = async () => {
      try {
        setIsLoadingLunch(true);
        logger.info('🥪 Fetching lunch items for catering page...');

        const response = await fetch('/api/catering/lunch');
        const data = await response.json();

        if (data.success) {
          setLunchItems(data.items);
          logger.info(`✅ Successfully loaded ${data.items.length} lunch items`);
        } else {
          logger.error('❌ Failed to fetch lunch items:', data.error);
          setLunchItems([]);
        }
      } catch (error) {
        logger.error('❌ Error fetching lunch items:', error);
        setLunchItems([]);
      } finally {
        setIsLoadingLunch(false);
      }
    };

    fetchLunchItems();
  }, []);

  const handleTabClick = (tabId: string) => {
    logger.info(`📱 Tab clicked: ${tabId}`);
    setActiveTab(tabId);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl mx-auto mb-8 md:mb-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            onTouchEnd={e => {
              e.preventDefault();
              handleTabClick(tab.id);
            }}
            className={`text-center px-3 py-3 rounded-md border border-gray-200 text-base md:text-lg font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
              activeTab === tab.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-pressed={activeTab === tab.id}
            aria-label={`Switch to ${tab.label} menu`}
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
                availableItems={getAppetizerPackageItems(appetizerItems)}
                isLoading={isLoadingAppetizers}
              />
            </div>

            {/* Share Platters Section */}
            <div className="border-t pt-12">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Catering- Share Platters</h3>
                <p className="text-gray-600">
                  Perfect for sharing with groups - available in small and large portions
                </p>
              </div>
              <ALaCarteMenu
                items={appetizerItems.filter(item => item.category === 'SHARE PLATTER')}
              />
            </div>

            {/* Desserts Section */}
            <div className="border-t pt-12">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Catering- Desserts</h3>
                <p className="text-gray-600">Sweet endings to perfect your catering experience</p>
              </div>
              <ALaCarteMenu
                items={appetizerItems.filter(item => item.category === 'DESSERT')}
                isDessertSection={true}
              />
            </div>

            {/* Show loading state for additional sections if needed */}
            {isLoadingAppetizers && appetizerItems.length === 0 && (
              <div className="border-t pt-12">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading additional appetizer items...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'buffet' && !isLoadingBuffet && (
          <div>
            {/* Buffet Items */}
            <ALaCarteMenu items={buffetItems} activeCategory="buffet" />

            {/* Desserts Section */}
            {!isLoadingAppetizers && getDessertItems(appetizerItems).length > 0 && (
              <div className="border-t pt-12 mt-12">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Catering - Desserts</h3>
                  <p className="text-gray-600">Complete your buffet with our delicious desserts</p>
                </div>
                <ALaCarteMenu
                  items={getDessertItems(appetizerItems)}
                  activeCategory="buffet"
                  showServiceAddOns={false}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'buffet' && isLoadingBuffet && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading buffet menu...</p>
          </div>
        )}

        {activeTab === 'buffet' && !isLoadingBuffet && buffetItems.length === 0 && (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Buffet Menu Coming Soon</h3>
            <p className="text-gray-600">
              Our buffet options are being prepared. Please check back soon or contact us directly.
            </p>
          </div>
        )}

        {activeTab === 'lunch' && !isLoadingLunch && (
          <div>
            <ALaCarteMenu items={lunchItems} activeCategory="lunch" />
          </div>
        )}

        {activeTab === 'lunch' && isLoadingLunch && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lunch menu...</p>
          </div>
        )}

        {activeTab === 'lunch' && !isLoadingLunch && lunchItems.length === 0 && (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Lunch Menu Coming Soon</h3>
            <p className="text-gray-600">
              Our lunch options are being prepared. Please check back soon or contact us directly.
            </p>
          </div>
        )}

        {activeTab === 'boxed-lunches' && <BoxedLunchMenu />}
      </div>
    </div>
  );
};

export default CateringMenuTabs;
