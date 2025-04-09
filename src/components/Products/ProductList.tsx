// components/ProductList.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

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
    description: 'Traditional Argentine cookies filled with dulce de leche',
    slug: '/products/category/alfajores',
  },
  {
    name: 'Our Empanadas',
    imageSrc: '/images/menu/empanadas.png',
    altText: 'Empanadas',
    description: 'Handcrafted savory pastries with various fillings',
    slug: '/products/category/empanadas',
  },
  {
    name: 'Catering',
    imageSrc: '/images/menu/catering.png',
    altText: 'Catering',
    description: 'Custom catering services for your special events',
    slug: '/catering',
  },
];

const ProductList: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-3 lg:gap-8 lg:p-12">
        {products.map((product) => (
          <Link
            key={product.name}
            href={product.slug}
            className="group relative flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 sm:flex-row lg:flex-col lg:p-6 lg:hover:bg-white lg:hover:shadow-lg lg:border lg:border-gray-100 overflow-hidden"
          >
            <div className="relative w-full h-32 mb-4 overflow-hidden rounded-lg sm:w-32 sm:h-32 sm:mb-0 sm:mr-4 lg:w-full lg:h-80 lg:mb-6 lg:mr-0">
              <Image
                src={product.imageSrc}
                alt={product.altText}
                fill
                className="object-cover lg:group-hover:scale-110 lg:transition-transform lg:duration-500 ease-in-out"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="flex-1 text-center sm:text-left lg:text-center lg:w-full">
              <h3 className="text-lg font-bold text-gray-900 font-quicksand group-hover:text-yellow-600 transition-colors duration-200 lg:text-2xl lg:mb-3">
                {product.name}
              </h3>
              {product.description && (
                <p className="mt-1 text-sm text-gray-600 lg:text-base lg:leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
