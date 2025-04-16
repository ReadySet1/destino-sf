
import './styles/globals.css';
import ClientLayout from './client-layout';
import { Metadata } from 'next';



const baseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://destino-sf-ready-set.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Destino SF',
  description: 'Handcrafted Empanadas & Alfajores',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Destino SF',
    title: 'Destino SF',
    description: 'Handcrafted Empanadas & Alfajores',
    images: [{
      url: '/opengraph-image.jpg',
      width: 1200,
      height: 630,
      alt: 'Destino SF - Handcrafted Empanadas & Alfajores'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destino SF',
    description: 'Handcrafted Empanadas & Alfajores',
    creator: '@destinosf',
    images: [{
      url: '/twitter-image.jpg',
      width: 1200,
      height: 630,
      alt: 'Destino SF - Handcrafted Empanadas & Alfajores'
    }],
  },
  other: {
    'og:site_name': 'Destino SF',
    'og:locale': 'en_US',
    'og:type': 'website',
    'theme-color': '#004225',
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
    }
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return <ClientLayout>{children}</ClientLayout>;
}
