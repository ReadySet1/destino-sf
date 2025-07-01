import Link from 'next/link';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';
import styles from './ShopByCategory.module.css';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

interface CategoryType {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  slug: string;
}

const categories: CategoryType[] = [
  {
    id: '1',
    name: 'Our Empanadas',
    description: 'Our signature savory pastries with exquisite fillings',
    imageUrl: '/images/assets/2Recurso 3.png',
    slug: 'empanadas',
  },
  {
    id: '2',
    name: 'Our Alfajores',
    description: 'Delicious butter cookies filled with creamy dulce de leche',
    imageUrl: '/images/menu/alfajores.png',
    slug: 'alfajores',
  },
  {
    id: '3',
    name: 'Our Catering',
    description: 'Professional catering services for all your needs',
    imageUrl: '/images/menu/catering.jpeg',
    slug: 'catering',
  },
];

const BackgroundPattern = () => {
  const numberOfIsotipos = 48; // 6x8 grid

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

export function ShopByCategory() {
  return (
    <div className={styles.categorySection}>
      <BackgroundPattern />
      <div className={styles.content}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2
              className={`text-4xl font-bold tracking-tight text-black sm:text-5xl ${dancingScript.className}`}
            >
              Our Menus: What We Make
            </h2>
            <p
              className="mx-auto mt-3 text-xl text-slate-700 sm:mt-4"
              style={{ fontStyle: 'italic' }}
            >
              Craving something delicious? Explore our delicious lineup of Latin specialties.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3 px-2 py-4">
            {categories.map(category => (
              <Link
                key={category.id}
                href={
                  category.slug === 'catering' ? '/catering' : `/products/category/${category.slug}`
                }
                className="group relative overflow-hidden rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <div className="relative h-64 w-full overflow-hidden">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105 rounded-3xl"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 w-full p-6 text-white text-center">
                  <h3 className={`text-2xl font-bold ${dancingScript.className}`}>
                    {category.name}
                  </h3>
                  {category.slug === 'alfajores' ? (
                    <div className="mt-2 text-sm text-white/90">
                      <p>Delicious butter cookies filled</p>
                      <p>with creamy dulce de leche</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-white/90">{category.description}</p>
                  )}
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-white">
                    Shop Now
                    <svg
                      className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Commenting out View All Categories button
          <div className="mt-12 text-center">
            <Link
              href="/categories"
              className="inline-flex items-center rounded-md border border-transparent bg-gray-100 px-6 py-3 text-base font-medium text-gray-900 hover:bg-gray-200"
            >
              View All Categories
              <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
