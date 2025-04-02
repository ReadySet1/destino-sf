// src/components/Products/ProductDetails.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product, Variant } from '@/types/product';
import { Decimal } from '@prisma/client/runtime/library';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';

interface ProductDetailsProps {
  product: Product;
}

// Helper function to safely format prices
const formatPrice = (price: number | Decimal | null | undefined): string => {
  if (price === null || price === undefined) return "0.00";
  // If it's a Decimal object from Prisma
  if (typeof price === 'object' && price !== null && 'toFixed' in price) {
    return price.toFixed(2);
  }
  // If it's a regular number
  return Number(price).toFixed(2);
};

export default function ProductDetails({ product }: ProductDetailsProps) {

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();

  // Handle both Sanity and DB product structures
  const displayPrice = selectedVariant?.price || product.price;
  const mainImage = product.images?.[0] || '/placeholder-product.png';
  const productId = product.id;
  const productName = product.name;
  const isActive = product.active;
  const stock: number = 999; // Explicitly type as number


  const handleAddToCart = () => {
    const priceToAdd = typeof displayPrice === 'object' && displayPrice !== null && 'toNumber' in displayPrice 
      ? displayPrice.toNumber() 
      : Number(displayPrice);

    const cartItem = {
      id: productId,
      name: productName + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
      price: priceToAdd,
      quantity: quantity,
      image: mainImage,
      variantId: selectedVariant?.id,
    };

    addItem(cartItem);

    toast.success(`${quantity} ${productName}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart!`);
  };

  const incrementQuantity = () => {
    setQuantity((prev) => Math.min(prev + 1, 20));
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
      {/* Image Gallery */}
      <div className="w-full">
        <div className="aspect-square overflow-hidden rounded-lg border bg-gray-100">
          <Image
            src={mainImage}
            alt={productName}
            width={800}
            height={800}
            className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
            priority
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-col justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">{productName}</h1>

          {product.description && (
            <p className="text-gray-600 mb-6">{product.description}</p>
          )}

          <p className="text-2xl font-semibold mb-6">${formatPrice(displayPrice)}</p>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <label htmlFor="variant-select" className="block text-sm font-medium text-gray-700 mb-2">
                Options:
              </label>
              <select
                id="variant-select"
                className="w-full border rounded-md py-2 px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedVariant?.id || ''}
                onChange={(e) => {
                  const variant = product.variants?.find(v => v.id === e.target.value);
                  setSelectedVariant(variant || null);
                }}
              >
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} - ${formatPrice(variant.price) || formatPrice(product.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity:
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-lg font-medium w-8 text-center">{quantity}</span>
              <button
                onClick={incrementQuantity}
                disabled={quantity >= 20}
                className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md text-lg font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isActive || stock === 0}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
} 