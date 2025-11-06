import React from 'react';

/**
 * FAQ item interface
 * - question: The FAQ question text
 * - answer: Plain text answer for JSON-LD schema
 * - answerHtml: Optional React node for rich HTML rendering in the UI
 */
export interface FaqItem {
  question: string;
  answer: string; // Plain text for schema
  answerHtml?: React.ReactNode; // For rendering with JSX
}

/**
 * Menu/Products FAQ Data
 * Used on: Menu page, Product category pages
 */
export const menuFaqData: FaqItem[] = [
  {
    question: 'Do you sell your empanadas and alfajores in stores?',
    answer:
      "Yes! Our empanadas and alfajores are currently sold in 14 retail stores across San Francisco and Oakland, including Faletti's Market, Luke's Local, Epicurean Trader, Bryan's Market, Evergreen Market, El Chavo Market, and Skyline Market. Check our store locator map for a full list of locations. Coming soon: Marin County and the Peninsula!",
    // answerHtml will be added by the component for the interactive map link
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

/**
 * Catering FAQ Data
 * Used on: Catering page
 */
export const cateringFaqData: FaqItem[] = [
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
