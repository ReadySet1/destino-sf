'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCateringCartStore } from '@/store/catering-cart';
import { ShoppingCart } from 'lucide-react';

export function CateringCartButton() {
  const { items, totalItems } = useCateringCartStore();

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Link href="/catering/checkout">
        <Button
          size="lg"
          className="bg-[#2d3538] hover:bg-[#2d3538]/90 rounded-full shadow-lg px-5 py-6"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          <span className="mr-1">View Cart</span>
          <span className="inline-flex items-center justify-center bg-white text-[#2d3538] rounded-full w-6 h-6 text-sm font-bold">
            {totalItems}
          </span>
        </Button>
      </Link>
    </div>
  );
}

export default CateringCartButton;
