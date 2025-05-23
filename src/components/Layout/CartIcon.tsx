import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useSmartCart } from '@/hooks/useSmartCart';

export function CartIcon() {
  const { getTotalItemCount, regularCart, cateringCart } = useSmartCart();
  const totalCount = getTotalItemCount();
  
  // Determine if we have items in either cart
  const hasRegularItems = regularCart.items.length > 0;
  const hasCateringItems = cateringCart.items.length > 0;
  
  return (
    <Link href="/cart" className="relative">
      <ShoppingCart className="h-6 w-6" />
      {totalCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {totalCount}
        </span>
      )}
      {hasRegularItems && hasCateringItems && (
        <span className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full h-2 w-2"></span>
      )}
    </Link>
  );
} 