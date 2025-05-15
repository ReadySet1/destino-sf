'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FaqItem {
  question: string;
  answer: string;
}

const MenuFaqSection: React.FC = () => {
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

  // Enhanced animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.15,
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      translateY: -10,
    },
    visible: {
      opacity: 1,
      height: 'auto',
      translateY: 0,
      transition: {
        height: {
          duration: 0.4,
          ease: [0.04, 0.62, 0.23, 0.98],
        },
        opacity: {
          duration: 0.25,
          delay: 0.1,
        },
        translateY: {
          duration: 0.3,
          ease: 'easeOut',
        },
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      translateY: -10,
      transition: {
        height: {
          duration: 0.3,
          ease: [0.04, 0.62, 0.23, 0.98],
        },
        opacity: {
          duration: 0.2,
        },
        translateY: {
          duration: 0.25,
        },
      },
    },
  };

  // Button hover animation effect
  const buttonHoverVariants = {
    rest: {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      transition: { duration: 0.2, ease: 'easeInOut' },
    },
    hover: {
      backgroundColor: 'rgba(249, 250, 251, 1)',
      transition: { duration: 0.2, ease: 'easeInOut' },
    },
  };

  // Improved arrow animation
  const arrowVariants = {
    up: {
      rotate: 180,
      transition: { duration: 0.3, ease: [0.3, 1.05, 0.5, 1.05] },
    },
    down: {
      rotate: 0,
      transition: { duration: 0.3, ease: [0.3, 1.05, 0.5, 1.05] },
    },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="text-3xl font-bold text-gray-800 mb-8"
      >
        Menu: Frequently Asked Questions
      </motion.h2>

      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {faqItems.map((faq, index) => (
          <motion.div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            variants={itemVariants}
            whileHover={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              transition: { duration: 0.3 },
            }}
          >
            <motion.button
              onClick={() => toggleItem(index)}
              className="flex justify-between items-center w-full p-4 text-left bg-white transition-colors"
              variants={buttonHoverVariants}
              initial="rest"
              whileHover="hover"
              whileTap={{ scale: 0.995 }}
            >
              <motion.h3
                className="text-xl font-medium text-gray-800"
                initial={{ opacity: 0.95 }}
                whileHover={{ opacity: 1 }}
              >
                {index + 1}. {faq.question}
              </motion.h3>
              <motion.svg
                variants={arrowVariants}
                animate={openItems.includes(index) ? 'up' : 'down'}
                className="w-5 h-5 text-gray-500 flex-shrink-0 ml-4"
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
              </motion.svg>
            </motion.button>

            <AnimatePresence initial={false}>
              {openItems.includes(index) && (
                <motion.div
                  key={`content-${index}`}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={contentVariants}
                  className="bg-gray-50 border-t border-gray-200 overflow-hidden"
                >
                  <div className="p-4">
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          delay: 0.15,
                          duration: 0.35,
                          ease: 'easeOut',
                        },
                      }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.2 },
                      }}
                      className="text-gray-700"
                    >
                      {faq.answer}
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default MenuFaqSection;
