"use client";

import Link from 'next/link';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  return (
    <>
      {/* Curved transition from white to orange - only on non-landing pages */}
      {!isLandingPage && (
        <div className="bg-white w-full">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" className="w-full">
            <path
              fill="#F47A1F"
              fillOpacity="1"
              d="M0,32L80,42.7C160,53,320,75,480,74.7C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"
            ></path>
          </svg>
        </div>
      )}
      
      <div className="bg-[#F47A1F] w-full pt-8">
        <footer className="bg-[#FDC32D] w-full rounded-t-3xl max-w-[90%] lg:max-w-[85%] mx-auto">
          <div className="max-w-7xl mx-auto py-8 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-center items-center gap-16 md:gap-32">
              {/* Left section with navigation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 w-full md:w-auto">
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-bold text-gray-800 uppercase">About Us</h3>
                  <ul className="mt-4 space-y-3 md:space-y-4">
                    <li>
                      <Link href="/our-story" className="text-base text-gray-700 hover:text-gray-900">
                        Our Story
                      </Link>
                    </li>
                    <li>
                      <Link href="/careers" className="text-base text-gray-700 hover:text-gray-900">
                        Careers
                      </Link>
                    </li>
                    <li>
                      <Link href="/press" className="text-base text-gray-700 hover:text-gray-900">
                        Press
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-bold text-gray-800 uppercase">Support</h3>
                  <ul className="mt-4 space-y-3 md:space-y-4">
                    <li>
                      <Link href="/contact" className="text-base text-gray-700 hover:text-gray-900">
                        Contact Us
                      </Link>
                    </li>
                    <li>
                      <Link href="/faq" className="text-base text-gray-700 hover:text-gray-900">
                        FAQ
                      </Link>
                    </li>
                    <li>
                      <Link href="/shipping" className="text-base text-gray-700 hover:text-gray-900">
                        Shipping
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-bold text-gray-800 uppercase">Legal</h3>
                  <ul className="mt-4 space-y-3 md:space-y-4">
                    <li>
                      <Link href="/privacy" className="text-base text-gray-700 hover:text-gray-900">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/refund" className="text-base text-gray-700 hover:text-gray-900">
                        Refund Policy
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right section with social and logo */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mt-8 md:mt-0">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="flex justify-center gap-6">
                    <a href="https://facebook.com/destinosf" className="text-gray-800 hover:text-gray-900">
                      <Facebook size={28} />
                    </a>
                    <a href="https://instagram.com/destinosf" className="text-gray-800 hover:text-gray-900">
                      <Instagram size={28} />
                    </a>
                    <a href="https://linkedin.com/company/destinosf" className="text-gray-800 hover:text-gray-900">
                      <Linkedin size={28} />
                    </a>
                  </div>
                  <span className="text-xl font-medium text-gray-800">@destinosf</span>
                </div>
                <div 
                  style={{ 
                    width: '192px',
                    height: '192px',
                    backgroundImage: 'url(/images/logo/water-mark-dark.png)',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                  role="img"
                  aria-label="Destino SF Logo"
                />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
