import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getProductBySlug } from '@/lib/sanity-products';
import { ProductDetail } from '@/components/store/ProductDetail';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for the page
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    };
  }
  
  return {
    title: `${product.name} | DESTINO SF`,
    description: product.description || 'DESTINO SF - Modern Latin Cuisine',
    openGraph: {
      images: product.images?.[0] ? [product.images[0]] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);
  
  if (!product) {
    return notFound();
  }
  
  return (
    <main className="bg-white py-8">
      <div className="container mx-auto px-4">
        <ProductDetail product={product} />
      </div>
    </main>
  );
}
