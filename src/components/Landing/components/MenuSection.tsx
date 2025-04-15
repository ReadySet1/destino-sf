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

// Componente para el patrón de fondo con grid de imágenes
const BackgroundPattern = () => {
  // Ajusta este número según cuántos isotipos quieras mostrar
  const numberOfIsotipos = 48; // e.g., 6x8 grid

  return (
    <div className={styles.patternWrapper}>
      <div className={styles.patternGrid}>
        {Array.from({ length: numberOfIsotipos }).map((_, i) => (
          <div key={i} className={styles.patternImageContainer}>
            <Image
              src="/images/assets/isotipo.png" // Sin cache bust aquí, Next/Image maneja eso
              alt=""
              fill
              sizes="(max-width: 768px) 10vw, 80px" // Ajusta sizes según necesidad
              className="object-contain"
              priority={i < 12} // Prioriza la carga de los primeros
              unoptimized // Si el isotipo es simple y no necesita optimización
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
      <BackgroundPattern /> {/* Añadir el componente de patrón */}
      <div className={styles.content}>
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
    </div>
  );
}
