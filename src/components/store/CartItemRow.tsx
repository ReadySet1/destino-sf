import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from './QuantityStepper';
import { CartItem } from '@/store/cart';

interface CartItemRowProps {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}

export function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemRowProps) {
  return (
    <div className="flex items-center p-4">
      {/* Product Image */}
      <div className="mr-4 flex-shrink-0">
        <div className="relative h-16 w-16 overflow-hidden rounded-md bg-gray-200">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-xs text-gray-500">No image</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Product Info */}
      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        <p className="text-sm text-gray-500">
          ${item.price.toFixed(2)} / each
        </p>
      </div>
      
      {/* Quantity Stepper */}
      <div className="mx-4">
        <QuantityStepper
          value={item.quantity}
          min={1}
          max={20}
          onChange={onUpdateQuantity}
        />
      </div>
      
      {/* Total Price */}
      <div className="mx-4 text-right font-medium">
        ${(item.price * item.quantity).toFixed(2)}
      </div>
      
      {/* Remove Button */}
      <div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          title="Remove item"
        >
          <Trash2 className="h-4 w-4 text-gray-500" />
        </Button>
      </div>
    </div>
  );
}
