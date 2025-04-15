'use client';
import { Inter, Quicksand, Great_Vibes } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { ThemeSwitcher } from '@/components/theme-switcher';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartAlert } from '@/components/ui/cart-alert';
import { Toaster } from 'sonner';
import './styles/globals.css';
import { usePathname } from 'next/navigation';

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

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

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
            {!isAdminRoute && <Navbar />}
            <main className={`flex-1 ${!isAdminRoute ? 'pt-2' : ''}`}>{children}</main>
            {!isAdminRoute && <Footer />}
            {!isAdminRoute && <CartAlert />}
          </div>
          {/* Theme switcher positioned in top-right corner of footer */}
          <div className="fixed sm:bottom-4 sm:right-4 bottom-8 right-4 z-50">
            <ThemeSwitcher />
          </div>
          
          {/* Global Toaster for all pages */}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
} 