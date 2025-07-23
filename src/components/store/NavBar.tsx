import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartIcon } from '../Layout/CartIcon';

export function NavBar() {
  const pathname = usePathname();

  // Define navigation items
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Menu', href: '/menu' },
    { name: 'Catering', href: '/catering' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="font-bold text-xl text-gray-900">
            Destino SF
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6">
            {navItems.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-gray-600 hover:text-blue-600 ${
                  pathname === item.href ? 'font-medium text-blue-600' : ''
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Cart Icon */}
          <div className="flex items-center space-x-4">
            <CartIcon />
          </div>
        </div>
      </div>
    </nav>
  );
}
