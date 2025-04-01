import React from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/Store/ProductCard';
import { prisma } from '@/lib/prisma';

interface ProductPageProps {
  params: Promise<{ product: string }> | { product: string };
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { product } = await params;
  const productName = product.charAt(0).toUpperCase() + product.slice(1);

  // Fetch products for this category
  const products = await prisma.product.findMany({
    where: {
      category: {
        name: {
          equals: productName,
          mode: 'insensitive'
        }
      },
      active: true
    },
    include: {
      category: true,
      variants: true
    }
  });

  // Transform products to match ProductCard interface
  const transformedProducts = products.map(product => ({
    _id: product.id,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    images: product.imageUrl ? [product.imageUrl] : [], // Assuming imageUrl is a field in your Product model
    slug: { current: product.slug || product.id.toString() } // Fallback to id if slug doesn't exist
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Discover Our {productName}</h1>
      <p className="mb-6 text-lg">
        Welcome to the home of our delicious {productName}. Explore our selection and place your order online today!
      </p>
      
      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {transformedProducts.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
          />
        ))}
      </div>

      {transformedProducts.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No products available in this category at the moment.
        </p>
      )}

      <div className="flex space-x-4 mt-8">
        <Link href={`/${product}/product-selection`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          View All {productName}
        </Link>
        <Link href={`/${product}/order-online`} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Order Online
        </Link>
      </div>
    </div>
  );
};

export default ProductPage; 