import { CartItem } from '@/store/cart';
import { CartItemRow } from './CartItemRow';

interface CartItemListProps {
  items: CartItem[];
  onRemove: (id: string, variantId?: string) => void;
  onUpdateQuantity: (id: string, quantity: number, variantId?: string) => void;
}

export function CartItemList({ 
  items, 
  onRemove, 
  onUpdateQuantity 
}: CartItemListProps) {
  return (
    <div className="divide-y">
      {items.map((item) => (
        <CartItemRow
          key={`${item.id}-${item.variantId || ''}`}
          item={item}
          onRemove={() => onRemove(item.id, item.variantId)}
          onUpdateQuantity={(quantity) => 
            onUpdateQuantity(item.id, quantity, item.variantId)
          }
        />
      ))}
    </div>
  );
}
