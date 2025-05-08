'use client';

import React, { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const CateringFaqSection: React.FC = () => {
  // State to track which FAQ items are open
  const [openItems, setOpenItems] = useState<number[]>([]);

  // Toggle function to open/close FAQ items
  const toggleItem = (index: number) => {
    setOpenItems(prevOpenItems =>
      prevOpenItems.includes(index)
        ? prevOpenItems.filter(item => item !== index)
        : [...prevOpenItems, index]
    );
  };

  // FAQ data
  const faqItems: FaqItem[] = [
    {
      question: 'Can you accommodate dietary restrictions or special requests?',
      answer:
        "Absolutely! We offer a wide variety of options to accommodate different dietary needs — including vegetarian, vegan, gluten-free, and dairy-free selections! We are also happy to customize your order based on your event's needs. Just let us know your requirements when placing your order, and we will work with you to create a menu everyone can enjoy.",
    },
    {
      question: 'Where do you deliver catering orders?',
      answer:
        'We proudly serve clients throughout San Francisco and the greater Bay Area! Based in San Francisco, we deliver all catering orders to ensure the highest quality and freshness. Unfortunately, we do not ship catering orders.',
    },
    {
      question: 'How much lead time do you need for catering orders?',
      answer:
        'We kindly ask for at least three business days of notice for all catering orders. If you have a last-minute request, just email us at james@destinosf.com — we will do our best to accommodate!',
    },
    {
      question: 'Do you offer family-style buffet or individually packaged meals?',
      answer:
        'Absolutely. We offer both individually packaged meals and classic buffet-style setups — along with appetizer platters and family-style service. Let us know what works best for your event, and we will tailor the format to your needs.',
    },
    {
      question: 'What services do you offer with catering?',
      answer:
        'We offer a range of services to match your event needs. For full-service events, catering staff can be provided upon request — just let us know the details and we will prepare a custom quote. For drop-off orders, we package everything for easy serving, and can also provide compostable plates, napkins, and utensils upon request.',
    },
  ];

  return (
    <div className="mb-12 md:mb-16">
      <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 md:mb-8">
        Catering: Frequently Asked Questions
      </h2>

      <div className="space-y-4">
        {faqItems.map((faq, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleItem(index)}
              className="flex justify-between items-center w-full p-4 text-left bg-white hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-xl font-medium text-gray-800">
                {index + 1}. {faq.question}
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${openItems.includes(index) ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {openItems.includes(index) && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CateringFaqSection;
