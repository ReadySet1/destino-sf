import React from 'react';
import { ContactForm, ContactInfo } from '@/components/ContactForm';
import { About } from '@/components/About';

const ContactAboutPage = () => {
  return (
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

      {/* About section */}
      <section className="px-8 mb-16">
        <About />
      </section>
    </div>
  );
};

export default ContactAboutPage;
