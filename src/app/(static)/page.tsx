// src/app/page.tsx

import Hero from '@/components/Landing';
import { CustomerTestimonials } from '@/components/Marketing/CustomerTestimonials';
import { FeaturedProducts } from '@/components/Marketing/FeaturedProducts';
import { PromotionBanner } from '@/components/Marketing/PromotionBanner';
import { ShopByCategory } from '@/components/Marketing/ShopByCategory';
import { CateringSection } from '@/components/Marketing/CateringSection';
import GoogleMaps from '@/components/Maps/GoogleMaps';

export default async function Home() {
  return (
    <main>
      <Hero />
      <ShopByCategory />
      <FeaturedProducts />

      <CateringSection />
      <PromotionBanner />
      {/* <section>
        <About variant="large" />
      </section> */}
      <CustomerTestimonials />
      {/* Links to main sections based on site map */}
      {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"> */}
      {/* <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-6 sm:mb-8">Explore Our Offerings</h2> */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"> */}
      {/* Commented code remains unchanged */}
      {/* </div> */}
      {/* </div> */}
      {/* Original comment about adding more sections can be kept or removed */}
      {/* <Add more sections here as needed /> */}
      {/* <GoogleMaps apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} /> */}
    </main>
  );
}
