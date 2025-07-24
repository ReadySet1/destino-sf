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
      href: '/admin',
      label: 'Dashboard',
      icon: <Home className="h-4 w-4" />,
    },
    {
      href: '/admin/orders',
      label: 'Orders',
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      href: '/admin/products',
      label: 'Products',
      icon: <Archive className="h-4 w-4" />,
    },
    {
      href: '/admin/categories',
      label: 'Categories',
      icon: <Tag className="h-4 w-4" />,
    },
    {
      href: '/admin/sync',
      label: 'Product Sync',
      icon: <RefreshCw className="h-4 w-4" />,
    },
    {
      href: '/admin/catering',
      label: 'Catering',
      icon: <UtensilsCrossed className="h-4 w-4" />,
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: <Users className="h-4 w-4" />,
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
    },
    {
      href: '/admin/shipping',
      label: 'Shipping Config',
      icon: <Truck className="h-4 w-4" />,
    },
    {
      href: '/admin/spotlight-picks',
      label: 'Spotlight Picks',
      icon: <Star className="h-4 w-4" />,
    },
  ];

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="bg-gray-50">
      <SidebarHeader className="p-6 border-b border-gray-200">
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
      
      <SidebarContent className="px-4 py-4">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="px-4 py-4 border-t border-gray-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem disabled>
                  <span className="text-xs text-muted-foreground">ID: {user.id}</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <span className="text-xs">Role: {profileRole}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={signOutAction}>
                    <button type="submit" className="w-full text-left flex items-center gap-2">
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