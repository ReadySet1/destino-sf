import { generateStructuredData, SEOConfig } from '@/lib/seo';

interface StructuredDataProps {
  config: SEOConfig;
}

export function StructuredData({ config }: StructuredDataProps) {
  const structuredData = generateStructuredData(config);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}

// Pre-built structured data components for common page types
export function RestaurantStructuredData() {
  return (
    <StructuredData
      config={{
        type: 'restaurant',
        title: 'Destino SF - Authentic Latin Restaurant',
        description:
          'Experience authentic Latin flavors with our handcrafted empanadas and alfajores in San Francisco.',
        image: '/opengraph-image.jpg',
        url: '/',
        cuisine: ['Latin American', 'South American', 'Argentine'],
        rating: 4.8,
        reviewCount: 150,
      }}
    />
  );
}

export function ProductStructuredData({
  name,
  description,
  price,
  image,
  slug,
  availability = 'in_stock',
}: {
  name: string;
  description: string;
  price: string;
  image?: string;
  slug: string;
  availability?: 'in_stock' | 'out_of_stock' | 'pre_order';
}) {
  return (
    <StructuredData
      config={{
        type: 'product',
        title: `${name} | Destino SF`,
        description,
        price,
        image,
        url: `/products/${slug}`,
        availability,
        rating: 4.8,
        reviewCount: 50,
      }}
    />
  );
}

export function MenuStructuredData() {
  return (
    <StructuredData
      config={{
        type: 'restaurant',
        title: 'Our Menu - Authentic Empanadas & Alfajores | Destino SF',
        description:
          'Explore our delicious selection of handcrafted empanadas and alfajores made with traditional recipes.',
        image: '/menu/empanadas.png',
        url: '/menu',
        cuisine: ['Latin American', 'South American', 'Argentine'],
        rating: 4.8,
        reviewCount: 150,
      }}
    />
  );
}

export function CateringStructuredData() {
  return (
    <StructuredData
      config={{
        type: 'restaurant',
        title: 'Catering Services - Premium Latin Cuisine | Destino SF',
        description:
          'Elevate your event with our premium catering services featuring authentic empanadas and Latin cuisine.',
        image: '/catering/catering.png',
        url: '/catering',
        cuisine: ['Latin American', 'South American', 'Argentine'],
        rating: 4.8,
        reviewCount: 150,
      }}
    />
  );
}

export function LocalBusinessStructuredData() {
  const baseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://development.destinosf.com';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}#business`,
    name: 'Destino SF',
    alternateName: 'Destino San Francisco',
    description:
      'Authentic Latin restaurant specializing in handcrafted empanadas and alfajores in San Francisco.',
    image: `${baseUrl}/opengraph-image.jpg`,
    logo: `${baseUrl}/logo/logo-destino.png`,
    url: baseUrl,
    telephone: '+1-415-525-4448',
    email: 'james@destinosf.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '377 Corbett Avenue',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      postalCode: '94114',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.7596,
      longitude: -122.4385,
    },
    openingHours: ['Mo-Fr 08:00-18:00', 'Sa 09:00-17:00', 'Su 09:00-16:00'],
    servesCuisine: ['Latin American', 'South American', 'Argentine', 'Empanadas', 'Alfajores'],
    priceRange: '$$',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: 4.8,
      reviewCount: 150,
      bestRating: 5,
      worstRating: 1,
    },
    review: [
      {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: 'Maria Rodriguez',
        },
        datePublished: '2024-01-15',
        reviewBody:
          'The empanadas are absolutely delicious! Authentic flavors that remind me of home. The alfajores are the perfect dessert.',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: 5,
          bestRating: 5,
          worstRating: 1,
        },
      },
      {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: 'John Smith',
        },
        datePublished: '2024-02-03',
        reviewBody:
          'Great catering service for our corporate event. Professional, timely, and the food was a hit with everyone.',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: 5,
          bestRating: 5,
          worstRating: 1,
        },
      },
    ],
    hasMenu: `${baseUrl}/menu`,
    acceptsReservations: true,
    paymentAccepted: ['Cash', 'Credit Card', 'Square'],
    currenciesAccepted: 'USD',
    sameAs: [
      'https://www.instagram.com/destinosf',
      'https://www.facebook.com/destinosf',
      'https://www.yelp.com/biz/destino-sf',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}
