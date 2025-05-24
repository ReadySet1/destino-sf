'use client';

import React from 'react';
import Image from 'next/image';

const MenuBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background with yellow gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-yellow-500 to-yellow-600" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-xl">
          <h1 className="font-quicksand text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Our Menu
          </h1>

          <div className="mt-2 h-1 w-16 bg-white sm:w-20 lg:w-24" />

          <p className="mt-6 max-w-lg text-lg text-yellow-100 sm:text-xl">
            Please explore our menu of handcrafted Latin American favorites - available for retail
            and wholesale!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MenuBanner;
