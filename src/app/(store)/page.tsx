import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getFeaturedProducts } from '@/lib/sanity-products';
import { ProductGrid } from '@/components/Store/ProductGrid';

export const revalidate = 3600; // Revalidate every hour

export default async function HomePage() {
  // Fetch featured products for homepage
  const featuredProducts = await getFeaturedProducts();
  
  return (
    <main>
      {/* Hero Section */}
      <section className="relative bg-black text-white">
        <div className="absolute inset-0 opacity-60">
          <Image
            src="/images/hero-bg.jpg" 
            alt="Destino Foods"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="container relative mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-2xl">
            <h1 className="mb-4 text-4xl font-bold sm:text-5xl md:text-6xl">
              DESTINO SF
            </h1>
            <p className="mb-6 text-xl font-light sm:text-2xl">
              Modern Latin Cuisine with a contemporary twist!
            </p>
            <p className="mb-8 text-lg">
              We offer a wide variety of services to fulfill your culinary cravings!
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/menu">
                <Button size="lg" className="bg-yellow-500 text-black hover:bg-yellow-400">
                  View Menu
                </Button>
              </Link>
              <Link href="/catering">
                <Button size="lg" variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10">
                  Catering Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Products Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-3xl font-bold">Our Specialties</h2>
          <Suspense fallback={<div className="text-center">Loading products...</div>}>
            {featuredProducts.length > 0 ? (
              <ProductGrid products={featuredProducts} />
            ) : (
              <p className="text-center text-gray-500">
                Featured products coming soon...
              </p>
            )}
          </Suspense>
          <div className="mt-12 text-center">
            <Link href="/menu">
              <Button variant="outline" size="lg">
                View Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="mb-4 text-3xl font-bold">About DESTINO</h2>
              <p className="mb-4">
                At DESTINO SF, we focus on modern Latin cuisine with a contemporary twist. 
                Our passion is creating authentic flavors that honor traditional recipes 
                while adding our unique perspective.
              </p>
              <p>
                We are proud to continue offering our savory and sweet specialties for your
                enjoyment. From our famous empanadas to our delicious alfajores, every
                item is crafted with care and the finest ingredients.
              </p>
              <div className="mt-6">
                <Link href="/about">
                  <Button variant="link" className="text-yellow-600 hover:text-yellow-700">
                    Learn More About Us →
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/images/about-image.jpg"
                alt="Our Kitchen"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Newsletter Section */}
      <section className="bg-yellow-500 py-16 text-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Stay in the Loop</h2>
          <p className="mb-8 text-lg">
            Get the latest updates, special offers, and event notifications.
          </p>
          <form className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 rounded-md border-0 px-4 py-2 text-black shadow-sm focus:ring-2 focus:ring-black"
              required
            />
            <Button type="submit" className="bg-black text-white hover:bg-gray-800">
              Sign Up
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
