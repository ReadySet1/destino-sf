import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SyncDashboard } from '@/components/admin/sync/SyncDashboard';
import { logger } from '@/utils/logger';

export const metadata = {
  title: 'Product Sync | Admin',
  description: 'Manage product synchronization with Square',
};

export default async function AdminSyncPage() {
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

  try {
    // Verify database connection
    await prisma.$connect();

    // Get the profile with role checking
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    });

    if (!profile) {
      logger.warn('No profile found for user ID:', user.id);
      return redirect('/');
    }

    // Check for admin access
    if (profile.role !== 'ADMIN') {
      logger.warn("User doesn't have admin role");
      return redirect('/');
    }

    return (
      <div className="container mx-auto py-4 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Product Sync</h1>
            <p className="text-muted-foreground mt-2">
              Manage product synchronization with Square to keep your catalog up-to-date
            </p>
          </div>
        </div>

        {/* Sync Dashboard */}
        <SyncDashboard />

        {/* Information Section */}
        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-3">About Product Sync</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">What gets synced:</h4>
              <ul className="space-y-1">
                <li>• Product names and descriptions</li>
                <li>• Product prices and variants</li>
                <li>• Product images (when enabled)</li>
                <li>• Category assignments</li>
                <li>• Product ordering</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Sync options:</h4>
              <ul className="space-y-1">
                <li>
                  • <strong>Slow & Careful:</strong> 25 products per batch, safest option
                </li>
                <li>
                  • <strong>Normal Speed:</strong> 50 products per batch, balanced approach
                </li>
                <li>
                  • <strong>Fast:</strong> 100 products per batch, for large catalogs
                </li>
                <li>
                  • <strong>Image Updates:</strong> Refreshes product images from Square
                </li>
                <li>
                  • <strong>Rate Limit:</strong> Maximum 3 syncs per hour
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Products can only be edited in your Square Dashboard. Use this
              sync feature to pull the latest changes from Square to your website.
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    logger.error('Error in admin sync page:', error);
    return redirect('/');
  }
}
