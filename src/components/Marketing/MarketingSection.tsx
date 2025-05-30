import React from 'react';
import { Heart, Leaf, PartyPopper } from 'lucide-react';
import Link from 'next/link';

interface MarketingFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: MarketingFeature[] = [
  {
    title: ' Rooted in Tradition',
    description:
      'Every recipe is inspired by time-honored techniques from across Latin America — a celebration of regional flavors and family heritage.',
    icon: <Heart className="w-12 h-12 text-[#fdc32d]" />,
  },
  {
    title: ' Made from Scratch',
    description:
      'From buttery shortbread to savory empanada fillings, everything we make is handcrafted in small batches with care and precision.',
    icon: <Leaf className="w-12 h-12 text-[#fdc32d]" />,
  },
  {
    title: ' Always Ready to Share',
    description:
      'Whether it is a weekday lunch, a holiday table, or a special event — our food is meant to bring people together.',
    icon: <PartyPopper className="w-12 h-12 text-[#fdc32d]" />,
  },
];

const MarketingSection: React.FC = () => {
  return (
    <>
      {/* Why Choose Section */}
      <section className="w-full bg-[#fcfcf5] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#2d3538] lg:text-4xl mb-4">
              Why Choose Our Treats?
            </h2>

            <p className="text-lg text-[#2d3538]/80 max-w-xs mx-auto md:max-w-3xl">
              We bring the best of Latin American flavor to every
              <br className="hidden md:inline" />
              bite — made with love, tradition, and intention
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {features.map(feature => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-6 p-4 rounded-full bg-[#fcfcf5]">{feature.icon}</div>
                <h3 className="text-xl font-bold text-[#2d3538] mb-4">{feature.title}</h3>
                <p className="text-[#2d3538]/80 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="w-full bg-[#fdc32d] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <blockquote className="text-xl italic text-[#2d3538]">
                &quot;The alfajores are absolutely divine! The perfect balance of sweetness and
                texture. I can&apos;t get enough!&quot;
              </blockquote>
              <div className="mt-4">
                <p className="font-semibold text-[#2d3538]">- Maria G.</p>
                <p className="text-sm text-[#2d3538]/70">Loyal Customer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="w-full bg-[#2d3538] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Ready to offer your customers something unforgettable? Delight your audience with
            DESTINO’s handcrafted empanadas and alfajores — the flavors people keep coming back for!
          </h3>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            We offer chef-crafted, small-batch products with strong retail appeal and flexible
            wholesale options. Our empanadas are sold frozen for lasting quality, and our alfajores
            are shelf-stable — both designed for excellent longevity and easy retail display!
          </p>
          <Link
            href="/contact"
            className="inline-block bg-[#f77c22] hover:bg-[#fdc32d] text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </>
  );
};

export default MarketingSection;
