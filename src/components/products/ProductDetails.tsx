// src/components/Products/ProductDetails.tsx

"use client";

import { useState } from "react";
import Image from "next/image";
import { Product, Variant } from "@/types/product";
import { Decimal } from "@prisma/client/runtime/library";
import { useCartStore } from "@/store/cart";
import { useCartAlertStore } from "@/components/ui/cart-alert";

interface ProductDetailsProps {
  product: Product;
}

// Helper function to safely format prices
const formatPrice = (price: number | Decimal | null | undefined): string => {
  if (price === null || price === undefined) return "0.00";
  // If it's a Decimal object from Prisma
  if (typeof price === "object" && price !== null && "toFixed" in price) {
    return price.toFixed(2);
  }
  // If it's a regular number
  return Number(price).toFixed(2);
};

export default function ProductDetails({ product }: ProductDetailsProps) {
  // Check if product has valid variants and more than one
  const hasMultipleVariants = product?.variants && 
                           Array.isArray(product.variants) && 
                           product.variants.filter(v => v && v.id).length > 1;
                           
  // Call hooks unconditionally at the top level
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product?.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();

  // Ensure product exists before rendering the rest
  if (!product) {
    return <div>Loading product...</div>;
  }

  // Handle both Sanity and DB product structures
  const displayPrice = selectedVariant?.price || product.price;
  const mainImage = product.images?.[0] || "/images/menu/empanadas.png";
  const productId = product.id;
  const productName = product.name;
  const isActive = product.active;
  const stock: number = 999; // Explicitly type as number

  const handleAddToCart = () => {
    console.log('Adding to cart:', { productName, quantity, selectedVariant });
    const priceToAdd =
      typeof displayPrice === "object" &&
      displayPrice !== null &&
      "toNumber" in displayPrice
        ? displayPrice.toNumber()
        : Number(displayPrice);

    const cartItem = {
      id: productId,
      name: productName + (selectedVariant ? ` - ${selectedVariant.name}` : ""),
      price: priceToAdd,
      quantity: quantity,
      image: mainImage,
      variantId: selectedVariant?.id,
    };

    addItem(cartItem);
    console.log('Showing alert for:', cartItem);
    showAlert(`${quantity} ${productName}${selectedVariant ? ` (${selectedVariant.name})` : ""} has been added to your cart.`);
  };

  const incrementQuantity = () => {
    setQuantity((prev) => Math.min(prev + 1, 20));
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="relative mb-0">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="w-full">
          <div className="aspect-square overflow-hidden rounded-3xl bg-white/10">
            <Image
              src={mainImage}
              alt={productName}
              width={800}
              height={800}
              className="h-full w-full object-cover object-center"
              priority
            />
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-yellow-400">★</span>
            <span className="text-white font-medium">4.5</span>
            <span className="text-white/80">(30)</span>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-between text-white">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold">{productName}</h1>
          </div>
        </div>
      </div>

      {/* Product Details in White Background */}
      <div className="mt-8 bg-[hsl(var(--header-orange))] rounded-3xl p-2 mb-0">
        <div className="bg-white rounded-2xl p-6">
          {product.description && (
            <p className="text-gray-600 mb-8 text-lg">{product.description}</p>
          )}

          <p className="text-3xl font-semibold mb-8 text-gray-900">
            ${formatPrice(displayPrice)}
          </p>

          {/* Variant Selector - Only shown if multiple variants exist */}
          {hasMultipleVariants && (
            <div className="mb-8">
              <label
                htmlFor="variant-select"
                className="block text-lg font-medium text-gray-900 mb-2"
              >
                Options:
              </label>
              <select
                id="variant-select"
                className="w-full border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={selectedVariant?.id || ""}
                onChange={(e) => {
                  const variant = product.variants?.find(
                    (v) => v.id === e.target.value
                  );
                  setSelectedVariant(variant || null);
                }}
              >
                {product.variants?.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} - ${formatPrice(variant.price) || formatPrice(product.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity and Add to Cart Row */}
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0">
              <label className="block text-base text-gray-900 mb-2">
                Quantity:
              </label>
              <div className="flex items-center">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                >
                  -
                </button>
                <span className="text-base font-medium w-8 text-center text-gray-900">
                  {quantity}
                </span>
                <button
                  onClick={incrementQuantity}
                  disabled={quantity >= 20}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="h-10 px-6 bg-[#F7B614] text-white rounded-full text-sm font-semibold hover:bg-[#E5A912] transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isActive || stock === 0}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
