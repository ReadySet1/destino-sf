'use client';

import React from 'react';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google'; // Importamos la fuente

// Configuramos la fuente Dancing Script
const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const MenuBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background with yellow gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-yellow-500 to-yellow-600" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h1
            className={`text-4xl font-bold tracking-tight text-white sm:text-5xl ${dancingScript.className}`}
          >
            Our Menu
          </h1>

          <div className="mt-2 h-1 w-16 bg-white sm:w-20 lg:w-24" />

          <p className="mx-auto mt-3 text-4xl text-white sm:mt-4" style={{ fontStyle: 'italic' }}>
            Please explore our menu of handcrafted Latin American favorites <br /> Available for
            retail and wholesale!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MenuBanner;
