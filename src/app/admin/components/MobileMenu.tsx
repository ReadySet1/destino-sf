// src/app/admin/components/MobileMenu.tsx
'use client';

import { Menu, X } from "lucide-react";

// Define the props the component expects
interface MobileMenuProps {
  isOpen: boolean;         // State indicating if the sidebar is open
  toggleSidebar: () => void; // Function to call when buttons are clicked
}

export function MobileMenu({ isOpen, toggleSidebar }: MobileMenuProps) {
  return (
    <>
      {/* Mobile Menu Button (Hamburger Icon) */}
      {/* Shown only when the sidebar is closed (!isOpen) */}
      {/* Positioned fixed in the top-right corner for mobile (md:hidden) */}
      {!isOpen && (
        <button
          type="button"
          // Changed left-4 to right-4
          className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-md text-gray-500 bg-white/80 backdrop-blur-sm hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          aria-expanded="false"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Mobile Close Button (X Icon) */}
      {/* Shown only when the sidebar is OPEN (isOpen) */}
      {/* Also positioned fixed in the top-right corner */}
      {isOpen && (
         <button
            type="button"
            // Changed left-4 to right-4
            className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-md text-gray-500 bg-white/80 backdrop-blur-sm hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
            aria-expanded="true"
          >
            <X className="h-6 w-6" aria-hidden="true"/>
          </button>
      )}
    </>
  );
}