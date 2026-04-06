import Link from 'next/link';
import Image from 'next/image';
import { unstable_noStore as noStore } from 'next/cache';
import { Dancing_Script } from 'next/font/google';
import { prisma, withRetry } from '@/lib/db-unified';
import { truncateHtmlDescription } from '@/lib/utils/product-description';
import type { SpotlightPick } from '@/types/spotlight';

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

async function getSpotlightPicks(): Promise<SpotlightPick[]> {
  // Opt out of static rendering — always fetch fresh data at request time.
  // The Suspense boundary in the parent page shows a skeleton while this loads.
  noStore();

  const rawPicks = await withRetry(
    async () => {
      return await prisma.spotlightPick.findMany({
        where: {
          isActive: true,
          productId: { not: undefined },
        },
        include: {
          product: {
            include: {
              category: {
                select: { name: true, slug: true },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      });
    },
    3,
    'spotlight-picks-server-fetch'
  );

  return rawPicks
    .filter(pick => pick.product && pick.productId)
    .map(pick => ({
      id: pick.id,
      position: pick.position as 1 | 2 | 3 | 4,
      productId: pick.productId!,
      isActive: pick.isActive,
      createdAt: pick.createdAt,
      updatedAt: pick.updatedAt,
      product: {
        id: pick.product!.id,
        name: pick.product!.name,
        description: pick.product!.description,
        images: (pick.product!.images as string[]) || [],
        price:
          typeof pick.product!.price === 'object' &&
          pick.product!.price &&
          'toNumber' in pick.product!.price
            ? pick.product!.price.toNumber()
            : Number(pick.product!.price),
        slug: pick.product!.slug,
        category: pick.product!.category
          ? { name: pick.product!.category.name, slug: pick.product!.category.slug }
          : undefined,
      },
    }));
}

function ProductCard({ pick, className }: { pick: SpotlightPick; className?: string }) {
  const productData = {
    name: pick.product?.name || 'Product',
    description: pick.product?.description || '',
    price:
      pick.product?.price && pick.product.price > 0 ? `$${pick.product.price.toFixed(2)}` : '',
    imageUrl: pick.product?.images?.[0] || '/images/fallbacks/product-default.svg',
    slug: pick.product?.slug || '#',
  };

  const shortDescription = productData.description
    ? truncateHtmlDescription(productData.description, 80)
    : '';

  const linkHref = pick.product?.slug ? `/products/${pick.product.slug}` : '#';

  return (
    <Link href={linkHref} className={className}>
      <div
        className="relative rounded-3xl overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-lg"
        style={{ paddingBottom: '75%' }}
      >
        <Image
          src={productData.imageUrl}
          alt={productData.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105 absolute inset-0 rounded-3xl"
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 85vw"
          priority
        />
      </div>
      <div className="mt-4">
        <h3 className="font-semibold text-lg text-gray-900">{productData.name}</h3>
        {shortDescription && (
          <div
            className="text-sm text-gray-600 mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: shortDescription }}
          />
        )}
        {productData.price && (
          <p className="font-medium text-amber-600 mt-2">{productData.price}</p>
        )}
      </div>
    </Link>
  );
}

export async function FeaturedProductsServer() {
  const spotlightPicks = await getSpotlightPicks();

  if (spotlightPicks.length === 0) {
    return (
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center ${dancingScript.className}`}
          >
            Spotlight Picks
          </h2>
          <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Check back soon for our featured products!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className={`text-4xl font-bold tracking-tight text-black sm:text-5xl text-center ${dancingScript.className}`}
        >
          Spotlight Picks
        </h2>
        <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
          Discover our carefully curated selection of premium Peruvian products
        </p>

        <div
          className={`mt-12 ${
            spotlightPicks.length <= 3
              ? 'flex justify-center gap-6 max-w-6xl mx-auto'
              : 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {spotlightPicks.map(pick => (
            <ProductCard
              key={pick.id || pick.position}
              pick={pick}
              className={`group cursor-pointer ${
                spotlightPicks.length <= 3
                  ? 'flex-shrink-0 w-64 sm:w-72 lg:w-80'
                  : ''
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
