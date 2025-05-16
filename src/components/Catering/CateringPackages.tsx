'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CateringPackage, CateringPackageType } from '@/types/catering';
import { Star, StarHalf, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CateringOrderModal } from '@/components/Catering/CateringOrderModal';
import { Toaster } from 'react-hot-toast';

interface CateringPackagesProps {
  packages: CateringPackage[];
}

// Helper functions for text formatting
const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
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
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Destino Catering Packages
        </h2>
        <p className="text-gray-600 max-w-3xl mx-auto">
          {formatDescription("Catering for a crowd is hard. That's why we've taken the best items on our menu and created ready to order catering packages for your convenience. Each package is priced per person and can be customized to suit any group size and any taste.")}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-8">
        <Button 
          onClick={() => setFilter('ALL')}
          variant={filter === 'ALL' ? "default" : "outline"}
          className={cn(
            "rounded-full px-6",
            filter === 'ALL' ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
          )}
        >
          All
        </Button>
        <Button 
          onClick={() => setFilter(CateringPackageType.INDIVIDUAL)}
          variant={filter === CateringPackageType.INDIVIDUAL ? "default" : "outline"}
          className={cn(
            "rounded-full px-6",
            filter === CateringPackageType.INDIVIDUAL ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
          )}
        >
          Individuals
        </Button>
        <Button 
          onClick={() => setFilter(CateringPackageType.BUFFET)}
          variant={filter === CateringPackageType.BUFFET ? "default" : "outline"}
          className={cn(
            "rounded-full px-6",
            filter === CateringPackageType.BUFFET ? "bg-[#2d3538] hover:bg-[#2d3538]/90" : ""
          )}
        >
          Buffet
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {filteredPackages.map(pkg => (
          <CateringPackageCard key={pkg.id} cateringPackage={pkg} />
        ))}
      </div>

      <div className="text-center mt-12 mb-16">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          A La Carte Menu
        </h3>
        <p className="text-gray-600 max-w-3xl mx-auto mb-6">
          {formatDescription("If our catering packages don't fit your needs, Destino also offers a la carte ordering.")}
        </p>
        <Link href="/catering/a-la-carte">
          <Button 
            className="bg-[#fab526] hover:bg-[#fab526]/90 text-black font-semibold px-8 py-6 text-lg"
          >
            Order A La Carte
          </Button>
        </Link>
      </div>
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 relative">
            <div className="aspect-[4/3] relative">
              <Image
                src={imageUrl || '/images/catering/default-package.jpg'}
                alt={toTitleCase(name)}
                fill
                className="object-cover"
              />
            </div>
          </div>
          <div className="w-full md:w-2/3 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{toTitleCase(name)}</h3>
            {formatPackageDescription(description)}
            
            {ratings && ratings.length > 0 && (
              <div className="flex items-center gap-1 mb-4">
                {renderStars(averageRating)}
                <span className="text-gray-500 text-sm ml-1">({ratings.length})</span>
              </div>
            )}
            
            <div className="flex justify-between items-center mt-auto">
              <div className="px-4 py-2 bg-gray-100 rounded-full text-center">
                {type === CateringPackageType.INDIVIDUAL ? 'Individual' : 'Buffet'}
              </div>
              <div className="text-xl font-bold">
                ${pricePerPerson.toFixed(2)} <span className="text-sm font-normal">/Person</span>
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                onClick={() => setShowOrderModal(true)}
                className="w-full bg-[#2d3538] hover:bg-[#2d3538]/90"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Order Package
              </Button>
            </div>
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