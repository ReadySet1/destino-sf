'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CateringItem, CateringPackage } from '@/types/catering';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

interface CateringOrderModalProps {
  item: CateringItem | CateringPackage;
  type: 'item' | 'package';
  isOpen: boolean;
  onClose: () => void;
}

export function CateringOrderModal({ item, type, isOpen, onClose }: CateringOrderModalProps) {
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  
  // For packages we need the per-person price
  const itemPrice = type === 'package' 
    ? (item as CateringPackage).pricePerPerson
    : (item as CateringItem).price;
  
  const handleDecreaseQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const handleIncreaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };
  
  const handleAddToCart = () => {
    const cartItem = {
      id: item.id,
      name: item.name,
      price: itemPrice,
      quantity: quantity,
      image: item.imageUrl || '/images/catering/default-package.jpg',
      // Store catering type for checkout process
      variantId: JSON.stringify({
        type,
        minPeople: type === 'package' ? (item as CateringPackage).minPeople : undefined
      })
    };
    
    addItem(cartItem);
    toast.success(`${quantity} ${item.name} added to your cart`);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Order {item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-4">
            {item.description}
          </div>
          
          {type === 'package' && (
            <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
              <p>
                <span className="font-semibold">Package Info:</span> 
                {' '}${(item as CateringPackage).pricePerPerson.toFixed(2)} per person
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Minimum {(item as CateringPackage).minPeople} people required. 
                You&apos;ll select the number of people at checkout.
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-medium text-sm mb-1">Quantity</p>
              <div className="flex items-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={handleDecreaseQuantity}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={handleIncreaseQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-medium text-sm mb-1">Price</p>
              <div className="text-xl font-bold">
                {type === 'package' 
                  ? `$${(item as CateringPackage).pricePerPerson.toFixed(2)} per person`
                  : `$${(itemPrice * quantity).toFixed(2)}`
                }
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleAddToCart} 
            className="w-full bg-[#2d3538] hover:bg-[#2d3538]/90"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CateringOrderModal; 