'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { CartItemList } from '@/components/Store/CartItemList';
import { CartSummary } from '@/components/Store/CartSummary';
import { EmptyCart } from '@/components/Store/EmptyCart';

export default function CartPage() {
  const { items, totalPrice, totalItems, removeItem, updateQuantity, clearCart } = useCartStore();

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <main className="container mx-auto px-4 py-4 sm:py-8 pb-24 sm:pb-8">
      <h1 className="mb-4 sm:mb-8 text-xl sm:text-3xl font-bold">Your Cart</h1>

      <div className="flex flex-col gap-4 sm:gap-8 lg:grid lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white shadow-sm">
            <CartItemList items={items} onRemove={removeItem} onUpdateQuantity={updateQuantity} />

            <div className="p-4">
              <Button variant="outline" className="w-full" onClick={clearCart}>
                Clear Cart
              </Button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:static fixed bottom-0 left-0 right-0 bg-white border-t lg:border-t-0 p-4 lg:p-0 shadow-md lg:shadow-none z-10">
          <CartSummary subtotal={totalPrice} totalItems={totalItems} />

          <div className="mt-4 space-y-2 flex flex-col sm:space-y-4">
            <Link href="/checkout" className="block">
              <Button className="w-full">Proceed to Checkout</Button>
            </Link>

            <Link href="/menu" className="block">
              <Button variant="link" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
