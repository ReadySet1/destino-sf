import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import ContactCateringPage from '../contact-catering/page';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import CateringFaqSection from '@/components/FAQ/CateringFaqSection';

const CateringPage: React.FC = () => {
  // Services we offer
  const cateringServices = [
    'Corporate Luncheons',
    'Cocktail Receptions',
    'Birthday Celebrations & Dinner Parties',
    'Happy Hour Events',
    'Corporate Meet & Greets',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Banner Section */}
      <CateringBanner />

      {/* Main Content Container */}
      <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
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

      {/* Contact Form and FAQ Section */}
      <div className="max-w-[1200px] mx-auto px-4 pb-16">
        {/* Contact Form Section */}
        <div className="mb-16">
          <ContactCateringPage />
        </div>

        {/* FAQ Section */}
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            <CateringFaqSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CateringPage;
