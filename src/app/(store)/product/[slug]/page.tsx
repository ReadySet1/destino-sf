import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getProductBySlug } from '@/lib/sanity-products';
import { ProductDetail, type Product } from '@/components/store/ProductDetail';
import { type JSX } from 'react'; // Import JSX type

// Define the shape of the *resolved* params
type ResolvedParams = {
  slug: string;
};

// Define the component's props, expecting params as a Promise
interface ProductPageProps {
  params: Promise<ResolvedParams>; // <-- Changed: Expect a Promise
  // searchParams?: Promise<{ [key: string]: string | string[] | undefined }>; // Add if needed
}

// Generate metadata for the page
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  // Await the params promise
  const resolvedParams = await params; // <-- Added await

  // Use the resolved slug
  const product = await getProductBySlug(resolvedParams.slug); // <-- Use resolvedParams.slug

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

// Default export - the Page component
export default async function ProductPage({ params }: ProductPageProps): Promise<JSX.Element> { // <-- Added explicit return type
  // Await the params promise
  const resolvedParams = await params; // <-- Added await

  // Use the resolved slug
  const product = await getProductBySlug(resolvedParams.slug); // <-- Use resolvedParams.slug

  if (!product) {
    // Consider logging the slug that wasn't found
    console.warn(`Product with slug "${resolvedParams.slug}" not found.`);
    return notFound();
  }

  // Ensure product has the correct category shape
  if (!product.category || typeof product.category === 'string') {
    console.warn(`Product "${product.name}" has invalid category data.`);
    return notFound();
  }

  return (
    <main className="bg-white py-8">
      <div className="container mx-auto px-4">
        <ProductDetail product={product as Product} />
      </div>
    </main>
  );
}