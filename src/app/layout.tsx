import { Inter, Quicksand, Great_Vibes } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ThemeSwitcher } from '@/components/theme-switcher';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartAlert } from '@/components/ui/cart-alert';
import './styles/globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Destino SF',
  description: 'Your favorite San Francisco restaurant',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Destino SF',
    title: 'Destino SF',
    description: 'Your favorite San Francisco restaurant',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/og`,
        width: 1200,
        height: 630,
        alt: 'Destino SF',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Destino SF',
    description: 'Your favorite San Francisco restaurant',
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/og`],
  },
  other: {
    'og:site_name': 'Destino SF',
    'og:locale': 'en_US',
    'og:type': 'website',
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
