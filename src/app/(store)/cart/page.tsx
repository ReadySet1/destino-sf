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
    <main className="min-h-screen bg-gray-50 sm:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:py-6">
        <div className="container mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Cart</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8 pb-32 sm:pb-8">
        {/* Cart Type Tabs - Improved Mobile Design */}
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('regular')}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'regular'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Regular Items {hasRegularItems && `(${items.length})`}
            </button>
            <button
              onClick={() => setActiveTab('catering')}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'catering'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Catering Items {hasCateringItems && `(${cateringCart.items.length})`}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-8 lg:grid lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border-0 sm:border bg-white shadow-sm">
              {cartToShow.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <p className="text-gray-600 text-lg mb-2">Your {activeTab} cart is empty</p>
                  <p className="text-gray-500 text-sm mb-4">Add some delicious items to get started!</p>
                  <Button
                    variant="link"
                    className="text-blue-600 font-medium"
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
                  <div className="p-4 border-t bg-gray-50 sm:bg-white rounded-b-xl">
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" 
                      onClick={currentClearCart}
                    >
                      Clear {activeTab === 'catering' ? 'Catering' : 'Regular'} Cart
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Order Summary - Improved Mobile */}
          <div className="lg:static fixed bottom-0 left-0 right-0 bg-white lg:bg-transparent border-t lg:border-t-0 p-4 lg:p-0 shadow-lg lg:shadow-none z-10">
          <CartSummary
            subtotal={currentTotalPrice}
            totalItems={currentTotalItems}
            cartType={activeTab}
          />

            <div className="mt-4 space-y-3">
              <Link
                href={activeTab === 'catering' ? '/catering/checkout' : '/checkout'}
                className="block"
              >
                <Button
                  size="lg"
                  className={`w-full py-4 text-base font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === 'catering' 
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-lg hover:shadow-xl' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                  }`}
                  disabled={cartToShow.length === 0}
                >
                  Proceed to {activeTab === 'catering' ? 'Catering ' : ''}Checkout
                </Button>
              </Link>

              <Link href={activeTab === 'catering' ? '/catering' : '/menu'} className="block">
                <Button 
                  variant="ghost" 
                  size="lg"
                  className="w-full py-3 text-base text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-xl"
                >
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
