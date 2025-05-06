import React from 'react';

const FaqSection = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Menu: Frequently Asked Questions</h2>

      <div className="space-y-10">
        {[
          {
            question: '1. Do you sell your empanadas and alfajores in stores?',
            answer:
              "Yes! Our empanadas and alfajores are currently sold in 14 retail stores across San Francisco and Oakland, including Faletti's Market, Luke's Local, Epicurean Trader, Bryan's Market, Evergreen Market, El Chavo Market, and Skyline Market. Check our store locator map for a full list of locations. Coming soon: Marin County and the Peninsula!",
          },
          {
            question: '2. How do I cook the empanadas?',
            answer:
              'Our empanadas are frozen and ready to cook — no prep required. Air Fryer: Preheat to 375°F. Remove empanadas from packaging and discard parchment liners. Place on a wire rack or baking tray. Cook for 15–20 minutes, or until golden brown. Conventional Oven: Preheat to 400°F. Remove empanadas from packaging and discard parchment liners. Place on a wire rack or baking tray. Bake for 20–25 minutes, or until golden brown. Let cool slightly before serving. Cooking times may vary depending on your appliance.',
          },
          {
            question: '3. How many empanadas should I plan for per person?',
            answer:
              "Each empanada is considered one serving — the perfect size for a light meal or satisfying snack. That said... they're really hard to stop at just one. Most of our customers enjoy two when serving them for lunch or dinner — especially when paired with a salad or sides.",
          },
          {
            question: '4. How should I store alfajores?',
            answer:
              "It depends a little on the type! Our chocolate, lemon, and 6-pack combo alfajores should be stored in a cool, dry place — they'll stay fresh for up to two weeks. Our classic and gluten-free alfajores can be stored at room temperature, or refrigerated after opening to extend their freshness. Want to keep them even longer? Alfajores freeze beautifully — just wrap them tightly and thaw at room temperature before enjoying.",
          },
          {
            question: '5. Do your alfajores contain any allergens?',
            answer:
              "Some of our alfajores do contain common allergens, including wheat, eggs, and dairy. Select flavors may also contain or be produced in a facility that handles nuts. If you have specific allergies or dietary concerns, please check the ingredient label or reach out to us directly — we're happy to help you choose the best option!",
          },
        ].map((faq, index) => (
          <div key={index} className="mb-8">
            <h3 className="text-xl font-medium text-gray-800 mb-2">{faq.question}</h3>
            <p className="text-gray-700">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaqSection;
