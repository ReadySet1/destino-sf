'use client';

import { ThemeProvider } from 'next-themes';
import { ThemeSwitcher } from '@/components/theme-switcher';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartAlert } from '@/components/ui/cart-alert';
import { Toaster } from 'sonner';
import './styles/globals.css';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // Check for admin and auth routes
  const isAdminRoute = pathname?.startsWith('/admin');
  const isAuthRoute = pathname === '/sign-in' || 
                      pathname === '/sign-up' || 
                      pathname === '/forgot-password';
  const isProtectedResetPasswordRoute = pathname === '/protected/reset-password';
  
  // Don't show navbar/footer for auth routes, admin routes, or reset password
  const hideNavigation = isAdminRoute || isAuthRoute || isProtectedResetPasswordRoute;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen flex-col">
        {!hideNavigation && <Navbar />}
        <main className={`flex-1 ${!hideNavigation ? 'pt-2' : ''}`}>{children}</main>
        {!hideNavigation && <Footer />}
        {!hideNavigation && <CartAlert />}
      </div>
      
      {/* Theme switcher positioned in top-right corner of footer */}
      {!isAuthRoute && !isProtectedResetPasswordRoute && (
        <div className="fixed sm:bottom-4 sm:right-4 bottom-8 right-4 z-50">
          <ThemeSwitcher />
        </div>
      )}
      
      {/* Global Toaster for all pages */}
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
} 