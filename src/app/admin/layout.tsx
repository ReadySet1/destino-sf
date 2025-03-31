import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Home, Archive, Tag, ShoppingBag } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if user has admin role
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile || profile.role !== "ADMIN") {
    return redirect("/");
  }

  // Navigation icons for reference but used directly in NavItem component
  const _navigation = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Products', href: '/admin/products', icon: Archive },
    { name: 'Categories', href: '/admin/categories', icon: Tag },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r">
        <div className="p-6">
          <h2 className="text-xl font-bold">Destino SF</h2>
        </div>
        <nav className="px-4 py-2">
          <ul className="space-y-2">
            <NavItem href="/admin" label="Dashboard" icon={<Home size={18} />} />
            <NavItem href="/admin/orders" label="Orders" icon={<ShoppingBag size={18} />} />
            <NavItem href="/admin/products" label="Products" icon={<Archive size={18} />} />
            <NavItem href="/admin/categories" label="Categories" icon={<Tag size={18} />} />
            <NavItem href="/admin/users" label="Users" />
            <NavItem href="/admin/settings" label="Settings" />
            <NavItem href="/admin/hours" label="Business Hours" />
          </ul>
        </nav>
        <div className="px-4 py-6 mt-auto">
          <form action="/auth/sign-out" method="post">
            <button 
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <li>
      <Link 
        href={href}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
      >
        {icon}
        {label}
      </Link>
    </li>
  );
} 