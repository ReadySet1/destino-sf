import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyCart() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <ShoppingCart className="h-10 w-10 text-gray-400" />
      </div>
      
      <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
      <p className="mb-8 text-gray-500">
        Looks like you haven't added any items to your cart yet.
      </p>
      
      <Link href="/menu">
        <Button size="lg">
          Browse Menu
        </Button>
      </Link>
    </div>
  );
}
