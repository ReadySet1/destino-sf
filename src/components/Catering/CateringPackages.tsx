'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CateringPackage, CateringPackageType } from '@/types/catering';
import { Star, StarHalf, ShoppingCart, Users, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CateringOrderModal } from '@/components/Catering/CateringOrderModal';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface CateringPackagesProps {
  packages: CateringPackage[];
}

// Helper functions for text formatting
const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  
  // Words that should not be capitalized (articles, conjunctions, prepositions)
  const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'de'];
  
  // Split the string into words
  const words = str.toLowerCase().split(' ');
  
  // Always capitalize the first and last word
  return words.map((word, index) => {
    // Always capitalize first and last word, or if not a minor word
    if (index === 0 || index === words.length - 1 || !minorWords.includes(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
};

const formatDescription = (str: string | null | undefined): string => {
  if (!str) return '';
  const trimmedStr = str.trim();
  return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1);
};

export const CateringPackages: React.FC<CateringPackagesProps> = ({ packages }) => {
  const [filter, setFilter] = useState<CateringPackageType | 'ALL'>('ALL');

  const filteredPackages = filter === 'ALL' 
    ? packages 
    : packages.filter(pkg => pkg.type === filter);

  return (
    <div className="w-full">
      <Toaster position="top-right" />
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Destino Catering Packages
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            {formatDescription("Catering for a crowd is hard. That's why we've taken the best items on our menu and created ready to order catering packages for your convenience. Each package is priced per person and can be customized to suit any group size and any taste.")}
          </p>
        </motion.div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <Button 
          onClick={() => setFilter('ALL')}
          variant={filter === 'ALL' ? "default" : "outline"}
          className={cn(
            "rounded-full px-8 py-6 text-base",
            filter === 'ALL' ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
          )}
        >
          All Packages
        </Button>
        <Button 
          onClick={() => setFilter(CateringPackageType.INDIVIDUAL)}
          variant={filter === CateringPackageType.INDIVIDUAL ? "default" : "outline"}
          className={cn(
            "rounded-full px-8 py-6 text-base",
            filter === CateringPackageType.INDIVIDUAL ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
          )}
        >
          <Coffee className="mr-2 h-5 w-5" />
          Individual Boxes
        </Button>
        <Button 
          onClick={() => setFilter(CateringPackageType.BUFFET)}
          variant={filter === CateringPackageType.BUFFET ? "default" : "outline"}
          className={cn(
            "rounded-full px-8 py-6 text-base",
            filter === CateringPackageType.BUFFET ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
          )}
        >
          <Users className="mr-2 h-5 w-5" />
          Buffet Style
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
        {filteredPackages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <CateringPackageCard cateringPackage={pkg} />
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="text-center mt-12 mb-8 bg-gray-50 p-8 rounded-xl shadow-sm border border-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Prefer to Build Your Own?
        </h3>
        <p className="text-gray-600 max-w-3xl mx-auto mb-8 text-lg">
          {formatDescription("If our catering packages don't fit your needs, Destino also offers a la carte ordering to create your own custom menu.")}
        </p>
        <Link href="/catering/a-la-carte">
          <Button 
            className="bg-[#fab526] hover:bg-[#fab526]/90 text-black font-semibold px-10 py-6 text-lg rounded-full"
          >
            Browse A La Carte Menu
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

interface CateringPackageCardProps {
  cateringPackage: CateringPackage;
}

const CateringPackageCard: React.FC<CateringPackageCardProps> = ({ cateringPackage }) => {
  const { name, description, pricePerPerson, type, ratings, imageUrl } = cateringPackage;
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Calculate average rating
  const averageRating = ratings && ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
    : 0;
  
  // Generate star rating display
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="w-5 h-5 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<StarHalf key="half-star" className="w-5 h-5 fill-yellow-400 text-yellow-400" />);
    }
    
    return stars;
  };

  // Process description with better formatting - extract key points in bold
  const formatPackageDescription = (desc: string | null | undefined): React.ReactNode => {
    if (!desc) return null;
    
    // Format the description with styled elements
    const formattedDescription = formatDescription(desc);
    
    // Split by sentences or phrases to apply different styles
    const sentences = formattedDescription.split(/\.\s+/);
    
    if (sentences.length === 1) {
      return <p className="text-gray-600 mb-4">{formattedDescription}</p>;
    }
    
    return (
      <div className="text-gray-600 mb-4 space-y-2">
        {sentences.map((sentence, idx) => {
          // Don't add period to the last sentence if it doesn't end with one
          const displaySentence = idx < sentences.length - 1 ? `${sentence}.` : sentence;
          
          if (idx === 0) {
            // First sentence in bold
            return <p key={idx} className="font-medium">{displaySentence}</p>;
          } else if (idx === sentences.length - 1) {
            // Last sentence in italics
            return <p key={idx} className="italic text-sm">{displaySentence}</p>;
          } else {
            // Middle sentences with regular styling
            return <p key={idx}>{displaySentence}</p>;
          }
        })}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        <div className="relative">
          <div className="w-full aspect-[16/9] relative">
            <Image
              src={imageUrl || '/images/catering/default-package.jpg'}
              alt={toTitleCase(name)}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/catering/default-package.jpg';
              }}
            />
          </div>
          <div className="absolute top-4 right-4 px-4 py-2 bg-white bg-opacity-90 rounded-full text-center shadow-sm">
            <span className={type === CateringPackageType.INDIVIDUAL ? "text-blue-700" : "text-emerald-700"}>
              {type === CateringPackageType.INDIVIDUAL ? 'Individual' : 'Buffet Style'}
            </span>
          </div>
        </div>
        
        <div className="p-5 md:p-6 flex flex-col flex-grow">
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{toTitleCase(name)}</h3>
          
          {formatPackageDescription(description)}
          
          {ratings && ratings.length > 0 && (
            <div className="flex items-center gap-1 mb-4">
              {renderStars(averageRating)}
              <span className="text-gray-500 text-sm ml-1">({ratings.length})</span>
            </div>
          )}
          
          <div className="mt-auto pt-3">
            <div className="flex justify-between items-center mb-3">
              <div className="text-2xl font-bold text-gray-800">
                ${pricePerPerson.toFixed(2)} <span className="text-sm font-normal text-gray-600">per person</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowOrderModal(true)}
              className="w-full bg-[#2d3538] hover:bg-[#2d3538]/90 py-5 text-base font-medium"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Order This Package
            </Button>
          </div>
        </div>
      </div>
      
      <CateringOrderModal 
        item={cateringPackage} 
        type="package" 
        isOpen={showOrderModal} 
        onClose={() => setShowOrderModal(false)} 
      />
    </>
  );
};

export default CateringPackages; 