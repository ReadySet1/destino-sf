"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, User, Search, Menu } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { items, totalItems } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log("Cart items:", items);
    console.log("Total items:", totalItems);
  }, [items, totalItems]);

  const closeSheet = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-20 items-center justify-between">
          {/* Mobile Menu Button - Absolutely positioned on the right */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 sm:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[320px] p-0 border-l border-border/50 bg-card"
              >
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <SheetTitle className="text-xl font-bold text-foreground">
                    <Image
                      src="/images/logo/logo-destino.png"
                      alt="Destino SF Logo"
                      width={100}
                      height={33}
                      className="h-auto w-auto"
                    />
                  </SheetTitle>
                </div>
                
                <div className="px-6 py-8 flex flex-col h-[calc(100%-80px)]">
                  <nav className="flex-1">
                    <div className="space-y-1">
                      <Link
                        href="/menu"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">Menu</span>
                      </Link>
                      <Link
                        href="/products/category/alfajores"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">Our Alfajores</span>
                      </Link>
                      <Link
                        href="/catering"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">Our Catering</span>
                      </Link>
                      <Link
                        href="/products/category/empanadas"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">Our Empanadas</span>
                      </Link>
                      <Link
                        href="/contact-about"
                        onClick={closeSheet}
                        className="flex items-center py-3 px-4 rounded-lg text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
                      >
                        <span className="text-lg font-medium group-hover:translate-x-1 transition-transform">Contact / About</span>
                      </Link>
                    </div>
                  </nav>
                  
                  <div className="mt-auto pt-6 w-full">
                    <div className="fixed bottom-0 right-0 bg-card border-t border-border/50 py-3 px-4 flex justify-around items-center w-[320px]">
                      <Link
                        href="/cart"
                        onClick={closeSheet}
                        className="relative flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200 w-1/2"
                      >
                        <div className="relative">
                          <ShoppingCart className="h-6 w-6 mb-1" />
                          {mounted && items.length > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {items.reduce((total, item) => total + item.quantity, 0)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs">Cart</span>
                      </Link>
                      <Link
                        href="/account"
                        onClick={closeSheet}
                        className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200 w-1/2"
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

          {/* Logo section - Absolutely centered in mobile */}
          <div className="absolute left-1/2 -translate-x-1/2 sm:static sm:left-0 sm:transform-none">
            <Link href="/" className="flex items-center transition-transform hover:scale-105">
              <Image
                src="/images/logo/logo-destino.png"
                alt="Destino SF Logo"
                width={120}
                height={40}
                priority
                className="h-auto w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
            <Link
              href="/menu"
              className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground transition-all duration-200 border-b-2 border-transparent hover:border-primary hover:text-primary"
            >
              Menu
            </Link>

            <Link
              href="/products/category/alfajores"
              className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground transition-all duration-200 border-b-2 border-transparent hover:border-primary hover:text-primary"
            >
              Our Alfajores
            </Link>
            <Link
              href="/catering"
              className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground transition-all duration-200 border-b-2 border-transparent hover:border-primary hover:text-primary"
            >
              Our Catering
            </Link>
            <Link
              href="/products/category/empanadas"
              className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground transition-all duration-200 border-b-2 border-transparent hover:border-primary hover:text-primary"
            >
              Our Empanadas
            </Link>
            <Link
              href="/contact-about"
              className="inline-flex items-center px-1 pt-1 text-sm font-medium text-foreground transition-all duration-200 border-b-2 border-transparent hover:border-primary hover:text-primary"
            >
              Contact / About
            </Link>
          </div>

          {/* Desktop Utility Icons */}
          <div className="hidden sm:flex sm:items-center sm:space-x-6">
            <button className="p-2 text-muted-foreground transition-colors duration-200 hover:text-primary group">
              <Search className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
            <Link
              href="/cart"
              className="relative p-2 text-muted-foreground transition-colors duration-200 hover:text-primary group"
            >
              <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-110" />
              {mounted && items.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-transform duration-200 group-hover:scale-110">
                  {items.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="p-2 text-muted-foreground transition-colors duration-200 hover:text-primary group"
            >
              <User className="h-5 w-5 transition-transform group-hover:scale-110" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
