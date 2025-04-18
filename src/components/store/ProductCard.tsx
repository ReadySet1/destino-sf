'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  
  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image: product.images?.[0] || '',
    });

    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 h-full">
      <Link 
        href={`/products/${product.slug}`} 
        className="flex flex-row md:flex-col h-full"
      >
        {/* Image Container - left side on mobile, top on desktop */}
        <div className="w-[120px] h-[120px] md:w-full md:h-auto relative overflow-hidden rounded-xl m-2 md:mb-4 md:aspect-square md:m-4 md:mt-4 flex-shrink-0">
          {product.images && product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              sizes="(min-width: 768px) 33vw, 120px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          {/* Sale badge - only visible on desktop */}
          {product.featured && (
            <div className="absolute top-2 left-2 hidden md:block bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
              Featured
            </div>
          )}
        </div>
        
        {/* Content Container */}
        <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate md:mb-2 group-hover:text-indigo-600 transition-colors">
              {product.name}
            </h3>
            
            {product.description && (
              <p className="text-gray-600 text-sm line-clamp-2 md:mb-2">{product.description}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2 md:mt-auto md:pt-4 md:border-t md:border-gray-100">
            <span className="text-lg font-bold text-gray-900">
              ${Number(product.price).toFixed(2)}
            </span>
            <Button
              onClick={e => {
                e.preventDefault();
                handleAddToCart();
              }}
              className="bg-[#F7B614] hover:bg-[#E5A912] text-white font-medium px-3 py-1 md:px-6 md:py-2 rounded-full transition-colors duration-300"
              variant="ghost"
            >
              <span className="md:hidden">+Add</span>
              <span className="hidden md:inline">Add to Cart</span>
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
}
