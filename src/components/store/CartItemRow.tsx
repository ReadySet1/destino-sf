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
    <div className="flex flex-col sm:flex-row items-start sm:items-center p-4">
      {/* Product Image */}
      <div className="mr-4 flex-shrink-0">
        <div className="relative h-16 w-16 overflow-hidden rounded-md bg-gray-200">
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
      <div className="flex-1 min-w-0 mb-3 sm:mb-0">
        <h3 className="font-medium truncate">{item.name}</h3>
        <p className="text-sm text-gray-500">${item.price.toFixed(2)} / each</p>
      </div>

      {/* Mobile Layout: Controls in a row at the bottom */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end mt-2 sm:mt-0">
        {/* Quantity Stepper */}
        <div className="mr-3 sm:mx-4">
          <QuantityStepper value={item.quantity} min={1} max={20} onChange={onUpdateQuantity} />
        </div>

        {/* Total Price */}
        <div className="mx-3 sm:mx-4 font-medium">${(item.price * item.quantity).toFixed(2)}</div>

        {/* Remove Button */}
        <div>
          <Button variant="ghost" size="icon" onClick={onRemove} title="Remove item">
            <Trash2 className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
