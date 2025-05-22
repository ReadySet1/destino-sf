// components/ProductList.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Product {
  name: string;
  imageSrc: string;
  altText: string;
  description: string;
  slug: string;
}

const products: Product[] = [
  {
    name: 'Our Alfajores',
    imageSrc: '/images/menu/alfajores.png',
    altText: 'Alfajores',
    description: 'Our famous butter cookies filled with dulce de leche.',
    slug: '/products/category/alfajores',
  },
  {
    name: 'Our Empanadas',
    imageSrc: '/images/menu/empanadas.png',
    altText: 'Empanadas',
    description: 'Handcrafted savory pastries with a variety of flavorful fillings.',
    slug: '/products/category/empanadas',
  },
  {
    name: 'Catering',
    imageSrc: '/images/menu/catering.png',
    altText: 'Catering',
    description:
      'Custom catering services for private events, corporate gatherings & celebrations.',
    slug: '/catering',
  },
];

const ProductList: React.FC = () => {
  return (
    <section className="w-full py-8 md:py-12 lg:py-16">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-quicksand text-3xl font-bold text-amber-900 text-center mb-12 sm:text-4xl">
          Explore Our Offerings Below:
          <div className="mt-2 h-1 w-16 bg-yellow-400 mx-auto" />
        </h2>

        <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-3">
          {products.map(product => (
            <Link
              key={product.name}
              href={product.slug}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={product.imageSrc}
                  alt={product.altText}
                  fill
                  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-quicksand text-xl font-bold text-amber-900 group-hover:text-yellow-600 md:text-2xl">
                  {product.name}
                </h3>

                <p className="mt-2 flex-1 text-amber-900/70 md:mt-3">{product.description}</p>

                <div className="mt-6 flex items-center justify-end">
                  <span className="flex items-center text-sm font-medium text-yellow-600 transition-all duration-300 group-hover:translate-x-1">
                    View details <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductList;
