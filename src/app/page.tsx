// src/app/page.tsx

import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default async function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        {/* Add more sections here as needed */}
      </main>
      <Footer />
    </div>
  );
}
