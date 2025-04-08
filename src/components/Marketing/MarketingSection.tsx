import React from 'react';
import { Heart, Leaf, PartyPopper } from 'lucide-react';

interface MarketingFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: MarketingFeature[] = [
  {
    title: 'Handcrafted with Love',
    description: 'Each item is carefully prepared using traditional recipes passed down through generations.',
    icon: <Heart className="w-12 h-12 text-yellow-500" />,
  },
  {
    title: 'Fresh Ingredients',
    description: 'We source only the finest, freshest ingredients to ensure the best quality in every bite.',
    icon: <Leaf className="w-12 h-12 text-yellow-500" />,
  },
  {
    title: 'Perfect for Any Occasion',
    description: 'From casual gatherings to special events, our treats are the perfect addition to any celebration.',
    icon: <PartyPopper className="w-12 h-12 text-yellow-500" />,
  },
];

const MarketingSection: React.FC = () => {
  return (
    <div className="bg-yellow-50 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 font-quicksand">
            Why Choose Our Treats?
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Experience the authentic taste of Argentina with our carefully crafted selection of traditional treats.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-center">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonial Section */}
        <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl italic text-gray-600">
              "The alfajores are absolutely divine! The perfect balance of sweetness and texture. I can't get enough!"
            </blockquote>
            <div className="mt-4">
              <p className="font-semibold text-gray-900">- Maria G.</p>
              <p className="text-sm text-gray-500">Loyal Customer</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Experience Authentic Argentine Flavors?
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            Order now and taste the difference!
          </p>
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
            aria-label="Order now"
          >
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketingSection; 