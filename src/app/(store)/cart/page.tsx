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
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Your Cart</h1>
      
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white shadow-sm">
            <CartItemList 
              items={items} 
              onRemove={removeItem} 
              onUpdateQuantity={updateQuantity}
            />
            
            <div className="p-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div>
          <CartSummary 
            subtotal={totalPrice} 
            totalItems={totalItems} 
          />
          
          <div className="mt-4">
            <Link href="/checkout">
              <Button className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
            
            <div className="mt-4">
              <Link href="/menu">
                <Button variant="link" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
