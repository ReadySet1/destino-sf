'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { CartItemList } from '@/components/store/CartItemList';
import { CartSummary } from '@/components/store/CartSummary';
import { EmptyCart } from '@/components/store/EmptyCart';
import { useCateringCartStore } from '@/store/catering-cart';
import { useState } from 'react';

export default function CartPage() {
  const { items, totalPrice, totalItems, removeItem, updateQuantity, clearCart } = useCartStore();
  const cateringCart = useCateringCartStore();
  const [activeTab, setActiveTab] = useState<'regular' | 'catering'>('regular');

  // Determine which cart to display based on the active tab
  const cartToShow = activeTab === 'regular' ? items : cateringCart.items;
  const currentTotalPrice = activeTab === 'regular' ? totalPrice : cateringCart.totalPrice;
  const currentTotalItems = activeTab === 'regular' ? totalItems : cateringCart.totalItems;
  const currentRemoveItem = activeTab === 'regular' ? removeItem : cateringCart.removeItem;
  const currentUpdateQuantity =
    activeTab === 'regular' ? updateQuantity : cateringCart.updateQuantity;
  const currentClearCart = activeTab === 'regular' ? clearCart : cateringCart.clearCart;

  // Check if either cart has items
  const hasRegularItems = items.length > 0;
  const hasCateringItems = cateringCart.items.length > 0;
  const hasAnyItems = hasRegularItems || hasCateringItems;

  if (!hasAnyItems) {
    return <EmptyCart />;
  }

  return (
    <main className="container mx-auto px-4 py-4 sm:py-8 pb-24 sm:pb-8">
      <h1 className="mb-4 sm:mb-8 text-xl sm:text-3xl font-bold">Your Cart</h1>

      {/* Cart Type Tabs */}
      <div className="flex mb-4 border-b">
        <button
          onClick={() => setActiveTab('regular')}
          className={`py-2 px-4 font-medium ${
            activeTab === 'regular'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Regular Items {hasRegularItems && `(${items.length})`}
        </button>
        <button
          onClick={() => setActiveTab('catering')}
          className={`py-2 px-4 font-medium ${
            activeTab === 'catering'
              ? 'border-b-2 border-amber-500 text-amber-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Catering Items {hasCateringItems && `(${cateringCart.items.length})`}
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:gap-8 lg:grid lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white shadow-sm">
            {cartToShow.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Your {activeTab} cart is empty.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setActiveTab(activeTab === 'regular' ? 'catering' : 'regular')}
                >
                  Switch to {activeTab === 'regular' ? 'catering' : 'regular'} cart
                </Button>
              </div>
            ) : (
              <>
                <CartItemList
                  items={cartToShow}
                  onRemove={currentRemoveItem}
                  onUpdateQuantity={currentUpdateQuantity}
                />
                <div className="p-4">
                  <Button variant="outline" className="w-full" onClick={currentClearCart}>
                    Clear {activeTab === 'catering' ? 'Catering' : 'Regular'} Cart
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:static fixed bottom-0 left-0 right-0 bg-white border-t lg:border-t-0 p-4 lg:p-0 shadow-md lg:shadow-none z-10">
          <CartSummary
            subtotal={currentTotalPrice}
            totalItems={currentTotalItems}
            cartType={activeTab}
          />

          <div className="mt-4 space-y-2 flex flex-col sm:space-y-4">
            <Link
              href={activeTab === 'catering' ? '/catering/checkout' : '/checkout'}
              className="block"
            >
              <Button
                className={`w-full ${activeTab === 'catering' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                disabled={cartToShow.length === 0}
              >
                Proceed to {activeTab === 'catering' ? 'Catering' : ''} Checkout
              </Button>
            </Link>

            <Link href={activeTab === 'catering' ? '/catering' : '/menu'} className="block">
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
