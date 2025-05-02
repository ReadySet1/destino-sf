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
      </div>

      {/* Dietary Options section - Full width */}
      <div className="bg-[#fdc32d] py-16 my-16">
        <div className="max-w-[1200px] mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">Dietary Options</h3>
          <p className="text-xl text-gray-600">
            Customizable menus with a great selection of Gluten-free, Vegetarian & Vegan options!
          </p>
        </div>
      </div>

      {/* Start of second max-w-[1200px] container for remaining content */}
      <div className="max-w-[1200px] mx-auto px-4">
        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-8">
            Catering: Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                1. Can you accommodate dietary restrictions or special requests?
              </h3>
              <p className="text-gray-600">
                Absolutely! We offer a wide variety of options to accommodate different dietary
                needs — including vegetarian, vegan, gluten-free, and dairy-free selections!
                We&apos;re also happy to customize your order based on your event&apos;s needs. Just
                let us know your requirements when placing your order, and we&apos;ll work with you
                to create a menu everyone can enjoy.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                2. Where do you deliver catering orders?
              </h3>
              <p className="text-gray-600">
                We proudly serve clients throughout San Francisco and the greater Bay Area! Based in
                San Francisco, we deliver all catering orders to ensure the highest quality and
                freshness. Unfortunately, we do not ship catering orders.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                3. How much lead time do you need for catering orders?
              </h3>
              <p className="text-gray-600">
                We kindly ask for at least three business days of notice for all catering orders. If
                you have a last-minute request, just email us at james@destinosf.com — we&apos;ll do
                our best to accommodate!
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                4. Do you offer family-style buffet or individually packaged meals?
              </h3>
              <p className="text-gray-600">
                Absolutely. We offer both individually packaged meals and classic buffet-style
                setups — along with appetizer platters and family-style service. Let us know what
                works best for your event, and we&apos;ll tailor the format to your needs.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                5. What services do you offer with catering?
              </h3>
              <p className="text-gray-600">
                We offer a range of services to match your event needs. For full-service events,
                catering staff can be provided upon request — just let us know the details and
                we&apos;ll prepare a custom quote. For drop-off orders, we package everything for
                easy serving, and can also provide compostable plates, napkins, and utensils upon
                request.
              </p>
            </div>
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
