import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star } from 'lucide-react';
import { ProductImage } from '@/components/ui/product-image';

export interface AlfajoresItemProps {
  id: string;
  name: string;
  image?: string;
  price: number;
  description?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  servingSize?: string;
  featured?: boolean;
}

interface AlfajoresGridProps {
  alfajores: AlfajoresItemProps[];
  onAddToCart?: (item: AlfajoresItemProps) => void;
}

const AlfajoresCard: React.FC<{
  item: AlfajoresItemProps;
  onAddToCart?: (item: AlfajoresItemProps) => void;
  index: number;
}> = ({ item, onAddToCart, index }) => {
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(item);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <ProductImage
          src={item.image || '/images/menu/alfajores.png'}
          alt={item.name}
          className="object-cover object-center transition-all duration-300 group-hover:scale-105"
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          priority={item.featured || index < 4}
          fallbackSrc="/images/menu/alfajores.png"
          skeletonVariant="card"
        />
        {item.featured && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-orange-500 text-white px-2 py-1 text-xs font-semibold rounded shadow-sm flex items-center gap-1">
              <Star className="h-3 w-3" />
              Featured
            </div>
          </div>
        )}
        
        {/* Dietary badges */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {item.isVegetarian && (
            <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
              V
            </span>
          )}
          {item.isVegan && (
            <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
              VG
            </span>
          )}
          {item.isGlutenFree && (
            <span className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
              GF
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col h-full">
        {/* Header with name and price - Fixed alignment */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">
            {item.name}
          </h3>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-orange-600">
              ${item.price.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Serving size - Fixed "One Piece" alignment */}
        {item.servingSize && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              {item.servingSize}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Per piece
            </span>
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-3 flex-grow mb-4">
            {item.description}
          </p>
        )}

        {/* Add to Cart Button */}
        <div className="mt-auto">
          <button
            onClick={handleAddToCart}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const AlfajoresGrid: React.FC<AlfajoresGridProps> = ({ 
  alfajores, 
  onAddToCart 
}) => {
  return (
    <div className="w-full">
      {/* Grid Layout with consistent spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {alfajores.map((item, index) => (
          <AlfajoresCard
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default AlfajoresGrid; 