import Link from 'next/link';
import Image from 'next/image';
import { Dancing_Script } from 'next/font/google';

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
    name: 'Empanadas',
    description: 'Our signature savory pastries with various fillings',
    imageUrl: '/images/assets/2Recurso 3.png',
    slug: 'empanadas',
  },
  {
    id: '2',
    name: 'Desserts',
    description: 'Sweet treats including our famous alfajores',
    imageUrl: '/images/assets/2Recurso 13.png',
    slug: 'desserts',
  },
  {
    id: '3',
    name: 'Gift Sets',
    description: 'Curated collections perfect for gifting',
    imageUrl: '/images/assets/2Recurso 17.png',
    slug: 'gift-sets',
  },
];

export function ShopByCategory() {
  return (
    <div className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Shop By Category
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-xl text-gray-500 sm:mt-4">
            Explore our carefully curated collections of artisanal products
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {categories.map(category => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
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
              <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                <h3 className={`text-2xl font-bold ${dancingScript.className}`}>{category.name}</h3>
                <p className="mt-2 text-sm text-white/90">{category.description}</p>
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
      </div>
    </div>
  );
}
