'use client';

import React from 'react';
import StoreLocationsMap, { STORE_LOCATIONS } from '@/components/Maps/StoreLocationsMap';
import Link from 'next/link';

const StoreLocationsPage = () => {
  // Group locations by region
  const sanFranciscoLocations = STORE_LOCATIONS.filter(loc =>
    loc.address.toLowerCase().includes('san francisco')
  );
  const oaklandLocations = STORE_LOCATIONS.filter(loc =>
    loc.address.toLowerCase().includes('oakland')
  );
  const nuggetLocations = STORE_LOCATIONS.filter(
    loc =>
      loc.name.includes('Nugget') ||
      loc.name.includes('Sonoma Market') ||
      loc.name.includes('Fork Lift')
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-quicksand font-bold mb-4">
            Proud to Partner with Our Local Retailers
          </h1>
          <p className="text-xl md:text-2xl font-quicksand mb-6 opacity-90">
            You can find our handcrafted empanadas and alfajores at select stores and markets
            throughout Northern California — connecting people through food and community.
          </p>
          <div className="flex flex-wrap gap-4 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-quicksand">San Francisco Bay Area</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-quicksand">Greater Sacramento</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-quicksand">Northern California</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Location Count Message */}
        <div className="text-center mb-8">
          <p className="text-2xl font-quicksand text-amber-900 font-medium">
            29 Locations Bringing Destino Specialties to Northern California
          </p>
        </div>

        {/* Interactive Map Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-amber-100 mb-8">
          <div className="p-6 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
            <h2 className="text-2xl font-quicksand font-bold text-amber-900 mb-2">
              Interactive Store Locator
            </h2>
            <p className="text-amber-700 font-quicksand">
              Click on a location in the list to view it on the map, or explore all locations at
              once.
            </p>
          </div>
          <div className="h-[600px] w-full">
            <StoreLocationsMap showLocationsList={true} className="h-full w-full" />
          </div>
        </div>

        {/* Location Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* San Francisco */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-amber-100">
            <h3 className="text-xl font-quicksand font-bold text-amber-900 mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              San Francisco & Oakland
            </h3>
            <ul className="space-y-2">
              {[...sanFranciscoLocations, ...oaklandLocations].map((loc, idx) => (
                <li key={idx} className="text-sm text-gray-700 font-quicksand">
                  <span className="font-medium text-amber-800">{loc.name}</span>
                  <br />
                  <span className="text-gray-600">{loc.address}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Nugget Markets */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-amber-100">
            <h3 className="text-xl font-quicksand font-bold text-amber-900 mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              Nugget Markets
            </h3>
            <ul className="space-y-2">
              {nuggetLocations.map((loc, idx) => (
                <li key={idx} className="text-sm text-gray-700 font-quicksand">
                  <span className="font-medium text-amber-800">{loc.name}</span>
                  <br />
                  <span className="text-gray-600">{loc.address}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl p-8 text-center border border-amber-200">
          <h3 className="text-2xl font-quicksand font-bold text-amber-900 mb-4">
            Can&apos;t Find a Store Near You?
          </h3>
          <p className="text-amber-800 font-quicksand mb-6 max-w-2xl mx-auto">
            We offer nationwide shipping! Enjoy our handcrafted empanadas and alfajores delivered
            directly to your door anywhere in the United States.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/products"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-quicksand font-medium transition-colors shadow-md hover:shadow-lg"
            >
              Shop Online
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 bg-white hover:bg-amber-50 text-amber-600 rounded-lg font-quicksand font-medium transition-colors border-2 border-amber-600"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreLocationsPage;
