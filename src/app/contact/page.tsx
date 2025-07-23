import React from 'react';
import { ContactForm, ContactInfo } from '@/components/ContactForm';
import { generatePageSEO } from '@/lib/seo';
import { StructuredData } from '@/components/seo/StructuredData';

export const metadata = generatePageSEO('contact');

const ContactPage = () => {
  return (
    <>
      <StructuredData
        config={{
          type: 'website',
          title: 'Contact Us - Get in Touch | Destino SF',
          description:
            'Get in touch with us for orders, catering inquiries, or any questions. Located at 377 Corbett Avenue, San Francisco.',
          url: '/contact',
          image: '/opengraph-image.jpg',
        }}
      />
      <div className="max-w-[1200px] mx-auto pt-12">
        {/* Main contact card */}
        <div className="bg-[#f77c22] rounded-lg overflow-hidden mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left side - Contact info */}
            <div className="p-12">
              <ContactInfo />
            </div>

            {/* Right side - Contact form */}
            <div className="p-12">
              <div className="bg-white rounded-lg p-8">
                <h2 className="text-xl mb-6">Send us a message</h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
