'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface FoodLoaderProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function FoodLoader({ text = 'Loading...', size = 'medium' }: FoodLoaderProps) {
  // Define sizes for different loader variants
  const sizes = {
    small: {
      container: 'h-24 w-24',
      icon: 'h-10 w-10',
      text: 'text-sm',
      plateSize: '60%',
      orbitDistance: '100%',
    },
    medium: {
      container: 'h-40 w-40',
      icon: 'h-16 w-16',
      text: 'text-base',
      plateSize: '65%',
      orbitDistance: '110%',
    },
    large: {
      container: 'h-52 w-52',
      icon: 'h-20 w-20',
      text: 'text-lg',
      plateSize: '70%',
      orbitDistance: '120%',
    },
  };

  // Number of SVG items to orbit around the plate
  const itemCount = 6;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Main rotating plate animation */}
      <motion.div
        className={`relative ${sizes[size].container} flex items-center justify-center`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Center plate/circle */}
        <motion.div
          className="absolute bg-gradient-to-br from-amber-50 to-amber-100 rounded-full shadow-lg flex items-center justify-center"
          style={{
            width: sizes[size].plateSize,
            height: sizes[size].plateSize,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [0.95, 1.05, 0.95],
            opacity: 1,
          }}
          transition={{
            scale: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            opacity: { duration: 0.5 },
          }}
        >
          {/* Plate decoration */}
          <div className="absolute inset-0 rounded-full border-4 border-amber-200 opacity-50"></div>

          {/* Plate center decoration */}
          <div className="absolute w-1/2 h-1/2 rounded-full border-2 border-amber-300 opacity-40"></div>
        </motion.div>

        {/* Orbiting empanadas */}
        {Array(itemCount)
          .fill(null)
          .map((_, index) => {
            const angle = index * (360 / itemCount);

            return (
              <motion.div
                key={index}
                className={`absolute ${sizes[size].icon} flex items-center justify-center`}
                initial={{
                  rotate: angle,
                  translateY: `-${sizes[size].orbitDistance}`,
                }}
                animate={{
                  rotate: angle, // Stay at fixed positions since the parent is rotating
                  translateY: [
                    `-${sizes[size].orbitDistance}`,
                    `-${parseInt(sizes[size].orbitDistance) - 10}%`,
                    `-${sizes[size].orbitDistance}`,
                  ],
                }}
                transition={{
                  translateY: {
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                    delay: index * 0.3,
                  },
                }}
                style={{
                  transformOrigin: '50% 150%',
                }}
              >
                <motion.div
                  className="w-full h-full"
                  animate={{
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    rotate: {
                      duration: 6,
                      repeat: Infinity,
                      repeatType: 'loop',
                      ease: 'linear',
                    },
                    scale: {
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                      delay: index * 0.2,
                    },
                  }}
                >
                  {/* Your custom SVG from the specified path */}
                  <Image
                    src="/images/loader/empanada.svg"
                    alt="Empanada"
                    width={100}
                    height={100}
                    className="w-full h-full drop-shadow-md"
                  />
                </motion.div>
              </motion.div>
            );
          })}
      </motion.div>

      {/* Loading text */}
      {text && (
        <motion.p
          className={`mt-4 text-amber-800 ${sizes[size].text} font-medium`}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'loop',
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
