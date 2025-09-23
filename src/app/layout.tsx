import './styles/globals.css';
import ClientLayout from './client-layout';
import { Metadata, Viewport } from 'next';
import { Inter, Quicksand, Great_Vibes } from 'next/font/google';
import { UmamiScript } from '@/lib/analytics';

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
    : 'https://development.destinosf.com';

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
  title: {
    default: 'Destino SF - Handcrafted Empanadas & Alfajores',
    template: '%s | Destino SF',
  },
  description:
    'Experience authentic Argentine empanadas and alfajores, handcrafted with love in San Francisco. Order online for pickup or delivery.',
  keywords: ['empanadas', 'alfajores', 'argentine food', 'san francisco', 'catering', 'delivery'],
  authors: [{ name: 'Destino SF' }],
  creator: 'Destino SF',
  publisher: 'Destino SF',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Destino SF',
    title: 'Destino SF - Handcrafted Empanadas & Alfajores',
    description:
      'Experience authentic Argentine empanadas and alfajores, handcrafted with love in San Francisco.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Destino SF - Handcrafted Empanadas & Alfajores',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destino SF - Handcrafted Empanadas & Alfajores',
    description:
      'Experience authentic Argentine empanadas and alfajores, handcrafted with love in San Francisco.',
    creator: '@destinosf',
    images: ['/twitter-image'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon0.svg', type: 'image/svg+xml' },
      { url: '/icon1.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png' }],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: baseUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                navigator.serviceWorker.register('/service-worker.js', { 
                  scope: '/',
                  updateViaCache: 'none'
                })
                  .then(() => console.log('Service Worker registered'))
                  .catch((error) => console.log('Service Worker registration failed:', error));
              }
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ClientLayout>{children}</ClientLayout>
        <UmamiScript strategy="afterInteractive" />
      </body>
    </html>
  );
}
