'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { BoxedLunchItem, BoxedLunchModifier } from '@/types/catering';
import { TropicalSaladModifier } from './TropicalSaladModifier';
import {
  calculateTotalPrice,
  formatPrice,
  getDietaryBadges,
  isTropicalSaladItem,
  createCartItemFromBoxedLunch,
  getModifierById,
} from '@/lib/catering/boxed-lunch-utils';
import { sanitizeProductDescription } from '@/lib/utils/product-description';
import { useCateringCartStore } from '@/store/catering-cart';
import { toast } from '@/lib/toast';

interface BoxedLunchCardProps {
  item: BoxedLunchItem;
  className?: string;
}

export const BoxedLunchCard: React.FC<BoxedLunchCardProps> = ({
  item,
  className = '',
}) => {
  const [selectedModifierId, setSelectedModifierId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCateringCartStore();

  const selectedModifier = selectedModifierId 
    ? getModifierById(item, selectedModifierId) 
    : undefined;
  
  const totalPrice = calculateTotalPrice(item, selectedModifier);
  const dietaryBadges = getDietaryBadges(item);
  const isTropicalSalad = isTropicalSaladItem(item);

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity));
  };

  const handleAddToCart = () => {
    const cartItem = createCartItemFromBoxedLunch(item, quantity, selectedModifier);
    
    addItem(cartItem);
    
    const successMessage = selectedModifier 
      ? `Added ${quantity}x ${item.name} with ${selectedModifier.name} to catering cart!`
      : `Added ${quantity}x ${item.name} to catering cart!`;
    
    toast.success(successMessage);
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-300 h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-lg font-bold text-gray-800 line-clamp-2 flex-1 mr-2">
            {item.name}
          </CardTitle>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-primary">
              {formatPrice(totalPrice)}
            </div>
            {selectedModifier && (
              <div className="text-xs text-gray-500">
                Base: {formatPrice(item.price)}
              </div>
            )}
          </div>
        </div>
        
        {/* Dietary Badges */}
        <div className="flex flex-wrap gap-1">
          {dietaryBadges.map((badge, index) => (
            <Badge 
              key={index} 
              variant={badge.variant}
              className={badge.className}
            >
              {badge.label}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Item Image */}
        {item.imageUrl && (
          <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={400}
              height={192}
              className="w-full h-full object-cover"
              onError={() => {
                // Hide image on error
                const img = document.querySelector(`img[alt="${item.name}"]`) as HTMLElement;
                if (img?.parentElement) {
                  img.parentElement.style.display = 'none';
                }
              }}
            />
          </div>
        )}

        {/* Description */}
        <div
          className="text-gray-600 text-sm flex-1"
          dangerouslySetInnerHTML={{
            __html: sanitizeProductDescription(item.description)
          }}
        />

        {/* Tropical Salad Modifier */}
        {isTropicalSalad && item.modifiers && (
          <TropicalSaladModifier
            modifiers={item.modifiers}
            selectedModifierId={selectedModifierId}
            onSelect={setSelectedModifierId}
            className="mt-4"
          />
        )}

        {/* Quantity and Add to Cart */}
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-medium px-3 min-w-[2rem] text-center">
              {quantity}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleQuantityChange(quantity + 1)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleAddToCart}
            className="bg-amber-600 hover:bg-amber-700 text-white transition-all duration-200"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BoxedLunchCard;
