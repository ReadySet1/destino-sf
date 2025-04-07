import Link from 'next/link';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';

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

const menuItems: MenuItemType[] = [
  {
    id: '1',
    name: 'Our Empanadas ',
    imageUrl: '/images/homepage/empanadas.png',
    slug: 'empanadas',
  },
  {
    id: '2',
    name: 'Our Alfajores',
    imageUrl: '/images/homepage/alfajor.png',
    slug: 'alfajores',
  },
  {
    id: '3',
    name: 'Catering',
    imageUrl: '/images/homepage/catering.png',
    slug: 'catering',
  },
];

export function MenuSection() {
  return (
    <div className="bg-amber-300 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-800">Menu</h2>

        <div className="flex flex-row justify-around items-center">
          {menuItems.map(item => (
            <Link href={`/menu/${item.slug}`} key={item.id} className="flex flex-col items-center">
              <div className="relative h-32 w-32 sm:h-40 sm:w-40 md:h-56 md:w-56 overflow-hidden rounded-full">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={224}
                  height={224}
                  className="object-cover h-full w-full"
                  priority
                  unoptimized
                />
              </div>
              <h3
                className={`mt-4 md:mt-6 text-xl sm:text-2xl md:text-3xl text-gray-800 ${dancingScript.className}`}
              >
                {item.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
