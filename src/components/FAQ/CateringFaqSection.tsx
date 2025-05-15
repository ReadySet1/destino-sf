'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="mb-12 md:mb-16">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 md:mb-8"
      >
        Catering: Frequently Asked Questions
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
                      className="text-gray-600"
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

export default CateringFaqSection;
