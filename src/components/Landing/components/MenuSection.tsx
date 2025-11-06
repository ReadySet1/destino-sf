import Link from 'next/link';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';
import styles from './MenuSection.module.css';

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
  altText: string;
}

const menuItems: MenuItemType[] = [
  {
    id: '1',
    name: 'Our Empanadas ',
    imageUrl: '/images/homepage/empanadas.png',
    slug: '/products/category/empanadas',
    altText: 'Empanadas collection - handcrafted Latin American savory pastries with golden crust',
  },
  {
    id: '2',
    name: 'Our Alfajores',
    imageUrl: '/images/homepage/alfajor.png',
    slug: '/products/category/alfajores',
    altText: 'Alfajores collection - buttery cookies filled with dulce de leche',
  },
  {
    id: '3',
    name: 'Catering',
    imageUrl: '/images/homepage/catering.png',
    slug: '/catering',
    altText: 'Catering services - Latin American food for corporate and special events',
  },
];

const BackgroundPattern = () => {
  const numberOfIsotipos = 48; // e.g., 6x8 grid

  return (
    <div className={styles.patternWrapper}>
      <div className={styles.patternGrid}>
        {Array.from({ length: numberOfIsotipos }).map((_, i) => (
          <div key={i} className={styles.patternImageContainer}>
            <Image
              src="/images/assets/isotipo.png"
              alt=""
              fill
              sizes="(max-width: 768px) 10vw, 80px"
              className="object-contain"
              priority={i < 12}
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export function MenuSection() {
  return (
    <div className={styles.menuSection}>
      <BackgroundPattern />

      {/* Absolute positioned title at the very top */}
      <h2 className="absolute top-0 left-0 right-0 text-center text-3xl lg:text-5xl font-bold text-gray-800 pt-2 sm:pt-4 z-20">
        Menu
      </h2>

      <div className={styles.content}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:pt-28">
          <div className="flex flex-row justify-around items-center">
            {menuItems.map(item => (
              <Link href={item.slug} key={item.id} className="flex flex-col items-center">
                <div className="relative h-32 w-32 sm:h-40 sm:w-40 md:h-56 md:w-56 overflow-hidden rounded-full">
                  <Image
                    src={item.imageUrl}
                    alt={item.altText}
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
    </div>
  );
}
