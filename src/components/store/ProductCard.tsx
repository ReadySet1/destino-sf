'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  slug: { current: string };
  rating?: number;
  reviewCount?: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0] || '',
    });

    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <Link href={`/products/${product.slug.current}`} className="flex flex-row items-stretch">
        {/* Image Container */}
        <div className="w-[120px] h-[120px] relative overflow-hidden rounded-2xl m-2">
          {product.images && product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="120px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
        
        {/* Content Container */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{product.name}</h3>
            {product.description && (
              <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-sm font-medium text-gray-900">
                {product.rating || 4.5}
              </span>
              <span className="text-sm text-gray-500">
                ({product.reviewCount || 30})
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            <Button
              onClick={e => {
                e.preventDefault();
                handleAddToCart();
              }}
              className="bg-[#F7B614] hover:bg-[#E5A912] text-white font-medium px-6 py-2 rounded-full"
              variant="ghost"
            >
              +Add
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
}
