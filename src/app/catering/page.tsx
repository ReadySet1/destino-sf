import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import ContactCateringPage from '../contact-catering/page';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';
import CateringFaqSection from '@/components/FAQ/CateringFaqSection';

const CateringPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="mb-4">
        <CateringBanner />
      </div>

      <div className="max-w-[1200px] mx-auto px-4">
        {/* Catering content */}
        <div className="mt-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
            Planning an event? Let us assist with vibrant Latin American flavors everyone will love.
          </h1>

          <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <div className="space-y-4 flex-1">
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mt-8">We Cater:</h3>
              <ul className="space-y-3 text-xl text-gray-600">
                {[
                  'Corporate Luncheons',
                  'Cocktail Receptions',
                  'Birthday Celebrations & Dinner Parties',
                  'Happy Hour Events',
                  'Corporate Meet & Greets',
                ].map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
            {/* Image container with responsive margins - ENHANCED FOR MOBILE */}
            <div className="w-full md:w-2/3 mt-6 md:mt-8 flex justify-end md:justify-center">
              <Image
                src="/images/catering/catering.png"
                alt="Catering service"
                width={800}
                height={600}
                className="rounded-lg object-cover w-[140%] md:w-full ml-auto md:ml-0" // Significantly larger on mobile and right-aligned
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dietary Options section - Full width with reduced padding */}
      <div className="bg-[#fdc32d] py-6 md:py-8 my-8 md:my-16">
        <div className="max-w-[1200px] mx-auto px-4">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 mb-2 md:mb-4">
            Our menus are fully customizable and include plenty of gluten-free, vegetarian, and
            vegan options to meet your needs.
          </h3>
        </div>
      </div>

      {/* Start of second max-w-[1200px] container for remaining content */}
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Contact form section - Moved above FAQ */}
        <div className="mb-12 md:mb-16">
          <ContactCateringPage />
        </div>

        {/* Replace the static FAQ with the new collapsible component */}
        <CateringFaqSection />
      </div>
    </div>
  );
};

export default CateringPage;
