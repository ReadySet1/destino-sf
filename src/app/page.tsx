// src/app/page.tsx

import Hero from "@/components/hero";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from 'next/link'; // Make sure Link is imported

export default async function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        {/* Links to main sections based on site map */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"> {/* Added padding */}
          <h2 className="text-3xl font-extrabold text-center mb-8">Explore Our Offerings</h2> {/* Bolder heading */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center"> {/* Increased gap */}
            {/* Alfajores Link */}
            <Link href="/alfajores" className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition duration-300 ease-in-out transform hover:-translate-y-1">
              <h3 className="text-xl font-semibold mb-2">Our Alfajores</h3>
              <p className="text-gray-600">Discover delicious, handmade varieties.</p>
            </Link>
            {/* Catering Link */}
            <Link href="/catering" className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition duration-300 ease-in-out transform hover:-translate-y-1">
              <h3 className="text-xl font-semibold mb-2">Our Catering</h3>
              <p className="text-gray-600">View packages and options for your event.</p>
            </Link>
            {/* Empanadas Link */}
            <Link href="/empanadas" className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition duration-300 ease-in-out transform hover:-translate-y-1">
              <h3 className="text-xl font-semibold mb-2">Our Empanadas</h3>
              <p className="text-gray-600">Explore savory, freshly baked choices.</p>
            </Link>
            {/* Contact/About Link */}
            <Link href="/contact-about" className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 transition duration-300 ease-in-out transform hover:-translate-y-1">
              <h3 className="text-xl font-semibold mb-2">Contact / About</h3>
              <p className="text-gray-600">Learn our story or get in touch.</p>
            </Link>
          </div>
        </div>
        {/* Original comment about adding more sections can be kept or removed */}
        {/* <Add more sections here as needed /> */}
      </main>
      <Footer />
    </div>
  );
}