import Image from 'next/image';
import Link from 'next/link';
import { FC } from 'react';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ['latin'] });

interface CateringSectionProps {
  className?: string;
}

export const CateringSection: FC<CateringSectionProps> = ({ className = '' }) => {
  return (
    <section
      className={`relative bg-[#2d3538] text-white overflow-hidden ${className}`}
      aria-labelledby="catering-heading"
    >
      {/* Background watermark logo */}
      <div
        className="absolute inset-0 left-[-50%] w-full opacity-[0.85] md:left-[-50%]"
        aria-hidden="true"
      >
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
          {/* Content container, centered */}
          <div className="space-y-6 max-w-full md:max-w-md lg:max-w-md xl:max-w-xl text-center">
            <h2
              id="catering-heading"
              className={`text-4xl font-bold tracking-tight text-white sm:text-5xl ${dancingScript.className}`}
            >
              Let Us Cater Your Next Event
            </h2>

            {/* First paragraph with 'effortlessly!' at the end */}
            <p className="text-lg md:text-xl text-slate-200 italic opacity-90 leading-relaxed">
              We are here to take the stress out of planning. From office lunches to celebrations,
              we will handle your catering needs{' '}
              <span style={{ whiteSpace: 'nowrap' }}>effortlessly!</span>
            </p>

            {/* Second paragraph with 'gathering!' at the end */}
            <p className="text-lg md:text-xl text-slate-200 italic opacity-90 leading-relaxed">
              Our customizable Latin American menus include a variety of gluten-free, vegetarian,
              and vegan options — ideal for any{' '}
              <span style={{ whiteSpace: 'nowrap' }}>gathering!</span>
            </p>

            {/* Centered button */}
            <div className="mt-8 md:mt-16 flex justify-center">
              <Link
                href="/contact"
                className="inline-block px-8 py-3 bg-amber-400 text-slate-900 font-semibold rounded-full hover:bg-amber-300 transition-colors text-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#2d3538]"
                aria-label="Contact us for catering services"
              >
                Contact Us
              </Link>
            </div>
          </div>

          {/* Image container */}
          <div className="relative h-[300px] md:h-[450px] lg:h-[600px] w-full mt-8 md:mt-0">
            <Image
              src="/images/homepage/section-catering.png"
              alt="Showcase of our catering options including shrimp appetizer, empanadas, and signature cocktail"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
