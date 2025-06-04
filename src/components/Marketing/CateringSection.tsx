import Image from 'next/image';
import Link from 'next/link';

export const CateringSection = () => {
  return (
    <section className="relative bg-[#2d3538] text-white overflow-hidden">
      {/* Background watermark logo */}
      <div className="absolute inset-0 left-[-50%] w-full opacity-[0.85] md:left-[-50%]">
        <div className="relative w-full h-full flex items-center justify-center md:block">
          <Image
            src="/images/logo/logo-watermark.png"
            alt=""
            fill
            className="object-contain opacity-50 md:opacity-[0.85]"
            style={{ transform: 'scale(0.8)' }}
            aria-hidden="true"
            priority
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 lg:py-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 md:gap-8 lg:gap-12 items-center">
          <div className="space-y-6 max-w-full md:max-w-md lg:max-w-md xl:max-w-xl text-center">
            <h2 className={`text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl`}>
              Let Us Cater Your Next Event
            </h2>
            <div className="text-lg opacity-90 space-y-2 md:space-y-1">
              <p className={`text-xl text-slate-200`} style={{ fontStyle: 'italic' }}>
                We are here to take the stress out of planning. From office lunches to celebrations,
                we will handle your catering needs{' '}
                <span className="text-amber-400 font-bold text-xl">effortlessly!</span>
              </p>
            </div>

            <div className="text-lg opacity-90 space-y-2 md:space-y-1">
              <p className={`text-xl text-slate-200`} style={{ fontStyle: 'italic' }}>
                Our customizable Latin American menus include a variety of gluten-free, vegetarian,
                and vegan options — ideal for any{' '}
                <span className="text-amber-400 font-bold text-xl">gathering!</span>
              </p>
            </div>

            <div className="mt-8 md:mt-16 flex justify-center">
              <Link
                href="/contact"
                className="inline-block px-8 py-3 bg-amber-400 text-slate-900 font-semibold rounded-full hover:bg-amber-300 transition-colors text-lg"
              >
                Contact Us
              </Link>
            </div>
          </div>

          <div className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full mt-8 md:mt-0">
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
