import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';
import { Card, CardContent } from '@/components/ui/card';
import { CateringContactForm } from '@/components/Catering/CateringContactForm';
import CateringFaqSection from '@/components/FAQ/CateringFaqSection';
import DietaryLegend from '@/components/Catering/DietaryLegend';
import {
  CateringPackage,
  CateringItem,
  CateringItemCategory,
  CateringPackageType,
  getItemsForTab,
} from '@/types/catering';
import { getCateringPackages, getCateringItems } from '@/actions/catering';
import CateringCartButton from '@/components/Catering/CateringCartButton';
import CateringMenuTabs from '@/components/Catering/CateringMenuTabs';
import { ContactForm, ContactInfo, ContactInfoCatering } from '@/components/ContactForm';
import { FormMessage } from '../../components/form-message';
import { generatePageSEO } from '@/lib/seo';
import { CateringStructuredData } from '@/components/seo/StructuredData';

export const metadata = generatePageSEO('catering');
export const dynamic = 'force-dynamic';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
});

// Debug function to check image availability
const debugImages = (items: CateringItem[]) => {
  const withImages = items.filter(item => item.imageUrl).length;
  console.log(
    `[DEBUG] Catering page loaded with ${withImages}/${items.length} items having images`
  );

  // Log the first few items with their image URLs
  items.slice(0, 5).forEach(item => {
    console.log(`[DEBUG] Item "${item.name}" has image: ${item.imageUrl || 'NO IMAGE'}`);
  });
};

// Define catering services
const cateringServices: string[] = [
  'Corporate Luncheons',
  'Cocktail Receptions',
  'Birthday Celebrations & Dinner Parties',
  'Happy Hour Events',
  'Corporate Meet & Greets',
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

    // Debug image URLs in fetched items
    debugImages(cateringItems);
  } catch (error) {
    console.error('Error fetching catering data:', error);
    errorMessage = error instanceof Error ? error.message : 'Failed to load catering data';

    // If database fetch fails, the page will still render but with empty arrays
    // This ensures graceful degradation
  }

  return (
    <>
      <CateringStructuredData />
      <div className="bg-white">
        {/* Add the CateringCartButton component */}
        <CateringCartButton />

        {/* Catering Banner */}
        <CateringBanner />

        {/* Main Content Container */}
        <div>
          {/* Error message if any */}
          {errorMessage && (
            <div className="max-w-[1300px] mx-auto px-6 md:px-8 mt-8">
              <div
                className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6"
                role="alert"
              >
                <p className="font-bold">Error</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* No data message if database is empty */}
          {!errorMessage && cateringPackages.length === 0 && cateringItems.length === 0 && (
            <div className="max-w-[1300px] mx-auto px-6 md:px-8 mt-8">
              <div
                className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6"
                role="alert"
              >
                <p className="font-bold">No Catering Data Available</p>
                <p>
                  The catering menu is currently being set up. Please check back soon or contact us
                  directly for catering inquiries.
                </p>
              </div>
            </div>
          )}

          {/* Hero Section */}
          <section className="max-w-[1300px] mx-auto px-6 md:px-8 pt-12 pb-6 md:pt-16 md:pb-8">
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                {/* KEY CHANGE: Added lg:items-center to vertically align content,
                            and adjusted text/image containers to allow better centering effect */}
                <div className="flex flex-col lg:flex-row gap-8 md:gap-10 items-start lg:items-center">
                  {/* Combined Text Content */}
                  <div className="w-full lg:w-1/2 order-2 lg:order-1 space-y-8 text-center">
                    {/* Updated Text Formatting */}
                    <div className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 leading-tight">
                      <span className="block">Planning an event?</span>
                      <span className="block">Let us assist with vibrant</span>
                      <span className="block">Latin American flavors</span>
                      <span className="block">everyone will love!</span>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl md:text-3xl font-semibold text-gray-800">
                        We Cater:
                      </h3>
                      <ul className="space-y-3">
                        {cateringServices.map((service, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 text-xl text-gray-600 justify-center"
                          >
                            <span className="text-[#fdc32d] font-bold text-2xl">•</span>
                            <span>{service}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Image Container - Using flex to center the image itself within its half-width */}
                  <div className="w-full lg:w-1/2 order-1 lg:order-2 flex justify-center items-stretch overflow-hidden rounded-xl p-2">
                    <Image
                      src="/images/catering/catering.png"
                      alt="Catering service"
                      width={800}
                      height={600}
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-500 rounded-lg"
                      priority
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Dietary Options Section - Full-width accent */}
        <div className="bg-[#fdc32d] py-8 md:py-10">
          <div className="max-w-[1300px] mx-auto px-6 md:px-8">
            <h3
              className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center ${dancingScript.className}`}
            >
              Our menus are fully customizable and include a variety of <br />{' '}
              <b>
                <i>gluten free</i>
              </b>
              ,{' '}
              <b>
                <i>vegetarian</i>
              </b>
              , and
              <b>
                <i> vegan</i>
              </b>{' '}
              options to meet your needs!
            </h3>
          </div>
        </div>

        {/* Catering Options - Packages and A La Carte */}
        <section className="max-w-[1300px] mx-auto px-6 md:px-8 py-12 md:py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12">
            Catering Menu
          </h2>

          {/* Dietary Legend - Moved here above the menu tabs */}
          <div className="mb-8">
            <DietaryLegend />
          </div>

          {/* Use the client component for tabs */}
          <CateringMenuTabs
            cateringItems={cateringItems}
            cateringPackages={cateringPackages.filter(
              pkg =>
                pkg.type === CateringPackageType.INDIVIDUAL ||
                pkg.type === CateringPackageType.BOXED_LUNCH
            )}
          />
        </section>

        {/* Contact form and FAQ Section */}
        <section className="max-w-[1300px] mx-auto px-6 md:px-8 pt-8 pb-16 md:pt-12 md:pb-20">
          {/* NEW: Contact Section - Added before FAQ */}
          <section className="max-w-[1300px] mx-auto px-6 md:px-8 pb-12 md:pb-16">
            {/* Contact form with catering-specific styling */}
            <div className="bg-[#2d3538] rounded-lg overflow-hidden mb-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Left side - Contact info */}
                <div className="p-8 md:p-12">
                  <ContactInfoCatering />
                </div>

                {/* Right side - Contact form */}
                <div className="p-8 md:p-12">
                  <div className="bg-white rounded-lg p-6 md:p-8">
                    <h2 className="text-xl mb-6 font-semibold text-gray-800">Send us a message</h2>
                    <ContactForm />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <CateringFaqSection />
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};

export default CateringPage;
