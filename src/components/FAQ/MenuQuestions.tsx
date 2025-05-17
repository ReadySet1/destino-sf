'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FaqSection: React.FC = () => {
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
      question: 'Do you sell your empanadas and alfajores in stores?',
      answer:
        "Yes! Our empanadas and alfajores are currently sold in 14 retail stores across San Francisco and Oakland, including Faletti's Market, Luke's Local, Epicurean Trader, Bryan's Market, Evergreen Market, El Chavo Market, and Skyline Market. Check our store locator map for a full list of locations. Coming soon: Marin County and the Peninsula!",
    },
    {
      question: 'How do I cook the empanadas?',
      answer:
        'Our empanadas are frozen and ready to cook — no prep required. Air Fryer: Preheat to 375°F. Remove empanadas from packaging and discard parchment liners. Place on a wire rack or baking tray. Cook for 15–20 minutes, or until golden brown. Conventional Oven: Preheat to 400°F. Remove empanadas from packaging and discard parchment liners. Place on a wire rack or baking tray. Bake for 20–25 minutes, or until golden brown. Let cool slightly before serving. Cooking times may vary depending on your appliance.',
    },
    {
      question: 'How many empanadas should I plan for per person?',
      answer:
        'Each empanada is considered one serving — the perfect size for a light meal or satisfying snack. That said... they are really hard to stop at just one. Most of our customers enjoy two when serving them for lunch or dinner — especially when paired with a salad or sides.',
    },
    {
      question: 'How should I store alfajores?',
      answer:
        'It depends a little on the type! Our chocolate, lemon, and 6-pack combo alfajores should be stored in a cool, dry place — they will stay fresh for up to two weeks. Our classic and gluten-free alfajores can be stored at room temperature, or refrigerated after opening to extend their freshness. Want to keep them even longer? Alfajores freeze beautifully — just wrap them tightly and thaw at room temperature before enjoying.',
    },
    {
      question: 'Do your alfajores contain any allergens?',
      answer:
        'Some of our alfajores do contain common allergens, including wheat, eggs, and dairy. Select flavors may also contain or be produced in a facility that handles nuts. If you have specific allergies or dietary concerns, please check the ingredient label or reach out to us directly — we are happy to help you choose the best option!',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h2 className="font-quicksand text-3xl font-bold text-amber-900 mb-8 text-center sm:text-4xl">
        Frequently Asked Questions
        <div className="mt-2 h-1 w-16 bg-yellow-400 mx-auto" />
      </h2>

      <div className="space-y-4">
        {faqItems.map((faq, index) => (
          <div 
            key={index} 
            className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm transition-all duration-300"
          >
            <button
              onClick={() => toggleItem(index)}
              className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-amber-50/50"
              aria-expanded={openItems.includes(index)}
              aria-controls={`faq-answer-${index}`}
            >
              <h3 className="font-quicksand text-lg font-medium text-amber-900 pr-8 sm:text-xl">
                {faq.question}
              </h3>
              <ChevronDown 
                className={`h-5 w-5 text-amber-500 transition-transform duration-300 ${
                  openItems.includes(index) ? 'rotate-180 transform' : ''
                }`} 
              />
            </button>

            <div 
              id={`faq-answer-${index}`}
              className={`overflow-hidden transition-all duration-300 ${
                openItems.includes(index) 
                  ? 'max-h-[500px] opacity-100' 
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="border-t border-amber-100 bg-amber-50/30 p-5">
                <p className="text-amber-900/80 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaqSection;
