'use client';

import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

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
    name: 'Seasonal Alfajores',
    price: '$24.99',
    imageUrl: '/images/assets/2Recurso 5.png',
    slug: 'alfajores',
  },
  {
    id: '2',
    name: 'Limited-Edition Empanadas',
    price: '$39.99',
    imageUrl: '/images/assets/2Recurso 9.png',
    slug: 'empanadas',
  },
  {
    id: '3',
    name: 'Sauces & Salsas',
    price: '$19.99',
    imageUrl: '/images/assets/2Recurso 7.png',
    slug: 'chimichurri-sauce',
  },
  {
    id: '4',
    name: 'Montlhy Subscription',
    price: '$15.99',
    imageUrl: '/images/assets/2Recurso 20.png',
    slug: 'dulce-de-leche',
  },
];

export function FeaturedProducts() {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className={`mb-6 text-center text-4xl font-bold text-gray-900 md:mb-12 md:text-5xl`}>
          Spotlight Picks
        </h2>

        <p className="text-center text-gray-600 mb-10 max-w-3xl mx-auto">
          Explore our current favorites — seasonal treats, new flavors, and limited-run specials!
          <br />
          Inspired by tradition. Driven by creativity.
        </p>

        <div className="mx-auto max-w-7xl overflow-hidden">
          <div className="md:flex md:justify-center">
            {/* Mobile Carousel */}
            <div className="md:hidden overflow-hidden" ref={emblaRef}>
              <div className="flex gap-4">
                {featuredProducts.map(product => (
                  <Link
                    key={product.id}
                    href={
                      product.id === '3'
                        ? '/products/chimichurri-sauce'
                        : `/products/category/${product.slug}`
                    }
                    className="block min-w-[85%] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]"
                  >
                    <div
                      className="relative w-full rounded-3xl overflow-hidden"
                      style={{ paddingBottom: '75%' }}
                    >
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover absolute inset-0 rounded-3xl"
                        sizes="(max-width: 480px) 85vw, (max-width: 768px) 40vw, 33vw"
                        priority
                      />
                    </div>
                    <div className="mt-4 px-2">
                      <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                      <p className="font-medium text-amber-600">{product.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop/Tablet Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map(product => (
                <Link
                  key={product.id}
                  href={
                    product.id === '3'
                      ? '/products/chimichurri-sauce'
                      : `/products/category/${product.slug}`
                  }
                  className="group"
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
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 85vw"
                      priority
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                    <p className="font-medium text-amber-600">{product.price}</p>
                  </div>
                </Link>
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
  );
}
