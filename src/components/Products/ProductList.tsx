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
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 sm:p-6">
          {products.map((product) => (
            <Link
              key={product.name}
              href={product.slug}
              className="group relative flex flex-col sm:flex-row items-center p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="relative w-full sm:w-32 h-32 mb-4 sm:mb-0 sm:mr-4">
                <Image
                  src={product.imageSrc}
                  alt={product.altText}
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-gray-900 font-quicksand group-hover:text-yellow-600 transition-colors duration-200">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="mt-1 text-sm text-gray-600">
                    {product.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
