import React from 'react';

const MenuBanner: React.FC = () => {
  return (
    <div 
      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 py-8 md:py-12 text-center"
      role="banner"
      aria-label="Menu section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white font-quicksand tracking-tight">
          Our Menu
        </h1>
        <p className="mt-2 text-lg md:text-xl text-yellow-100">
          Discover our delicious selection of traditional treats
        </p>
      </div>
    </div>
  );
};

export default MenuBanner;
