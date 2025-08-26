import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { QuantityStepper } from './QuantityStepper';
import { CartItem } from '@/store/cart';
import { CateringCartItem } from '@/store/catering-cart';
import { getBoxedLunchImage } from '@/lib/utils';

interface CartItemRowProps {
  item: CartItem | CateringCartItem;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}

export function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemRowProps) {
  // Function to get the appropriate image for the item
  const getItemImage = (): string | null => {
    // If item already has an image, use it
    if (item.image) {
      return item.image;
    }

    // Check if this is a boxed lunch item by examining variantId metadata
    if (item.variantId) {
      try {
        const metadata = JSON.parse(item.variantId);
        if (metadata.type === 'boxed-lunch') {
          // Use getBoxedLunchImage to get the protein-specific image
          return getBoxedLunchImage(item.name);
        }
      } catch (e) {
        // If JSON parsing fails, continue with default logic
      }
    }

    // For non-boxed lunch items without images, check if name suggests it's a boxed lunch
    if (item.name.toLowerCase().includes('tier')) {
      return getBoxedLunchImage(item.name);
    }

    return null;
  };

  const itemImage = getItemImage();

  return (
    <div className="p-4 sm:p-6 hover:bg-destino-cream/20 transition-colors duration-200">
      {/* Mobile Layout: Image and Content Side by Side */}
      <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-0">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <div className="relative h-20 w-20 sm:h-16 sm:w-16 overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm">
            {itemImage ? (
              <Image src={itemImage} alt={item.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-xs text-gray-500">No image</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-destino-charcoal leading-tight mb-1 sm:truncate">
            <span className="block sm:hidden">{item.name}</span>
            <span className="hidden sm:block truncate">{item.name}</span>
          </h3>
          <p className="text-sm text-gray-600 mb-2">${item.price.toFixed(2)} / each</p>
          
          {/* Mobile: Show total price prominently */}
          <div className="block sm:hidden">
            <p className="text-lg font-bold text-destino-charcoal">${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        </div>

        {/* Desktop: Total Price */}
        <div className="hidden sm:block sm:mx-4 font-semibold text-lg text-destino-charcoal">
          ${(item.price * item.quantity).toFixed(2)}
        </div>
      </div>

      {/* Controls Row - Better Spacing for Mobile */}
      <div className="flex items-center justify-between sm:justify-end pt-3 sm:pt-0 border-t border-destino-cream/50 sm:border-t-0">
        {/* Quantity Stepper */}
        <div className="flex items-center">
          <span className="text-sm font-medium text-destino-charcoal mr-3 sm:hidden">Quantity:</span>
          <QuantityStepper value={item.quantity} min={1} max={20} onChange={onUpdateQuantity} />
        </div>

        {/* Remove Button - Larger touch target for mobile */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRemove} 
          className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 sm:px-2 sm:py-2 transition-all duration-200 hover:shadow-sm"
          title="Remove item"
        >
          <Trash2 className="h-4 w-4 mr-1 sm:mr-0" />
          <span className="sm:hidden">Remove</span>
        </Button>
      </div>
    </div>
  );
}
