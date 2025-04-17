'use client';

import React from 'react';

const CateringBanner: React.FC = () => {
  return (
    <div className="m-0">
      <style jsx>{`
        @media (max-width: 640px) {
          .menu-banner {
            margin-top: 0;
            margin-bottom: 0;
          }
        }
      `}</style>
      <div
        className="menu-banner w-full bg-gradient-to-r from-red-800 to-red-900 md:py-12 text-center"
        role="banner"
        aria-label="Menu section"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-quicksand tracking-tight">
            Catering
          </h1>
          <p className="mt-2 text-lg md:text-xl text-red-100">Let us cater your next event!</p>
        </div>
      </div>
    </div>
  );
};

export default CateringBanner;
