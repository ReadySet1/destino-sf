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
  const { items, totalItems } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log("Cart items:", items);
    console.log("Total items:", totalItems);
  }, [items, totalItems]);

  return (
    <nav className="border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Sección izquierda - Logo (Siempre visible) y Enlaces de navegación (Desktop) */}
          <div className="flex items-center w-full sm:w-auto">
            {" "}
            {/* Removed justify-between */}
            {/* Logo - Izquierda en desktop, centrado en móvil */}
            <div className="flex justify-center sm:justify-start sm:mr-8 w-full sm:w-auto">
              {" "}
              {/* Added justify-center and w-full on mobile */}
              <Link href="/" className="flex items-center">
                <Image
                  src="/images/logo/logo-destino.png"
                  alt="Destino SF Logo"
                  width={120}
                  height={40}
                  priority
                />
              </Link>
            </div>
            {/* Enlaces de navegación (Desktop) */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/products/category/alfajores"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-gray-900 hover:border-gray-300"
              >
                Our Alfajores
              </Link>
              <Link
                href="/catering"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-gray-900 hover:border-gray-300"
              >
                Our Catering
              </Link>
              <Link
                href="/products/category/empanadas"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-gray-900 hover:border-gray-300"
              >
                Our Empanadas
              </Link>
              <Link
                href="/contact-about"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-gray-900 hover:border-gray-300"
              >
                Contact / About
              </Link>
            </div>
          </div>

          {/* Sección derecha - Iconos (Siempre visible) */}
          <div className="flex items-center space-x-4">
            <button className="hidden p-2 text-gray-400 hover:text-gray-500 sm:inline-flex">
              <Search className="h-6 w-6" />
            </button>
            <Link
              href="/cart"
              className="relative hidden p-2 text-gray-400 hover:text-gray-500 sm:inline-flex"
            >
              <ShoppingCart className="h-6 w-6" />
              {mounted && items.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white">
                  {items.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="hidden p-2 text-gray-400 hover:text-gray-500 sm:inline-flex"
            >
              <User className="h-6 w-6" />
            </Link>

            {/* Menú móvil */}
            <div className="sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open menu"
                    className="text-black"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] bg-black sm:w-[400px]"
                >
                  <SheetTitle className="mb-4 text-lg font-bold text-white">
                    Menu
                  </SheetTitle>
                  <nav className="flex flex-col space-y-4">
                    <Link
                      href="/products/category/alfajores"
                      className="rounded-md px-3 py-2 text-white hover:bg-gray-800"
                    >
                      Our Alfajores
                    </Link>
                    <Link
                      href="/catering"
                      className="rounded-md px-3 py-2 text-white hover:bg-gray-800"
                    >
                      Our Catering
                    </Link>
                    <Link
                      href="/products/category/empanadas"
                      className="rounded-md px-3 py-2 text-white hover:bg-gray-800"
                    >
                      Our Empanadas
                    </Link>
                    <Link
                      href="/contact-about"
                      className="rounded-md px-3 py-2 text-white hover:bg-gray-800"
                    >
                      Contact / About
                    </Link>
                    <div className="mt-4 flex justify-around border-t border-gray-700 pt-4">
                      <Link
                        href="/search"
                        className="p-2 text-white hover:text-gray-300"
                      >
                        <Search className="h-6 w-6" />
                      </Link>
                      <Link
                        href="/cart"
                        className="relative p-2 text-white hover:text-gray-300"
                      >
                        <ShoppingCart className="h-6 w-6" />
                        {mounted && items.length > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white">
                            {items.reduce(
                              (total, item) => total + item.quantity,
                              0
                            )}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/account"
                        className="p-2 text-white hover:text-gray-300"
                      >
                        <User className="h-6 w-6" />
                      </Link>
                    </div>
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
