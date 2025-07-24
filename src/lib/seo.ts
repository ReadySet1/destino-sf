import { Metadata } from 'next';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  type?: 'website' | 'article' | 'product' | 'restaurant' | 'food';
  image?: string;
  imageAlt?: string;
  url?: string;
  publishedTime?: string;
  modifiedTime?: string;
  category?: string;
  tags?: string[];
  price?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'pre_order';
  cuisine?: string[];
  rating?: number;
  reviewCount?: number;
  noIndex?: boolean;
  noFollow?: boolean;
}

const baseUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://development.destinosf.com';

export const defaultSEO: SEOConfig = {
  title: 'Destino SF - Authentic Handcrafted Empanadas & Alfajores',
  description:
    'Experience authentic Latin flavors with our handcrafted empanadas and alfajores. Premium catering services available in San Francisco.',
  keywords: [
    'empanadas',
    'alfajores',
    'latin food',
    'catering',
    'san francisco',
    'handcrafted',
    'authentic',
  ],
  author: 'Destino SF',
  type: 'restaurant',
  image: '/opengraph-image',
  imageAlt: 'Destino SF - Handcrafted Empanadas & Alfajores',
  cuisine: ['Latin American', 'South American', 'Argentine'],
  rating: 4.8,
  reviewCount: 150,
};

export function generateSEO(config: SEOConfig): Metadata {
  const {
    title = defaultSEO.title,
    description = defaultSEO.description,
    keywords = defaultSEO.keywords,
    author = defaultSEO.author,
    type = defaultSEO.type,
    image = defaultSEO.image,
    imageAlt = defaultSEO.imageAlt,
    url = '/',
    publishedTime,
    modifiedTime,
    category,
    tags = [],
    price,
    availability,
    noIndex = false,
    noFollow = false,
  } = config;

  // Generate dynamic OpenGraph image URL if not provided
  const ogImageUrl = image?.startsWith('/')
    ? `${baseUrl}${image}`
    : image ||
      `${baseUrl}/api/og?title=${encodeURIComponent(title!)}&description=${encodeURIComponent(description!)}`;

  const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title,
    description,
    keywords: keywords?.join(', '),
    authors: [{ name: author! }],
    creator: author,
    publisher: 'Destino SF',
    category,

    // OpenGraph
    openGraph: {
      type: type === 'article' ? 'article' : 'website',
      locale: 'en_US',
      url: url === '/' ? baseUrl : `${baseUrl}${url}`,
      siteName: 'Destino SF',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      site: '@destinosf',
      creator: '@destinosf',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },

    // Additional meta tags
    other: {
      'og:site_name': 'Destino SF',
      'og:locale': 'en_US',
      'og:type': type || 'website',
      'theme-color': '#f77c22',
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'og:image': ogImageUrl,
      'og:image:secure_url': ogImageUrl,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/jpeg',
      'og:image:alt': imageAlt || 'Destino SF - Handcrafted Empanadas & Alfajores',

      // Restaurant-specific metadata
      ...(type === 'restaurant' && {
        'business:contact_data:street_address': '377 Corbett Avenue',
        'business:contact_data:locality': 'San Francisco',
        'business:contact_data:region': 'CA',
        'business:contact_data:postal_code': '94114',
        'business:contact_data:country_name': 'United States',
        'business:contact_data:email': 'james@destinosf.com',
        'business:contact_data:phone_number': '+1-415-525-4448',
        'business:contact_data:website': baseUrl,
        'place:location:latitude': '37.7596',
        'place:location:longitude': '-122.4385',
      }),

      // Product-specific metadata
      ...(type === 'product' &&
        price && {
          'product:price:amount': price,
          'product:price:currency': 'USD',
          'product:availability': availability || 'in_stock',
        }),

      // SEO directives
      ...(noIndex && { robots: 'noindex' }),
      ...(noFollow && { robots: 'nofollow' }),
      ...(noIndex && noFollow && { robots: 'noindex, nofollow' }),
    },

    // Schema.org structured data will be added via generateStructuredData function
  };

  return metadata;
}

