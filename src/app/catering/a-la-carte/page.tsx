import React from 'react';
import CateringBanner from '@/components/CateringBanner';
import { ALaCarteMenu } from '@/components/Catering';
import ContactCateringPage from '@/app/contact-catering/page';
import { getCateringItems } from '@/actions/catering';
import CateringCartButton from '@/components/Catering/CateringCartButton';

export const dynamic = 'force-dynamic';

const ALaCartePage = async () => {
  // Fetch real catering items from the database
  const cateringItems = await getCateringItems();

  return (
    <div className="min-h-screen bg-white">
      <CateringBanner />
      <CateringCartButton />

      <div className="max-w-[1200px] mx-auto px-4">
        <div className="mt-10 mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-8">
            A La Carte Menu
          </h1>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
            If our catering packages don&apos;t fit your needs, Destino also offers a la carte
            ordering. Select individual items for your event based on your specific requirements.
          </p>

          <ALaCarteMenu items={cateringItems} />
        </div>

        {/* Contact form at the bottom */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-center text-gray-800 mb-8">
            Ready to Order?
          </h2>
          <ContactCateringPage />
        </div>
      </div>
    </div>
  );
};

export default ALaCartePage;
