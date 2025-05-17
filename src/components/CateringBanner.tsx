'use client';

import React from 'react';
import { motion } from 'framer-motion';

const CateringBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-[#2d3538]">
      {/* Background pattern using CSS */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%), 
                            radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%)`,
          backgroundSize: '100px 100px'
        }}
      />
      
      {/* Main content */}
      <div className="relative py-10 md:py-16 text-center">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
              Catering
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              Authentic Latin American flavors for your special events
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CateringBanner;
