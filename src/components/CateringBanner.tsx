'use client';

import React from 'react';
import Image from 'next/image';

const CateringBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background with gray gradient */}
      <div className="absolute inset-0 z-0 bg-[#2d3538]" />

      {/* Background pattern using CSS */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%), 
                            radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%)`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Catering</h1>

          <div className="mt-2 h-1 w-16 bg-white sm:w-20 lg:w-24" />

          <p className="mx-auto mt-3 text-4xl text-white sm:mt-4" style={{ fontStyle: 'italic' }}>
            Let us cater your next event!
          </p>
        </div>
      </div>
    </div>
  );
};

export default CateringBanner;
