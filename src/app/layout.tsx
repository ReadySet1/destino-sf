import './styles/globals.css';
import ClientLayout from './client-layout';
import { Metadata, Viewport } from 'next';
import { Inter, Quicksand, Great_Vibes } from 'next/font/google';
import Script from 'next/script';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-quicksand',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-great-vibes',
});

const baseUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://destino-sf-ready-set.vercel.app';

// Add viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#ffffff' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Destino SF',
  description: 'Handcrafted Empanadas & Alfajores',
  themeColor: '#004225',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Destino SF',
    title: 'Destino SF',
    description: 'Handcrafted Empanadas & Alfajores',
    images: [
      {
        url: '/opengraph-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Destino SF - Handcrafted Empanadas & Alfajores',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destino SF',
    description: 'Handcrafted Empanadas & Alfajores',
    creator: '@destinosf',
    images: [
      {
        url: '/twitter-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Destino SF - Handcrafted Empanadas & Alfajores',
      },
    ],
  },
  other: {
    'og:site_name': 'Destino SF',
    'og:locale': 'en_US',
    'og:type': 'website',
    'theme-color': '#ffffff', // Updated from #004225 to match background
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'og:image': `${baseUrl}/opengraph-image.jpg`,
    'og:image:secure_url': `${baseUrl}/opengraph-image.jpg`,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:type': 'image/jpeg',
    'og:image:alt': 'Destino SF - Handcrafted Empanadas & Alfajores',
    'og:title': 'Destino SF',
    'og:description': 'Handcrafted Empanadas & Alfajores',
  },
  verification: {
    other: {
      'msvalidate.01': '',
      'yandex-verification': '',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${quicksand.variable} ${greatVibes.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ClientLayout>{children}</ClientLayout>
        <Script
          src="https://analytics.readysetllc.com/script.js"
          data-website-id="5a0ae847-dbb0-456c-b972-9e29944de4b2"
        />
      </body>
    </html>
  );
}
