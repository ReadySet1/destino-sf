import React from 'react';
import MenuBanner from '@/components/Menu';
import ProductList from '@/components/Products/ProductList';
import MarketingSection from '@/components/Marketing/MarketingSection';
import FaqSection from '@/components/FAQ/MenuQuestions';

export const metadata = {
  title: 'Our Menu | Destino SF',
  description: 'Discover our delicious selection of traditional treats.',
};

const MenuPage = () => {
  return (
    <>
      <MenuBanner />

      <main className="relative overflow-hidden bg-gradient-to-b from-white to-amber-50/30">
        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-16 -left-16 h-[200px] w-[200px] rounded-full bg-yellow-100/40 blur-3xl" />
          <div className="absolute top-1/2 -right-20 h-[300px] w-[300px] rounded-full bg-yellow-200/30 blur-3xl" />
        </div>

        {/* Product list section with subtle shadow */}
        <section className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="rounded-xl bg-white/80 p-1 backdrop-blur-sm sm:p-2">
            <ProductList />
          </div>
        </section>

        <MarketingSection />

        {/* FAQ section with improved styling */}
        <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <FaqSection />
          </div>
        </section>
      </main>
    </>
  );
};

export default MenuPage;
