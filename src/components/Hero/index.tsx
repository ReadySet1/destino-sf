import Link from "next/link";
import Image from "next/image";
import { Dancing_Script } from "next/font/google";

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
      name: "Beef Empanada",
      imageUrl: "/images/homepage/empanadas 3.png",
      slug: "beef-empanada",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section with Empanada Image and CTA */}
      <div className="relative w-full overflow-hidden">
        {/* Image container with proper sizing */}
        <div className="relative h-[500px] w-full">
          <Image
            src="/images/homepage/empanadas 2.png"
            alt="Delicious Empanadas"
            fill
            className="object-cover"
            priority
          />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16">
            <div className="max-w-xl text-white">
              <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
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
      <div className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            className={`mb-6 text-center text-4xl text-black md:mb-12 md:text-5xl ${dancingScript.className}`}
          >
            Popular Empanadas
          </h2>
        </div>

        {/* Contenedor de imagen responsivo */}
        <div className="w-full px-0 sm:px-4">
          {popularEmpanadas.map((empanada) => (
            <Link
              href={`/products/${empanada.slug}`}
              key={empanada.id}
              className="block transition-transform duration-300 hover:scale-[1.02]"
            >
              <div className="relative h-[60vw] w-full overflow-hidden md:h-[35vw] lg:h-[500px]">
                <Image
                  src={empanada.imageUrl}
                  alt={empanada.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
                  priority
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Menu Section with Yellow Background */}
      <div className="bg-yellow-400 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-16 text-center text-5xl font-bold text-gray-800">
            Menu
          </h2>

          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <Link
                href={`/menu/${item.slug}`}
                key={item.id}
                className="flex flex-col items-center"
              >
                <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-white shadow-lg">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3
                  className={`mt-6 text-2xl text-gray-800 ${dancingScript.className}`}
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
