import Image from 'next/image';
import Link from 'next/link';

export const CateringSection = () => {
  return (
    <section className="relative bg-[#2d3538] text-white overflow-hidden">
      {/* Background watermark logo */}
      <div className="absolute inset-0 left-[-50%] w-full opacity-[0.85]">
        <div className="relative w-full h-full">
          <Image
            src="/images/logo/logo-watermark.png"
            alt=""
            fill
            className="object-contain"
            style={{ transform: 'scale(0.8)' }}
            aria-hidden="true"
            priority
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 max-w-xl">
            <h2 className="text-4xl md:text-5xl font-bold">
              Let Us Carter
              <br />
              Your Next Event
            </h2>

            <p className="text-lg opacity-90">
              We are here to take the stress out of planning — from office lunches to celebrations,
              we will handle your catering needs effortlessly
            </p>

            <p className="text-lg opacity-90">
              Our customizable Latin American menus include plenty of gluten-free, vegetarian, and
              vegan options — ideal for any gathering.
            </p>

            <Link
              href="/contact"
              className="inline-block px-8 py-3 bg-amber-400 text-slate-900 font-semibold rounded-full hover:bg-amber-300 transition-colors"
            >
              Contact Us
            </Link>
          </div>

          <div className="relative h-[600px] w-full">
            <Image
              src="/images/homepage/section-catering.png"
              alt="Showcase of our catering options including shrimp appetizer, empanadas, and signature cocktail"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
};
