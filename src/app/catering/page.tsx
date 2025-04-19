import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import ContactCateringPage from '../contact-catering/page';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

const CateringPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <CateringBanner />

      <div className="max-w-[1200px] mx-auto px-4">
        {/* Catering content */}
        <div className="mt-10">
          <h1
            className={twMerge(
              'text-3xl md:text-3xl lg:text-3xl font-normal text-gray-900',
              'leading-tight tracking-normal max-w-4xl mb-16'
            )}
          >
            Offering a diverse selection of savory Latin American dishes, we would be delighted to
            provide our catering services for your next event!
          </h1>

          <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <div className="space-y-4 flex-1">
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-800">We Cater For:</h3>
              <ul className="space-y-3 text-xl text-gray-600">
                <li>• Happy Hour Events</li>
                <li>• Cocktail Receptions</li>
                <li>• Birthday Celebrations</li>
                <li>• Dinner Parties</li>
                <li>• Corporate Meet & Greets</li>
                <li>• Corporate Luncheons</li>
              </ul>
            </div>
            <div className="flex-1">
              <Image
                src="/images/catering/catering.png"
                alt="Catering service"
                width={800}
                height={600}
                className="rounded-lg object-cover"
              />
            </div>
          </div>
        </div>

        {/* Dietary Options section */}
        <div className="mt-16 mb-16">
          <div className="bg-[#fdc32d] p-8 rounded-lg">
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
              Dietary Options
            </h3>
            <p className="text-xl text-gray-600">
              Customizable menus with a great selection of Gluten-free, Vegetarian & Vegan options!
            </p>
          </div>
        </div>

        {/* Contact form at the bottom */}
        <div className="mb-16">
          <ContactCateringPage />
        </div>
      </div>
    </div>
  );
};

export default CateringPage;
