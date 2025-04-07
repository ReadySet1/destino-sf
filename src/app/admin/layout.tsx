// src/app/admin/layout.tsx
'use client'; // Make this a Client Component to use hooks

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Archive, Tag, ShoppingBag, Settings, Users, Clock } from 'lucide-react'; // Added missing icons
import { MobileMenu } from './components/MobileMenu'; // Ensure path is correct

// Authentication and authorization checks (Supabase, Prisma) MUST be performed
// before rendering this component, likely in a parent Server Component,
// middleware, or via client-side checks if appropriate for your app.
// This component now assumes the user is authorized.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation (pathname change)
  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Only run when pathname changes

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // --- Dynamic Classes ---
  const sidebarBaseClasses =
    'fixed inset-y-0 left-0 z-40 w-64 bg-gray-50 border-r transition-transform duration-300 ease-in-out flex flex-col'; // Added flex flex-col
  const sidebarMobileClosed = '-translate-x-full';
  const sidebarMobileOpen = 'translate-x-0';
  const sidebarDesktopClasses = 'md:translate-x-0'; // Keep visible on desktop

  const sidebarClasses = `${sidebarBaseClasses} ${isSidebarOpen ? sidebarMobileOpen : sidebarMobileClosed} ${sidebarDesktopClasses}`;

  const backdropClasses = `fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ease-in-out ${
    isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
  }`;

  const mainContentBaseClasses = 'flex-1 transition-all duration-300 ease-in-out';
  const mainContentDesktopMargin = 'md:ml-64'; // Apply margin only on desktop

  const mainContentClasses = `${mainContentBaseClasses} ${mainContentDesktopMargin}`;

  return (
    <div className="flex min-h-screen bg-white">
      {' '}
      {/* Ensure parent has flex */}
      {/* Mobile Menu Buttons (Positioned Fixed) */}
      <MobileMenu isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      {/* Backdrop overlay (Mobile only) */}
      <div
        id="sidebar-backdrop"
        className={backdropClasses}
        onClick={closeSidebar} // Close sidebar when clicking backdrop
        aria-hidden="true"
      />
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={sidebarClasses}
        aria-label="Admin sidebar" // Add aria-label for accessibility
      >
        {/* Sidebar Content */}
        <div className="p-6 border-b">
          {' '}
          {/* Added border-b */}
          <Link href="/" className="text-xl font-bold text-gray-800 hover:text-gray-900">
            Destino SF
          </Link>
        </div>
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {' '}
          {/* Added flex-1 and overflow */}
          <ul className="space-y-2">
            <NavItem
              href="/admin"
              label="Dashboard"
              icon={<Home size={18} />}
              currentPath={pathname}
            />
            <NavItem
              href="/admin/orders"
              label="Orders"
              icon={<ShoppingBag size={18} />}
              currentPath={pathname}
            />
            <NavItem
              href="/admin/products"
              label="Products"
              icon={<Archive size={18} />}
              currentPath={pathname}
            />
            <NavItem
              href="/admin/categories"
              label="Categories"
              icon={<Tag size={18} />}
              currentPath={pathname}
            />
            <NavItem
              href="/admin/users"
              label="Users"
              icon={<Users size={18} />}
              currentPath={pathname}
            />
            <NavItem
              href="/admin/settings"
              label="Settings"
              icon={<Settings size={18} />}
              currentPath={pathname}
            />
            <NavItem
              href="/admin/hours"
              label="Business Hours"
              icon={<Clock size={18} />}
              currentPath={pathname}
            />
          </ul>
        </nav>
        <div className="px-4 py-4 mt-auto border-t">
          {' '}
          {/* Added border-t */}
          {/* Ensure the sign-out action works correctly in Client Components */}
          {/* Might need adjustment depending on how Supabase auth is handled client-side */}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-left text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>
      {/* Main content area */}
      <div className={mainContentClasses}>
        {/* Add padding top to prevent content going under potential fixed header */}
        {/* Adjust pt-16 based on your mobile header/button height if needed */}
        <main className="p-4 md:p-8 pt-16 md:pt-8">{children}</main>
      </div>
    </div>
  );
}

// NavItem component - Added active state based on pathname
function NavItem({
  href,
  label,
  icon,
  currentPath,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  currentPath: string;
}) {
  const isActive = currentPath === href;
  const activeClasses = 'bg-gray-200 text-gray-900';
  const inactiveClasses = 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${isActive ? activeClasses : inactiveClasses}`} // Adjusted styling
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
}
