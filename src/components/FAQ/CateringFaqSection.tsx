'use client';

import React, { useState, ButtonHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dancing_Script } from 'next/font/google'; // Import Dancing Script
import { cateringFaqData, FaqItem } from '@/data/faq-data';

// Initialize Dancing Script font
const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
});

const CateringFaqSection: React.FC = () => {
  // State to track which FAQ items are open
  const [openItems, setOpenItems] = useState<number[]>([0]); // Default first item open

  // Toggle function to open/close FAQ items
  const toggleItem = (index: number) => {
    setOpenItems(prevOpenItems =>
      prevOpenItems.includes(index)
        ? prevOpenItems.filter(item => item !== index)
        : [...prevOpenItems, index]
    );
  };

  // Use shared FAQ data
  const faqItems = cateringFaqData;

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
    <div className="mb-8">
      <div className="text-center mb-10">
        <h2
          className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center pb-6 ${dancingScript.className}`}
        >
          Frequently Asked Questions
        </h2>
        <p className="mx-auto mt-3 text-2xl text-black sm:mt-4" style={{ fontStyle: 'italic' }}>
          Find answers to common questions about our catering services
        </p>
      </div>

      <motion.div
        className="max-w-3xl mx-auto space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {faqItems.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <button
              onClick={() => toggleItem(index)}
              className="flex justify-between items-center w-full p-5 text-left bg-white hover:bg-gray-50 transition-colors"
              aria-expanded={openItems.includes(index)}
              aria-controls={`faq-answer-${index}`}
            >
              <h3 className="text-xl font-medium text-gray-800">{faq.question}</h3>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 transition-transform duration-300 ${openItems.includes(index) ? 'transform rotate-180' : ''}`}
              >
                <svg
                  className="w-5 h-5 text-gray-600"
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
              </div>
            </button>

            <AnimatePresence>
              {openItems.includes(index) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  id={`faq-answer-${index}`}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default CateringFaqSection;
