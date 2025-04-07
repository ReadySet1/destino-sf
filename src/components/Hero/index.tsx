import Link from "next/link";
import Image from "next/image";
import { Dancing_Script } from "next/font/google";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

interface MenuItemType {
  id: string;
  name: string;
  imageUrl: string;
  slug: string;
}

export default function Hero() {
  // Menu item data - replace with actual data from your API or CMS
  const menuItems: MenuItemType[] = [
    {
      id: "1",
      name: "Our Empanadas ",
      imageUrl: "/images/homepage/empanadas.png",
      slug: "empanadas",
    },
    {
      id: "2",
      name: "Our Alfajores",
      imageUrl: "/images/homepage/alfajor.png",
      slug: "alfajores",
    },
    {
      id: "3",
      name: "Catering",
      imageUrl: "/images/homepage/catering.png",
      slug: "catering",
    },
  ];

  // Popular empanadas data
  const popularEmpanadas: MenuItemType[] = [
    {
      id: "4",
      name: "Huacatay Empanada",
      imageUrl: "/images/hero/huacatay-empanada.jpg",
      slug: "huacatay-empanada",
    },
    {
      id: "5",
      name: "Oxtail Empanada",
      imageUrl: "/images/hero/oxtail-empanada.JPG",
      slug: "oxtail-empanada",
    },
    {
      id: "6",
      name: "Lomo Saltado Empanada",
      imageUrl: "/images/hero/lomo-saltado-empanada.jpeg",
      slug: "lomo-saltado-empanada",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section with Empanada Image and CTA */}
      <div className="relative w-full overflow-hidden">
        {/* Image container with proper sizing */}
        <div className="relative h-[320px] w-full">
          <Image
            src="/images/hero/hero-empanada.png"
            alt="Delicious Empanadas"
            fill
            className="object-cover"
            priority
          />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16">
            <div className="max-w-xl text-white">
              <h1 className="mb-4 text-2xl font-bold leading-tight md:text-5xl">
                Flakey, golden empanadas
                <br />
                filled with rich flavors
              </h1>
              <Link
                href="/order"
                className="mt-6 inline-block rounded-full bg-yellow-400 px-8 py-4 text-lg font-semibold text-gray-800 transition-all hover:bg-yellow-500"
              >
                Order Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Empanadas Section */}
      <div className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            className={`mb-6 text-center text-4xl text-black md:mb-12 md:text-5xl ${dancingScript.className}`}
          >
            Popular Empanadas
          </h2>
        </div>

        {/* Carousel container */}
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent className="flex">
                {popularEmpanadas.map((empanada) => (
                  <CarouselItem key={empanada.id} className="flex-[0_0_33.333%] pl-4">
                    <Link
                      href={`/products/${empanada.slug}`}
                      className="block transition-transform duration-300 hover:scale-[1.02]"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                        <Image
                          src={empanada.imageUrl}
                          alt={empanada.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          priority
                        />
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute inset-y-0 -left-4 -right-4 flex items-center justify-between">
                <CarouselPrevious className="relative h-9 w-9 rounded-full border border-gray-300 bg-white/90 opacity-70 shadow-sm transition-opacity hover:opacity-100" />
                <CarouselNext className="relative h-9 w-9 rounded-full border border-gray-300 bg-white/90 opacity-70 shadow-sm transition-opacity hover:opacity-100" />
              </div>
            </Carousel>
          </div>
        </div>
      </div>

      {/* Menu Section with Yellow Background */}
      <div className="bg-yellow-400 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-16 text-center text-5xl font-bold text-gray-800">
            Menu
          </h2>

          <div className="flex flex-row justify-around items-center">
            {menuItems.map((item) => (
              <Link
                href={`/menu/${item.slug}`}
                key={item.id}
                className="flex flex-col items-center"
              >
                <div
                  className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg sm:h-48 sm:w-48"
                >
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3
                  className={`mt-3 text-lg text-gray-800 ${dancingScript.className} sm:mt-6 sm:text-2xl`}
                >
                  {item.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
