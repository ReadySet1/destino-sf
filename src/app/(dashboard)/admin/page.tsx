// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { logger } from '@/utils/logger';
import { ResponsivePageHeader } from '@/components/ui/responsive-page-header';
import { ensureUserProfile } from '@/middleware/profile-sync';

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

    // Use the new profile sync middleware to ensure profile exists
    const profileSyncResult = await ensureUserProfile(user.id, user.email);
    
    if (!profileSyncResult.success) {
      logger.error('Failed to ensure user profile:', profileSyncResult.error);
      return redirect('/');
    }

    const profile = profileSyncResult.profile;
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-base text-gray-600 leading-relaxed">
            Manage your store operations and settings
          </p>
        </div>

        <div className="space-y-10">
          {/* Quick Actions */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-indigo-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 text-indigo-600">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Quick Actions</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Most commonly used admin functions
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DashboardCard title="Orders" href="/admin/orders" description="Manage customer orders" />
                <DashboardCard
                  title="Manual Orders"
                  href="/admin/orders/manual"
                  description="Create manual orders"
                />
                <DashboardCard
                  title="Add Product"
                  href="/admin/products/new"
                  description="Add new product to catalog"
                />
                <DashboardCard
                  title="Product Order"
                  href="/admin/products/order"
                  description="Arrange product display order"
                />
              </div>
            </div>
          </div>

          {/* Catalog Management */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 text-blue-600">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Catalog Management</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Manage your product catalog and inventory
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DashboardCard
                  title="Products"
                  href="/admin/products"
                  description="Manage store products"
                />
                <DashboardCard
                  title="Categories"
                  href="/admin/categories"
                  description="Organize product categories"
                />
                <DashboardCard
                  title="Product Sync"
                  href="/admin/square-sync"
                  description="Sync with Square catalog"
                />
              </div>
            </div>
          </div>

          {/* Administration */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 text-purple-600">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Administration</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    User management and system configuration
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DashboardCard title="Users" href="/admin/users" description="Manage user accounts" />
                <DashboardCard
                  title="Store Settings"
                  href="/admin/settings"
                  description="Configure store settings"
                />
                <DashboardCard
                  title="Shipping Config"
                  href="/admin/shipping"
                  description="Manage shipping calculations"
                />
              </div>
            </div>
          </div>
        </div>
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
