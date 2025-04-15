import { Inter, Quicksand, Great_Vibes } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ThemeSwitcher } from '@/components/theme-switcher';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartAlert } from '@/components/ui/cart-alert';
import './styles/globals.css';
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destino SF',
    description: 'Handcrafted Empanadas & Alfajores',
    creator: '@destinosf',
  },
  other: {
    'og:site_name': 'Destino SF',
    'og:locale': 'en_US',
    'og:type': 'website',
    // Discord specific meta tags
    'theme-color': '#004225', // Your brand color
    // WhatsApp specific meta tags
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:type': 'image/jpeg',
  },
  // Ensure verification for various platforms
  verification: {
    other: {
      'msvalidate.01': '', // Bing verification (if needed)
      'yandex-verification': '', // Yandex verification (if needed)
    }
  },
};

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'], // Light, Regular, Medium and Bold
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${quicksand.variable} ${greatVibes.variable} font-sans`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <CartAlert />
          {/* Theme switcher positioned in top-right corner of footer */}
          <div className="fixed sm:bottom-4 sm:right-4 bottom-8 right-4 z-50">
            <ThemeSwitcher />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
