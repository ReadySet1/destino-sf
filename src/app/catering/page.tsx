import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { CateringContactForm } from '@/components/Catering/CateringContactForm';
import CateringFaqSection from '@/components/FAQ/CateringFaqSection';
import { CateringPackages, ALaCarteMenu } from '@/components/Catering';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CateringPackage, CateringItem, CateringItemCategory, CateringPackageType, getItemsForTab } from '@/types/catering';
import { getCateringPackages, getCateringItems } from '@/actions/catering';
import CateringCartButton from '@/components/Catering/CateringCartButton';

export const dynamic = 'force-dynamic';

// Define catering services
const cateringServices: string[] = [
  'Corporate Events & Office Catering',
  'Weddings & Engagement Parties',
  'Birthday Celebrations',
  'Holiday Gatherings',
  'Private Dinner Parties',
  'Film & Photo Shoots',
  'Conferences & Meetings',
  'Social Events & Reunions'
];

const CateringPage = async () => {
  // Fetch data from the database
  let cateringPackages: CateringPackage[] = [];
  let cateringItems: CateringItem[] = [];
  let errorMessage = '';

  try {
    // Fetch packages and items from the database
    cateringPackages = await getCateringPackages();
    cateringItems = await getCateringItems();
  } catch (error) {
    console.error('Error fetching catering data:', error);
    errorMessage = error instanceof Error ? error.message : 'Failed to load catering data';
    
    // If database fetch fails, the page will still render but with empty arrays
    // This ensures graceful degradation
  }

  // Get counts of items per category for debugging
  const appetizersCount = getItemsForTab(cateringItems, 'appetizers').length;
  const buffetCount = getItemsForTab(cateringItems, 'buffet').length;
  const lunchCount = getItemsForTab(cateringItems, 'lunch').length;
  const lunchPacketsCount = getItemsForTab(cateringItems, 'lunch-packets').length;
  const hasSquareCategoryCount = cateringItems.filter(item => !!item.squareCategory).length;

  return (
    <>
      {/* Add the CateringCartButton component */}
      <CateringCartButton />
      
      {/* Catering Banner */}
      <CateringBanner />

      {/* Main Content Container */}
      <div className="min-h-screen bg-white">
        {/* Error message if any */}
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div>
        )}
        
        {/* Hero Section */}
        <Card className="border-none shadow-none mb-12">
          <CardContent className="p-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-8">
              Planning an event? Let us assist with vibrant Latin American flavors everyone will love.
            </h1>

            <div className="flex flex-col md:flex-row gap-10 items-start">
              {/* Services List */}
              <div className="space-y-6 flex-1">
                <h3 className="text-2xl md:text-3xl font-semibold text-gray-800">We Cater:</h3>
                <ul className="space-y-3">
                  {cateringServices.map((service, index) => (
                    <li key={index} className="flex items-start gap-3 text-xl text-gray-600">
                      <span className="text-[#fdc32d] font-bold">•</span>
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Image Container */}
              <div className="w-full md:w-2/3 overflow-hidden rounded-lg">
                <Image
                  src="/images/catering/catering.png"
                  alt="Catering service"
                  width={800}
                  height={600}
                  className="object-cover w-full h-auto hover:scale-105 transition-transform duration-500"
                  priority
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dietary Options Section - Full-width accent */}
      <div className="bg-[#fdc32d] py-8 md:py-12 my-12 md:my-16 transform transition-all hover:bg-[#fdc32d]/90">
        <div className="max-w-[1200px] mx-auto px-4">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 leading-tight">
            Our menus are fully customizable and include plenty of gluten-free, vegetarian, and
            vegan options to meet your needs.
          </h3>
        </div>
      </div>

      {/* Catering Options - Packages and A La Carte */}
      <div className="max-w-[1200px] mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Catering Menu</h2>
        <Tabs defaultValue="appetizers" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList>
              <TabsTrigger value="appetizers">Appetizers</TabsTrigger>
              <TabsTrigger value="buffet">Buffet</TabsTrigger>
              <TabsTrigger value="lunch">Lunch</TabsTrigger>
              <TabsTrigger value="lunch-packets">Lunch Packets</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="appetizers" className="mt-4">
            <ALaCarteMenu items={cateringItems} activeCategory="appetizers" />
          </TabsContent>
          
          <TabsContent value="buffet" className="mt-4">
            <ALaCarteMenu items={cateringItems} activeCategory="buffet" />
          </TabsContent>
          
          <TabsContent value="lunch" className="mt-4">
            <ALaCarteMenu items={cateringItems} activeCategory="lunch" />
          </TabsContent>
          
          <TabsContent value="lunch-packets" className="mt-4">
            <CateringPackages packages={cateringPackages.filter(pkg => pkg.type === CateringPackageType.INDIVIDUAL)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Debug section - remove after fixing */}
      {/* <div className="max-w-[1200px] mx-auto px-4 mb-16 border p-4 bg-gray-50">
        <h3 className="font-bold">Debug Info:</h3>
        <p>Total items: {cateringItems.length}</p>
        <p>Items with squareCategory: {hasSquareCategoryCount}</p>
        <p>Appetizers: {appetizersCount}</p>
        <p>Buffet: {buffetCount}</p>
        <p>Lunch: {lunchCount}</p>
        <p>Lunch Packets: {lunchPacketsCount}</p>
        <h4 className="mt-4 font-bold">Square Categories:</h4>
        <ul>
          {Array.from(new Set(cateringItems.map(item => item.squareCategory))).map(
            (category, index) => category && <li key={index}>{category}</li>
          )}
        </ul>
      </div> */}

      {/* Contact form and FAQ Section */}
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Contact form */}
        <div className="mb-16">
          <CateringContactForm />
        </div>

        {/* FAQ Section */}
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            <CateringFaqSection />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CateringPage;
