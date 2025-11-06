import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_APP_URL || 'https://destinosf.com';

  // Determine if this is a development/staging environment
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    baseUrl.includes('development.') ||
    baseUrl.includes('staging.') ||
    baseUrl.includes('localhost');

  // Block ALL crawlers on development/staging domains
  if (isDevelopment) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // Production rules - allow crawling with restrictions
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/protected/',
          '/admin-setup/',
          '/admin-debug/',
          '/test-*',
          '/prisma-demo/',
          '/email-sender/',
          '/studio/',
          '/_next/',
          '/checkout/success',
          '/checkout/cancel',
          '/payment/',
          '/refund/',
          '/account/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'Google-Extended',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap-index.xml`,
    host: baseUrl,
  };
}
