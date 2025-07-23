import React from 'react';
import { About } from '@/components/About';
import { generatePageSEO } from '@/lib/seo';
import { StructuredData } from '@/components/seo/StructuredData';

export const metadata = generatePageSEO('about');

const AboutPage = () => {
  return (
    <>
      <StructuredData
        config={{
          type: 'website',
          title: 'About Us - Our Story & Mission | Destino SF',
          description:
            'Learn about our passion for authentic Latin cuisine and our commitment to bringing traditional flavors to San Francisco.',
          url: '/about',
          image: '/images/about/about-us.png',
        }}
      />
      <div className="max-w-[1200px] mx-auto pt-12">
        <section className="px-8">
          <About variant="large" />
        </section>
      </div>
    </>
  );
};

export default AboutPage;
