'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  Archive,
  Tag,
  ShoppingBag,
  Settings,
  Users,
  Clock,
  UtensilsCrossed,
  Truck,
  Star,
  RefreshCw,
  User2,
  ChevronUp,
  LogOut,
  Plus,
  Image as ImageIcon,
  ArrowUpDown,
} from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminSidebarProps {
  user: {
    id: string;
    email: string;
  };
  profileRole: string;
}

export function AdminSidebar({ user, profileRole }: AdminSidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      section: 'Overview',
      items: [
        {
          href: '/admin',
          label: 'Dashboard',
          icon: <Home className="h-4 w-4" />,
          description: 'Admin overview & analytics'
        },
      ]
    },
    {
      section: 'Orders & Sales',
      items: [
        {
          href: '/admin/orders',
          label: 'Orders',
          icon: <ShoppingBag className="h-4 w-4" />,
          description: 'Manage customer orders'
        },
        {
          href: '/admin/orders/manual',
          label: 'Manual Orders',
          icon: <Plus className="h-4 w-4" />,
          description: 'Create manual orders'
        },
      ]
    },
    {
      section: 'Catalog Management',
      items: [
        {
          href: '/admin/products',
          label: 'Products',
          icon: <Archive className="h-4 w-4" />,
          description: 'Manage product catalog'
        },
        {
          href: '/admin/products/new',
          label: 'Add Product',
          icon: <Plus className="h-4 w-4" />,
          description: 'Create new product'
        },
        {
          href: '/admin/products/order',
          label: 'Product Order',
          icon: <ArrowUpDown className="h-4 w-4" />,
          description: 'Arrange product display'
        },
        {
          href: '/admin/categories',
          label: 'Categories',
          icon: <Tag className="h-4 w-4" />,
          description: 'Organize products'
        },
        {
          href: '/admin/square-sync',
          label: 'Product Sync',
          icon: <RefreshCw className="h-4 w-4" />,
          description: 'Sync with Square catalog'
        },
      ]
    },
    {
      section: 'User Management',
      items: [
        {
          href: '/admin/users',
          label: 'Users',
          icon: <Users className="h-4 w-4" />,
          description: 'Manage user accounts'
        },
        {
          href: '/admin/users/new',
          label: 'Add User',
          icon: <Plus className="h-4 w-4" />,
          description: 'Create new user'
        },
      ]
    },
    {
      section: 'Configuration',
      items: [
        {
          href: '/admin/settings',
          label: 'Store Settings',
          icon: <Settings className="h-4 w-4" />,
          description: 'Configure store options'
        },
        {
          href: '/admin/shipping',
          label: 'Shipping Config',
          icon: <Truck className="h-4 w-4" />,
          description: 'Manage shipping settings'
        },
        {
          href: '/admin/spotlight-picks',
          label: 'Spotlight Picks',
          icon: <Star className="h-4 w-4" />,
          description: 'Featured products'
        },
      ]
    }
  ];

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="bg-white border-r border-gray-200">
      <SidebarHeader className="px-6 py-8 border-b border-gray-100">
        <Link href="/" aria-label="Destino SF Home" className="block relative">
          <Image
            src="/images/logo/logo-destino.png"
            alt="Destino SF Logo"
            width={150}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <span className="sr-only">Destino SF</span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-6">
        <div className="space-y-8">
          {navigationItems.map((section) => (
            <div key={section.section} className="space-y-3">
              <div className="px-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.section}
                </h2>
              </div>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href} className="group">
                          <div className="flex items-center w-full">
                            <div className={`mr-3 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-900'}`}>
                                {item.label}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          ))}
        </div>
      </SidebarContent>
      
      <SidebarFooter className="px-4 py-6 border-t border-gray-100 bg-gray-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:bg-gray-100">
                  <div className="flex items-center w-full">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <User2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {profileRole}
                      </div>
                    </div>
                    <ChevronUp className="ml-auto h-4 w-4 text-gray-400" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem disabled>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500">ID: {user.id}</p>
                    <p className="text-xs text-gray-500">Role: {profileRole}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={signOutAction}>
                    <button type="submit" className="w-full text-left flex items-center gap-2 text-red-600 hover:text-red-700">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
} 