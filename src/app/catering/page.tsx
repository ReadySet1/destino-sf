import CateringBanner from '@/components/CateringBanner';
import React from 'react';

const CateringPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <CateringBanner />

      <p className="text-xl mb-12 text-gray-600">
        Offering a diverse selection of savory Latin American dishes, we would be delighted to
        provide our catering services for your next event!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-800">We Cater For:</h3>
          <ul className="space-y-3 text-lg text-gray-600">
            <li>• Happy Hour Events</li>
            <li>• Cocktail Receptions</li>
            <li>• Birthday Celebrations</li>
            <li>• Dinner Parties</li>
            <li>• Corporate Meet & Greets</li>
            <li>• Corporate Luncheons</li>
          </ul>
        </div>

        <div className="bg-amber-100 p-8 rounded-lg">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Dietary Options</h3>
          <p className="text-lg text-gray-600">
            Customizable menus with a great selection of Gluten-free, Vegetarian & Vegan options!
          </p>
        </div>
      </div>

      <div className="mt-8">
        <button className="bg-amber-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-amber-700 transition-colors">
          Contact Us for Catering
        </button>
      </div>
    </div>
  );
};

export default CateringPage;
