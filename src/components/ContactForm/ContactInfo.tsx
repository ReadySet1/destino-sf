'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';

export function ContactInfo() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-white mb-4">
          Curious about our menu or catering options?
        </h2>
        <div className="mb-10">
          <h3 className="text-3xl font-extrabold text-white mb-3">Contact Information</h3>
          <p className="text-gray-100 text-lg">
            Feel free to get in touch—we&apos;re here to make your experience deliciously simple.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Phone className="h-6 w-6 text-white" />
          <Link 
            href="tel:+14155771677" 
            className="text-white hover:underline transition-colors text-lg"
          >
            +14155771677
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <Mail className="h-6 w-6 text-white" />
          <Link 
            href="mailto:james@destinos.com" 
            className="text-white hover:underline transition-colors text-lg"
          >
            james@destinos.com
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <MapPin className="h-6 w-6 text-white" />
          <Link 
            href="https://maps.google.com/?q=San+Francisco,+CA+94124" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:underline transition-colors text-lg"
          >
            San Francisco, CA 94124
          </Link>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Link
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="bg-white rounded-full p-2.5 hover:opacity-90 transition-opacity"
        >
          <Facebook className="h-5 w-5 text-[#f77c22]" />
        </Link>
        <Link
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="bg-white rounded-full p-2.5 hover:opacity-90 transition-opacity"
        >
          <Instagram className="h-5 w-5 text-[#f77c22]" />
        </Link>
        <Link
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="bg-white rounded-full p-2.5 hover:opacity-90 transition-opacity"
        >
          <Linkedin className="h-5 w-5 text-[#f77c22]" />
        </Link>
      </div>
    </div>
  );
} 