export function generateStructuredData(config: SEOConfig): object {
  const {
    title = defaultSEO.title,
    description = defaultSEO.description,
    type = defaultSEO.type,
    image = defaultSEO.image,
    url = '/',
    publishedTime,
    modifiedTime,
    author = defaultSEO.author,
    price,
    availability,
    cuisine = defaultSEO.cuisine,
    rating = defaultSEO.rating,
    reviewCount = defaultSEO.reviewCount,
  } = config;

  const baseStructure = {
    '@context': 'https://schema.org',
    '@type': type === 'product' ? 'Product' : type === 'article' ? 'Article' : 'Restaurant',
    name: title,
    description,
    image: image?.startsWith('/') ? `${baseUrl}${image}` : image,
    url: url === '/' ? baseUrl : `${baseUrl}${url}`,
  };

  // Restaurant-specific structured data
  if (type === 'restaurant') {
    return {
      ...baseStructure,
      '@type': 'Restaurant',
      servesCuisine: cuisine,
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
        latitude: '37.7596',
        longitude: '-122.4385',
      },
      telephone: '+1-415-525-4448',
      email: 'james@destinosf.com',
      openingHours: ['Mo-Fr 08:00-18:00', 'Sa 09:00-17:00', 'Su 09:00-16:00'],
      ...(rating &&
        reviewCount && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            reviewCount: reviewCount,
          },
        }),
      priceRange: '$$',
      hasMenu: `${baseUrl}/menu`,
      acceptsReservations: true,
    };
  }

  // Product-specific structured data
  if (type === 'product') {
    return {
      ...baseStructure,
      '@type': 'Product',
      brand: {
        '@type': 'Brand',
        name: 'Destino SF',
      },
      manufacturer: {
        '@type': 'Organization',
        name: 'Destino SF',
      },
      offers: {
        '@type': 'Offer',
        price: price,
        priceCurrency: 'USD',
        availability:
          availability === 'in_stock'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'Destino SF',
        },
      },
      ...(rating &&
        reviewCount && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            reviewCount: reviewCount,
          },
        }),
    };
  }

  // Article-specific structured data
  if (type === 'article') {
    return {
      ...baseStructure,
      '@type': 'Article',
      author: {
        '@type': 'Person',
        name: author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Destino SF',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo/logo-destino.png`,
        },
      },
      ...(publishedTime && { datePublished: publishedTime }),
      ...(modifiedTime && { dateModified: modifiedTime }),
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url === '/' ? baseUrl : `${baseUrl}${url}`,
      },
    };
  }

  return baseStructure;
}

export function generatePageSEO(
  pageType: 'home' | 'menu' | 'catering' | 'about' | 'contact' | 'product' | 'article',
  customConfig?: Partial<SEOConfig>
): Metadata {
  const pageConfigs = {
    home: {
      title: 'Destino SF - Authentic Handcrafted Empanadas & Alfajores',
      description:
        'Experience authentic Latin flavors with our handcrafted empanadas and alfajores. Premium catering services available in San Francisco.',
      keywords: [
        'empanadas',
        'alfajores',
        'latin food',
        'catering',
        'san francisco',
        'handcrafted',
        'authentic',
      ],
      type: 'website' as const,
      url: '/',
    },
    menu: {
      title: 'Our Menu - Authentic Empanadas & Alfajores | Destino SF',
      description:
        'Explore our delicious selection of handcrafted empanadas and alfajores. Traditional recipes with premium ingredients.',
      keywords: [
        'menu',
        'empanadas',
        'alfajores',
        'food menu',
        'latin cuisine',
        'traditional recipes',
      ],
      type: 'restaurant' as const,
      url: '/menu',
    },
    catering: {
      title: 'Catering Services - Premium Latin Cuisine | Destino SF',
      description:
        'Elevate your event with our premium catering services. Authentic empanadas, alfajores, and Latin cuisine for any occasion.',
      keywords: [
        'catering',
        'event catering',
        'corporate catering',
        'latin catering',
        'empanadas catering',
        'sf catering',
      ],
      type: 'restaurant' as const,
      url: '/catering',
    },
    about: {
      title: 'About Us - Our Story & Mission | Destino SF',
      description:
        'Learn about our passion for authentic Latin cuisine and our commitment to bringing traditional flavors to San Francisco.',
      keywords: [
        'about',
        'story',
        'mission',
        'latin cuisine',
        'authentic food',
        'san francisco restaurant',
      ],
      type: 'website' as const,
      url: '/about',
    },
    contact: {
      title: 'Contact Us - Get in Touch | Destino SF',
      description:
        "Get in touch with us for orders, catering inquiries, or any questions. We're here to help bring authentic Latin flavors to your table.",
      keywords: ['contact', 'get in touch', 'orders', 'catering inquiries', 'location', 'hours'],
      type: 'website' as const,
      url: '/contact',
    },
    product: {
      title: 'Premium Latin Products | Destino SF',
      description:
        'Discover our premium selection of handcrafted empanadas and alfajores made with traditional recipes and finest ingredients.',
      keywords: [
        'products',
        'empanadas',
        'alfajores',
        'latin food',
        'handcrafted',
        'premium ingredients',
      ],
      type: 'product' as const,
      url: '/products',
    },
    article: {
      title: 'Latest News & Updates | Destino SF',
      description: 'Stay updated with the latest news, recipes, and stories from Destino SF.',
      keywords: ['news', 'updates', 'recipes', 'blog', 'latin cuisine', 'cooking tips'],
      type: 'article' as const,
      url: '/blog',
    },
  };

  const config = { ...pageConfigs[pageType], ...customConfig };
  return generateSEO(config);
}
