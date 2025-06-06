'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Dancing_Script } from 'next/font/google';

// Configuramos la fuente al igual que en el otro componente
const dancingScript = Dancing_Script({
  // <-- ¡Nueva configuración de fuente!
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

interface ProductType {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  slug: string;
}

const featuredProducts: ProductType[] = [
  {
    id: '1',
    name: 'Pride Alfajores',
    price: '$24.99',
    imageUrl: '/images/assets/2Recurso 5.png',
    slug: 'alfajores',
  },
  {
    id: '2',
    name: 'Huacatay Chicken Empanadas',
    price: '$39.99',
    imageUrl: '/images/assets/2Recurso 9.png',
    slug: 'empanadas',
  },
  {
    id: '3',
    name: 'Aji Amarillo Salsa',
    price: '$19.99',
    imageUrl: '/images/assets/2Recurso 7.png',
    slug: 'chimichurri-sauce',
  },
  {
    id: '4',
    name: 'Monthly Subscription',
    price: '$15.99',
    imageUrl: '/images/assets/2Recurso 20.png',
    slug: 'dulce-de-leche',
  },
];

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ComingSoonModal({ isOpen, onClose }: ComingSoonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-8 mx-4 max-w-md w-full shadow-2xl transform transition-all">
        <div className="text-center">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon!</h3>
            <p className="text-gray-600">
              Our Monthly Subscription service is currently in development. Stay tuned for delicious
              monthly deliveries!
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeaturedProducts() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleProductClick = (e: React.MouseEvent, productId: string) => {
    if (productId === '4') {
      // Monthly Subscription
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const ProductCard = ({ product, className }: { product: ProductType; className?: string }) => {
    const isSubscription = product.id === '4';

    if (isSubscription) {
      return (
        <button
          onClick={e => handleProductClick(e, product.id)}
          className={`${className} text-left w-full`}
        >
          <div
            className="relative rounded-3xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg"
            style={{ paddingBottom: '75%' }}
          >
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105 absolute inset-0 rounded-3xl"
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 85vw" // Keep this for larger screens
              priority
            />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
            <p className="font-medium text-amber-600">{product.price}</p>
          </div>
        </button>
      );
    }

    return (
      <Link
        href={
          product.id === '3' ? '/products/chimichurri-sauce' : `/products/category/${product.slug}`
        }
        className={className}
      >
        <div
          className="relative rounded-3xl overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-lg"
          style={{ paddingBottom: '75%' }}
        >
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105 absolute inset-0 rounded-3xl"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 85vw" // Keep this for larger screens
            priority
          />
        </div>
        <div className="mt-4">
          <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
          <p className="font-medium text-amber-600">{product.price}</p>
        </div>
      </Link>
    );
  };

  return (
    <>
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            className={`text-center text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl mb-6 md:mb-12`}
          >
            Spotlight Picks
          </h2>

          {/* Texto "Explore our current favorites..." con la nueva tipografía y tamaño - CENTERED */}
          <p
            className="mx-auto mt-3 text-xl text-slate-700 sm:mt-4 mb-10 max-w-3xl px-2 sm:px-0 text-center"
            style={{ fontStyle: 'italic' }}
          >
            Explore our current favorites — seasonal treats, new flavors, and limited-run specials!
            <br />
            Inspired by tradition. Driven by creativity.
          </p>

          <div className="mx-auto max-w-7xl overflow-hidden">
            <div className="md:flex md:justify-center">
              {/* Mobile Vertical Stack (formerly Carousel) */}
              {/* Hidden for md and larger, visible for smaller screens */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10 px-4">
                {' '}
                {/* Changed to grid for vertical stacking */}
                {featuredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    className="block w-full transition-transform duration-300 hover:scale-[1.02]" // w-full for stacking
                  />
                ))}
              </div>

              {/* Desktop/Tablet Grid (This remains the same) */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {featuredProducts.map(product => (
                  <ProductCard key={product.id} product={product} className="group" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-block rounded-md bg-amber-500 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              View All Products
            </Link>
          </div>
        </div>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
