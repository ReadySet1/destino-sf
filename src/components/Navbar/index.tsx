'use client';

import Link from 'next/link';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const { items, totalItems } = useCartStore();
  
  // Wait until after hydration to show the cart count
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('Cart items:', items);
    console.log('Total items:', totalItems);
  }, [items, totalItems]);

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold">
                Destino SF
              </Link>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/products/category/alfajores" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Our Alfajores
              </Link>
              <Link href="/catering" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Our Catering
              </Link>
              <Link href="/products/category/empanadas" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Our Empanadas
              </Link>
              <Link href="/contact-about" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Contact / About
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <Search className="h-6 w-6" />
            </button>
            <Link href="/cart" className="p-2 text-gray-400 hover:text-gray-500 relative">
              <ShoppingCart className="h-6 w-6" />
              {mounted && items.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white">
                  {items.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </Link>
            <Link href="/account" className="p-2 text-gray-400 hover:text-gray-500">
              <User className="h-6 w-6" />
            </Link>
            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetTitle className="text-lg font-bold mb-4">
                    Menu
                  </SheetTitle>
                  <nav className="flex flex-col space-y-4">
                    <Link href="/alfajores" className="text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100">
                      Our Alfajores
                    </Link>
                    <Link href="/catering" className="text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100">
                      Our Catering
                    </Link>
                    <Link href="/empanadas" className="text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100">
                      Our Empanadas
                    </Link>
                    <Link href="/contact-about" className="text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100">
                      Contact / About
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 