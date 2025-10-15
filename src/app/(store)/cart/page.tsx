'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { CartItemList } from '@/components/store/CartItemList';
import { CartSummary } from '@/components/store/CartSummary';
import { EmptyCart } from '@/components/store/EmptyCart';
import { useCateringCartStore } from '@/store/catering-cart';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function CartPage() {
  const { items, totalPrice, totalItems, removeItem, updateQuantity, clearCart } = useCartStore();
  const cateringCart = useCateringCartStore();
  const [activeTab, setActiveTab] = useState<'regular' | 'catering'>('regular');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

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

  const handleCheckoutClick = () => {
    setIsCheckoutLoading(true);
    // The navigation will happen naturally via the Link component
    // Reset loading state after a short delay (in case user comes back)
    setTimeout(() => setIsCheckoutLoading(false), 2000);
  };

  if (!hasAnyItems) {
    return <EmptyCart />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-destino-cream via-white to-gray-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 px-4 py-4 sm:py-6 shadow-sm">
        <div className="container mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-destino-charcoal">Your Cart</h1>
          <p className="text-gray-600 mt-1">Review your items and proceed to checkout</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Cart Type Tabs - Improved Mobile Design */}
        <div className="mb-6">
          <div className="flex bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('regular')}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'regular'
                  ? 'bg-gradient-to-r from-destino-yellow to-yellow-400 text-destino-charcoal shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:text-destino-charcoal hover:bg-gray-50'
              }`}
            >
              Regular Items {hasRegularItems && `(${items.length})`}
            </button>
            <button
              onClick={() => setActiveTab('catering')}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'catering'
                  ? 'bg-gradient-to-r from-destino-orange to-amber-600 text-white shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:text-destino-charcoal hover:bg-gray-50'
              }`}
            >
              Catering Items {hasCateringItems && `(${cateringCart.items.length})`}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-8 lg:grid lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border-0 sm:border bg-white/95 backdrop-blur-sm shadow-lg sm:shadow-xl border-gray-200/50">
              {cartToShow.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-destino-yellow to-destino-orange rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <p className="text-destino-charcoal text-lg mb-2 font-semibold">
                    Your {activeTab} cart is empty
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Add some delicious items to get started!
                  </p>
                  <Button
                    variant="link"
                    className="text-destino-orange hover:text-destino-charcoal font-medium transition-colors hover:no-underline"
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
                  <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-destino-cream/30 rounded-b-xl">
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:shadow-md transition-all duration-200"
                      onClick={currentClearCart}
                    >
                      Clear {activeTab === 'catering' ? 'Catering' : 'Regular'} Cart
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg lg:shadow-xl p-4 lg:p-6">
            <CartSummary
              subtotal={currentTotalPrice}
              totalItems={currentTotalItems}
              cartType={activeTab}
            />

            <div className="mt-4 space-y-3">
              <Link
                href={activeTab === 'catering' ? '/catering/checkout' : '/checkout'}
                className="block"
                onClick={handleCheckoutClick}
              >
                <Button
                  size="lg"
                  className={`w-full py-4 text-base font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 ${
                    activeTab === 'catering'
                      ? 'bg-gradient-to-r from-destino-orange to-amber-600 hover:from-amber-600 hover:to-destino-orange text-white shadow-lg hover:shadow-xl'
                      : 'bg-gradient-to-r from-destino-yellow to-yellow-400 hover:from-yellow-400 hover:to-destino-yellow text-destino-charcoal shadow-lg hover:shadow-xl'
                  }`}
                  disabled={cartToShow.length === 0 || isCheckoutLoading}
                >
                  {isCheckoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Proceed to ${activeTab === 'catering' ? 'Catering ' : ''}Checkout`
                  )}
                </Button>
              </Link>

              <Link href={activeTab === 'catering' ? '/catering' : '/menu'} className="block">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full py-3 text-base text-destino-charcoal hover:text-destino-charcoal hover:bg-destino-cream/50 rounded-xl transition-all duration-200 border border-transparent hover:border-destino-yellow/30"
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
