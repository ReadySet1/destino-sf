'use client';

import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

interface TestimonialType {
  id: string;
  name: string;
  orderService: string;
  icon: string;
  quote: string;
  rating: number;
}

const testimonials: TestimonialType[] = [
  {
    id: '1',
    name: 'Maria Rodriguez',
    orderService: 'Event Planner',
    icon: '👨‍🍳',
    quote:
      "The catering service was exceptional. Our guests couldn't stop talking about the empanadas. Will definitely order again for future events!",
    rating: 5.0,
  },
  {
    id: '2',
    name: 'David Chen',
    orderService: 'Food Enthusiast',
    icon: '🍽️',
    quote:
      "Authentic flavors that transport me back to South America. The alfajores are simply the best I've had outside of Argentina.",
    rating: 5.0,
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    orderService: 'Office Manager',
    icon: '🏢',
    quote:
      'We order regularly for our office lunch meetings. Always on time, always delicious. Excellent customer service too!',
    rating: 5.0,
  },
];

export function CustomerTestimonials() {
  return (
    <div className="bg-[#f77c22] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className={`text-5xl font-bold text-white mb-4 ${dancingScript.className}`}>
            Testimonials
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-xl text-white/90">
            Real stories from happy customers — so grateful for the love!
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(testimonial => (
            <div key={testimonial.id} className="rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
                  {testimonial.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{testimonial.name}</h3>
                  <p className="text-gray-600">{testimonial.orderService}</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold text-gray-900">{testimonial.rating}</span>
                </div>
              </div>
              <p className="mt-4 text-gray-600">{testimonial.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
