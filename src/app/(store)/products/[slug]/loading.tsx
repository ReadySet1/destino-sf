// src/app/(store)/products/[slug]/loading.tsx

import FoodLoader from '@/components/ui/FoodLoader';
import CategoryHeader from '@/components/products/CategoryHeader';

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-destino-orange">
      <CategoryHeader title="Details" type="default" className="bg-destino-charcoal" />
      <div className="py-8 mb-0">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <FoodLoader text="Preparing product details..." size="large" />
          </div>
        </div>
      </div>
    </div>
  );
}
