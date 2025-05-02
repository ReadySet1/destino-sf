import React from 'react';
import { twMerge } from 'tailwind-merge';

const FaqSection = () => {
  return (
    <div className="mb-16 py-8 px-6 font-serif">
      <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-8 text-center">
        Frequently Asked Questions
      </h2>
      <ol className="list-decimal list-inside space-y-6">
        <li>
          <strong className="font-semibold text-gray-800">
            Do you sell your empanadas and alfajores in stores?
          </strong>
          <p className="text-gray-600 mt-2 indent-6">
            Yes! Our empanadas and alfajores are currently sold in 14 retail stores across San
            Francisco and Oakland, including Faletti&apos;s Market, Luke&apos;s Local, Epicurean
            Trader, Bryan&apos;s Market, Evergreen Market, El Chavo Market, and Skyline Market.
            Check our store locator map for a full list of locations. Coming soon: Marin County and
            the Peninsula!
          </p>
        </li>

        <li>
          <strong className="font-semibold text-gray-800">How do I cook the empanadas?</strong>
          <p className="text-gray-600 mt-2 indent-6">
            Our empanadas are frozen and ready to cook — no prep required.
            <br />
            <br />
            <span className="font-medium">Air Fryer:</span> Preheat to 375°F. Remove empanadas from
            packaging and discard parchment liners. Place on a wire rack or baking tray. Cook for
            15–20 minutes, or until golden brown.
            <br />
            <br />
            <span className="font-medium">Conventional Oven:</span> Preheat to 400°F. Remove
            empanadas from packaging and discard parchment liners. Place on a wire rack or baking
            tray. Bake for 20–25 minutes, or until golden brown. Let cool slightly before serving.
            <br />
            <br />
            Cooking times may vary depending on your appliance.
          </p>
        </li>

        <li>
          <strong className="font-semibold text-gray-800">
            How many empanadas should I plan for per person?
          </strong>
          <p className="text-gray-600 mt-2 indent-6">
            Each empanada is considered one serving — the perfect size for a light meal or
            satisfying snack. That said... they&apos;re really hard to stop at just one. Most of our
            customers enjoy two when serving them for lunch or dinner — especially when paired with
            a salad or sides.
          </p>
        </li>

        <li>
          <strong className="font-semibold text-gray-800">How should I store alfajores?</strong>
          <p className="text-gray-600 mt-2 indent-6">
            It depends a little on the type! Our chocolate, lemon, and 6-pack combo alfajores should
            be stored in a cool, dry place — they&apos;ll stay fresh for up to two weeks. Our
            classic and gluten-free alfajores can be stored at room temperature, or refrigerated
            after opening to extend their freshness.
            <br />
            <br />
            Want to keep them even longer? Alfajores freeze beautifully — just wrap them tightly and
            thaw at room temperature before enjoying.
          </p>
        </li>

        <li>
          <strong className="font-semibold text-gray-800">
            Do your alfajores contain any allergens?
          </strong>
          <p className="text-gray-600 mt-2 indent-6">
            Some of our alfajores do contain common allergens, including wheat, eggs, and dairy.
            Select flavors may also contain or be produced in a facility that handles nuts. If you
            have specific allergies or dietary concerns, please check the ingredient label or reach
            out to us directly — we&apos;re happy to help you choose the best option!
          </p>
        </li>
      </ol>
    </div>
  );
};

export default FaqSection;
