import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import ContactCateringPage from '../contact-catering/page';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

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

        {/* FAQ Section */}
        <div className="mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 md:mb-8">
            Catering: Frequently Asked Questions
          </h2>

          <div className="space-y-6 md:space-y-8">
            {[
              {
                question: '1. Can you accommodate dietary restrictions or special requests?',
                answer:
                  "Absolutely! We offer a wide variety of options to accommodate different dietary needs — including vegetarian, vegan, gluten-free, and dairy-free selections! We're also happy to customize your order based on your event's needs. Just let us know your requirements when placing your order, and we'll work with you to create a menu everyone can enjoy.",
              },
              {
                question: '2. Where do you deliver catering orders?',
                answer:
                  'We proudly serve clients throughout San Francisco and the greater Bay Area! Based in San Francisco, we deliver all catering orders to ensure the highest quality and freshness. Unfortunately, we do not ship catering orders.',
              },
              {
                question: '3. How much lead time do you need for catering orders?',
                answer:
                  "We kindly ask for at least three business days of notice for all catering orders. If you have a last-minute request, just email us at james@destinosf.com — we'll do our best to accommodate!",
              },
              {
                question: '4. Do you offer family-style buffet or individually packaged meals?',
                answer:
                  "Absolutely. We offer both individually packaged meals and classic buffet-style setups — along with appetizer platters and family-style service. Let us know what works best for your event, and we'll tailor the format to your needs.",
              },
              {
                question: '5. What services do you offer with catering?',
                answer:
                  "We offer a range of services to match your event needs. For full-service events, catering staff can be provided upon request — just let us know the details and we'll prepare a custom quote. For drop-off orders, we package everything for easy serving, and can also provide compostable plates, napkins, and utensils upon request.",
              },
            ].map((faq, index) => (
              <div key={index}>
                <h3 className="text-xl font-medium text-gray-800 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CateringPage;
