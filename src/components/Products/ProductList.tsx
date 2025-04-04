// components/ProductList.tsx
import React from "react";
import Image from "next/image";

interface Product {
  name: string;
  imageSrc: string;
  altText: string;
}

const products: Product[] = [
  {
    name: "Our Alfajores",
    imageSrc: "/images/menu/alfajores.png",
    altText: "Alfajores",
  },
  {
    name: "Our Empanadas",
    imageSrc: "/images/menu/empanadas.png",
    altText: "Empanadas",
  },
  {
    name: "Catering",
    imageSrc: "/images/menu/catering.png",
    altText: "Catering",
  },
];

const ProductList: React.FC = () => {
  return (
    <div className="bg-white py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-y-8">
          {products.map((product) => (
            <div
              key={product.name}
              className="group relative flex items-center space-x-4"
            >
              <div className="relative w-24 h-24">
                <Image
                  src={product.imageSrc}
                  alt={product.altText}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 font-quicksand">
                  <a href="#">
                    <span aria-hidden="true" className="absolute inset-0" />
                    {product.name}
                  </a>
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
