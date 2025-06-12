'use client';

import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export function ContactInfoCatering() {
  return (
    <div className="space-y-8">
      <div>
        <h2
          className={`text-4xl font-bold tracking-tight text-white sm:text-5xl text-center ${dancingScript.className}`}
        >
          Ready to plan your event?
        </h2>
        <p className="mx-auto mt-3 text-xl text-white sm:mt-4" style={{ fontStyle: 'italic' }}>
          Let us help you create an unforgettable experience
          <br />
          with our Latin American catering services!
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Mail className="h-6 w-6 text-white" />
        <Link
          href="mailto:james@destinos.com"
          className="text-white hover:underline transition-colors text-lg"
        >
          james@destinosf.com
        </Link>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Phone className="h-6 w-6 text-white" />
          <Link
            href="tel:+14155771677"
            className="text-white hover:underline transition-colors text-lg"
          >
            415.577.1677
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
            San Francisco, CA 94114
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
          <Facebook className="h-5 w-5 text-[#2d3538]" />
        </Link>
        <Link
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="bg-white rounded-full p-2.5 hover:opacity-90 transition-opacity"
        >
          <Instagram className="h-5 w-5 text-[#2d3538]" />
        </Link>
        <Link
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="bg-white rounded-full p-2.5 hover:opacity-90 transition-opacity"
        >
          <Linkedin className="h-5 w-5 text-[#2d3538]" />
        </Link>
      </div>
    </div>
  );
}
