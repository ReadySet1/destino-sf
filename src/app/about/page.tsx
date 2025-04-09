import React from 'react';
import { About } from '@/components/About';

const AboutPage = () => {
  return (
    <div className="max-w-[1200px] mx-auto pt-12">
      <section className="px-8">
        <About variant="large" />
      </section>
    </div>
  );
};

export default AboutPage;
