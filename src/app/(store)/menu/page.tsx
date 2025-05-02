import React from 'react';
import MenuBanner from '@/components/Menu';
import ProductList from '@/components/Products/ProductList';
import MarketingSection from '@/components/Marketing/MarketingSection';
import FaqSection from '@/components/FAQ/MenuQuestions';

const MenuPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-gray-50">
      <MenuBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductList />
      </div>
      <MarketingSection />
      <FaqSection />
    </main>
  );
};

export default MenuPage;
