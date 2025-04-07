"use client";

import { useState } from "react";
import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

interface TestimonialType {
  id: string;
  name: string;
  role: string;
  icon: string;
  quote: string;
  rating: number;
  color: string;
}

const testimonials: TestimonialType[] = [
  {
    id: "1",
    name: "Maria Rodriguez",
    role: "Event Planner",
    icon: "👨‍🍳",
    quote: "The catering service was exceptional. Our guests couldn't stop talking about the empanadas. Will definitely order again for future events!",
    rating: 5,
    color: "amber-100",
  },
  {
    id: "2",
    name: "David Chen",
    role: "Food Enthusiast",
    icon: "🍽️",
    quote: "Authentic flavors that transport me back to South America. The alfajores are simply the best I've had outside of Argentina.",
    rating: 5,
    color: "amber-200",
  },
  {
    id: "3",
    name: "Sarah Johnson",
    role: "Office Manager",
    icon: "🏢",
    quote: "We order regularly for our office lunch meetings. Always on time, always delicious. Excellent customer service too!",
    rating: 5,
    color: "amber-300",
  },
];

export function CustomerTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = () => {
    setActiveIndex((current) => (current + 1) % testimonials.length);
  };

  const prev = () => {
    setActiveIndex((current) => (current - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-block h-1 w-20 rounded bg-amber-400 mb-4"></span>
          <h2 className={`text-3xl font-bold text-gray-900 sm:text-4xl mb-2 ${dancingScript.className}`}>
            What Our Customers Say
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-xl text-gray-500">
            We take pride in serving our community with authentic flavors and exceptional service
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl">
          <div 
            className="relative overflow-hidden rounded-3xl bg-white shadow-2xl p-1"
            style={{ backgroundImage: "radial-gradient(circle at top right, #f1f5f9, white)" }}
          >
            <div 
              className={`absolute top-0 left-0 w-32 h-32 opacity-20 rounded-full -translate-x-1/2 -translate-y-1/2 bg-${testimonials[activeIndex].color}`}
            ></div>
            <div 
              className={`absolute bottom-0 right-0 w-48 h-48 opacity-20 rounded-full translate-x-1/3 translate-y-1/3 bg-${testimonials[activeIndex].color}`}
            ></div>
            
            <div className="relative p-8 md:p-12 z-10">
              <svg 
                className="absolute text-amber-100 w-24 h-24 -top-2 -left-2 opacity-30"
                fill="currentColor"
                viewBox="0 0 32 32"
              >
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>
              
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center">
                    <div className={`flex h-20 w-20 items-center justify-center rounded-full shadow-lg bg-${testimonials[activeIndex].color} text-4xl`}>
                      {testimonials[activeIndex].icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-bold text-gray-900">{testimonials[activeIndex].name}</h3>
                      <p className="text-gray-600">{testimonials[activeIndex].role}</p>
                    </div>
                  </div>
                  
                  <div className="flex bg-amber-50 rounded-full px-4 py-2">
                    {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                      <svg 
                        key={i}
                        className="h-6 w-6 text-amber-400" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                      </svg>
                    ))}
                  </div>
                </div>
                
                <blockquote>
                  <p className="text-xl font-medium text-gray-700 italic leading-relaxed">
                    &quot;{testimonials[activeIndex].quote}&quot;
                  </p>
                </blockquote>
                
                <div className="mt-12 flex justify-between items-center">
                  <div className="flex space-x-1">
                    {testimonials.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`h-3 w-12 rounded-full transition-all duration-300 ${
                          idx === activeIndex ? "bg-amber-400" : "bg-gray-200"
                        }`}
                      >
                        <span className="sr-only">Testimonial {idx + 1}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={prev}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-600 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-300"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={next}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white shadow-md hover:shadow-lg hover:bg-amber-500 transition-all duration-300"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 