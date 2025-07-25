// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { logger } from '@/utils/logger';
import { ResponsivePageHeader } from '@/components/ui/responsive-page-header';

export default async function AdminDashboard() {
  // Create the Supabase client for authentication
  const supabase = await createClient();

  // Fetch the user from Supabase auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('No user found, redirecting to sign-in');
    return redirect('/sign-in');
  }

  // Default values in case profile check fails
  let profileRole = 'No profile';
  let isUserAdmin = false;

  try {
    logger.debug('Looking up profile for user ID:', user.id);

    // Verify database connection
    try {
      await prisma.$connect();
      logger.debug('Database connection verified');
    } catch (connErr) {
      logger.error('Database connection failed:', connErr);
      return redirect('/');
    }

    // Get the profile with minimal fields needed
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    logger.debug('Profile data:', profile);

    if (!profile) {
      logger.warn('No profile found for user ID:', user.id);
      return redirect('/');
    }

    // Stringified role comparison - works with any type of enum
    profileRole = String(profile.role || '');
    logger.debug('Raw role value:', profileRole, 'Type:', typeof profile.role);

    // Check for ADMIN in any form, case-insensitive
    isUserAdmin = profileRole.toUpperCase().includes('ADMIN');
    logger.debug('Is admin check result:', isUserAdmin);

    if (!isUserAdmin) {
      logger.warn("User doesn't have admin role");
      return redirect('/');
    }
  } catch (error) {
    logger.error('Error in admin access check:', error);
    return redirect('/');
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <ResponsivePageHeader
        title="Admin Dashboard"
        subtitle="Manage your store operations and settings"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <DashboardCard title="Orders" href="/admin/orders" description="Manage customer orders" />
        <DashboardCard
          title="Manual Orders"
          href="/admin/orders/manual"
          description="Create and manage manual orders (cash only)"
        />
        <DashboardCard
          title="Products"
          href="/admin/products"
          description="Manage store products"
        />
        <DashboardCard
          title="Categories"
          href="/admin/categories"
          description="Manage product categories"
        />
        <DashboardCard
          title="Settings"
          href="/admin/settings"
          description="Configure store settings"
        />
        <DashboardCard
          title="Shipping Config"
          href="/admin/shipping"
          description="Manage shipping weight calculations"
        />
        <DashboardCard title="Users" href="/admin/users" description="Manage user accounts" />
        {/* <DashboardCard title="Business Hours" href="/admin/hours" description="Set store hours" /> */}
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  href,
  description,
}: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 md:p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 group"
    >
      <h5 className="mb-2 text-lg md:text-xl font-bold tracking-tight text-gray-900 group-hover:text-gray-700">
        {title}
      </h5>
      <p className="text-sm md:text-base text-gray-600 group-hover:text-gray-500">
        {description}
      </p>
    </Link>
  );
}
