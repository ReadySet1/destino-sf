'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User, Menu } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { items, totalItems } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('Cart items:', items);
    console.log('Total items:', totalItems);
  }, [items, totalItems]);

  const closeSheet = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-20 items-center">
          {/* Desktop Logo - Centered on desktop */}
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
            <Link href="/" className="flex items-center transition-transform hover:scale-105">
              <Image
                src="/images/logo/logo-destino.png"
                alt="Destino SF Logo"
                width={600}
                height={300}
                priority
                className="h-14 w-auto sm:h-22"
              />
            </Link>
          </div>

          {/* Mobile Logo - Centered on mobile */}
          <div className="absolute left-1/2 transform -translate-x-1/2 md:hidden">
            <Link href="/" className="flex items-center transition-transform hover:scale-105">
              <Image
                src="/images/logo/logo-destino.png"
                alt="Destino SF Logo"
                width={600}
                height={300}
                priority
                className="h-14 w-auto"
              />
            </Link>
          </div>

          {/* Mobile navigation icons */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Placeholder for left side on mobile */}
          </div>

          {/* Mobile Right Side Icons */}
          <div className="flex items-center gap-1 md:hidden ml-auto">
            <Link
              href="/cart"
              className="relative flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {mounted && items.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {items.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </div>
            </Link>
            <Link
              href="/account"
              className="hidden md:flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200"
            >
              <User className="h-6 w-6" />
            </Link>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="flex items-center bg-transparent hover:bg-slate-100 text-foreground hover:text-primary transition-all duration-200 rounded-lg p-2"
                >
                  <Menu className="h-7 w-7" strokeWidth={2.5} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[320px] p-0 border-l border-border/50 bg-card shadow-none"
              >
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <SheetTitle className="text-xl font-bold text-foreground">
                    <Image
                      src="/images/logo/logo-destino.png"
                      alt="Destino SF Logo"
                      width={250}
                      height={100}
                      className="h-auto w-auto"
                    />
                  </SheetTitle>
                </div>
                <div className="px-6 py-8 flex flex-col h-[calc(100%-80px)]">
                  <nav className="flex-1">
                    <div className="space-y-1">
                      <Link
                        href="/"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Home
                        </span>
                      </Link>
                      <Link
                        href="/menu"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Menu
                        </span>
                      </Link>
                      <Link
                        href="/catering"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Catering
                        </span>
                      </Link>
                      <Link
                        href="/about"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          About Us
                        </span>
                      </Link>
                      <Link
                        href="/contact"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Contact Us
                        </span>
                      </Link>
                    </div>
                  </nav>
                  <div className="mt-auto pt-6 w-full">
                    <div className="fixed bottom-0 right-0 bg-card border-t border-border/50 py-3 px-4 flex justify-center items-center w-[320px] md:hidden">
                      <Link
                        href="/account"
                        onClick={closeSheet}
                        className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200"
                      >
                        <User className="h-6 w-6 mb-1" />
                        <span className="text-xs">Account</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Cart, Account and Menu Icons */}
          <div className="hidden md:flex items-center gap-4 ml-auto">
            <Link
              href="/cart"
              className="relative flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {mounted && items.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {items.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </div>
            </Link>
            <Link
              href="/account"
              className="hidden md:flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200"
            >
              <User className="h-6 w-6" />
            </Link>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="flex items-center bg-transparent hover:bg-slate-100 text-foreground hover:text-primary transition-all duration-200 rounded-lg p-2"
                >
                  <Menu className="h-10 w-10" strokeWidth={2.5} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[320px] p-0 border-l border-border/50 bg-card shadow-none"
              >
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <SheetTitle className="text-xl font-bold text-foreground">
                    <Image
                      src="/images/logo/logo-destino.png"
                      alt="Destino SF Logo"
                      width={250}
                      height={100}
                      className="h-auto w-auto"
                    />
                  </SheetTitle>
                </div>
                <div className="px-6 py-8 flex flex-col h-[calc(100%-80px)]">
                  <nav className="flex-1">
                    <div className="space-y-1">
                      <Link
                        href="/"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Home
                        </span>
                      </Link>
                      <Link
                        href="/menu"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Menu
                        </span>
                      </Link>
                      <Link
                        href="/catering"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Catering
                        </span>
                      </Link>
                      <Link
                        href="/about"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          About Us
                        </span>
                      </Link>
                      <Link
                        href="/contact"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                          Contact Us
                        </span>
                      </Link>
                    </div>
                  </nav>
                  <div className="mt-auto pt-6 w-full">
                    <div className="fixed bottom-0 right-0 bg-card border-t border-border/50 py-3 px-4 flex justify-center items-center w-[320px] md:hidden">
                      <Link
                        href="/account"
                        onClick={closeSheet}
                        className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200"
                      >
                        <User className="h-6 w-6 mb-1" />
                        <span className="text-xs">Account</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
