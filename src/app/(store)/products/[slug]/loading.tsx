// src/app/(store)/products/[slug]/loading.tsx

import FoodLoader from "@/components/ui/FoodLoader";
import CategoryHeader from "@/components/Products/CategoryHeader";

export default function ProductLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <CategoryHeader 
        title="Details"
        type="products"
      >
        <div className="py-8">
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
            <div className="my-20">
              <FoodLoader text="Gathering fresh ingredients..." size="large"/>
            </div>
          </div>
        </div>
      </CategoryHeader>
    </div>
  );
} 