import React from 'react';
import { ContactForm, ContactInfoCatering } from '@/components/ContactForm';

const ContactCateringPage = () => {
  return (
    <div className="max-w-[1200px] mx-auto pt-12">
      {/* Main contact card */}
      <div className="bg-[#722F37] rounded-lg overflow-hidden mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left side - Contact info */}
          <div className="p-12">
            <ContactInfoCatering />
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
  );
};

export default ContactCateringPage;
