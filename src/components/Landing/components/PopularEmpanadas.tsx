'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';
import useEmblaCarousel from 'embla-carousel-react';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

interface MenuItemType {
  id: string;
  name: string;
  imageUrl: string;
  slug: string;
}

const popularEmpanadas: MenuItemType[] = [
  {
    id: '5',
    name: 'Oxtail Empanada',
    imageUrl: '/images/hero/oxtail-empanada.JPG',
    slug: 'oxtail-empanada',
  },
  {
    id: '6',
    name: 'Lomo Saltado Empanada',
    imageUrl: '/images/hero/lomo-saltado-empanada.jpeg',
    slug: 'lomo-saltado-empanada',
  },
  {
    id: '4',
    name: 'Huacatay Empanada',
    imageUrl: '/images/hero/huacatay-empanada.jpg',
    slug: 'huacatay-empanada',
  },
];

export function PopularEmpanadas() {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  return (
    <div className="bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className={`mb-6 text-center text-4xl text-black md:mb-12 md:text-5xl ${dancingScript.className}`}
        >
          Popular Empanadas
        </h2>
      </div>

      <div className="mx-auto max-w-7xl px-4 overflow-hidden">
        <div className="md:flex md:justify-center">
          {/* Mobile Carousel */}
          <div className="md:hidden overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {popularEmpanadas.map(empanada => (
                <Link
                  key={empanada.id}
                  href={`/products/${empanada.slug}`}
                  className="block min-w-[45%] flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]"
                >
                  <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden">
                    <Image
                      src={empanada.imageUrl}
                      alt={empanada.name}
                      className="object-cover"
                      sizes="(max-width: 768px) 45vw"
                      quality={35}
                      priority
                      width={200}
                      height={150}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop/Tablet Grid */}
          <div className="hidden md:flex md:gap-8 lg:gap-12 justify-center items-start">
            {popularEmpanadas.map(empanada => (
              <Link
                key={empanada.id}
                href={`/products/${empanada.slug}`}
                className="block w-[280px] lg:w-[320px] transition-transform duration-300 hover:scale-[1.02]"
              >
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden">
                  <Image
                    src={empanada.imageUrl}
                    alt={empanada.name}
                    className="object-cover"
                    sizes="(min-width: 1024px) 320px, 280px"
                    quality={40}
                    priority
                    width={600}
                    height={450}
                  />
                </div>
                <p className="mt-4 text-center text-lg font-medium text-gray-900">{empanada.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
